const { get } = require('lodash');
const { cachePromise } = require('../utils');
const AbstractService = require('./abstract-service');

let Service;
let Characteristic;

const Position = {
    CLOSED: 0,
    OPEN: 100,
};

const Command = {
    OPEN: 'open',
    CLOSE: 'close',
    UP: 'up',
    DOWN: 'down',
    MY: 'my',
};

const DEFAULT_COMMANDS = [
    { command: Command.OPEN, position: Position.OPEN },
    { command: Command.MY, position: 50 },
    { command: Command.CLOSE, position: Position.CLOSED },
];

class WindowCovering extends AbstractService {
    constructor({ homebridge, log, device, config }) {
        super({ homebridge, log, device, config });

        // Service and Characteristic are from hap-nodejs
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;

        this.getPositions = cachePromise(
            this.doGetPositions.bind(this),
            2 * 1000
        ).exec;

        // appending the default commands to the overridden one so that
        // the overridden command take precedence during evaluation
        this.commands = get(this.config, 'commands', []).concat(
            DEFAULT_COMMANDS
        );
    }

    getHomekitService() {
        // Window Covering Service
        const service = new Service.WindowCovering(this.name);

        this.currentPosition = service.getCharacteristic(
            Characteristic.CurrentPosition
        );
        this.targetPosition = service.getCharacteristic(
            Characteristic.TargetPosition
        );
        this.positionState = service.getCharacteristic(
            Characteristic.PositionState
        );

        this.targetPosition
            .on('get', this.getTargetPosition.bind(this))
            .on('set', this.setPosition.bind(this));

        this.currentPosition.on('get', this.getCurrentPosition.bind(this));

        // set default value
        this.positionState.updateValue(Characteristic.PositionState.STOPPED);

        return service;
    }

    async getTargetPosition(callback) {
        try {
            const { target } = await this.getPositions();

            this.log.debug(`Target position for ${this.name} is ${target}`);
            callback(null, target);
        } catch (error) {
            callback(error);
        }
    }

    async getCurrentPosition(callback) {
        try {
            const { current } = await this.getPositions();

            this.log.debug(`Current position for ${this.name} is ${current}`);
            callback(null, current);
        } catch (error) {
            callback(error);
        }
    }

    async doGetPositions() {
        const lastCommand = await this.device.getLastCommand();
        const position = this.commandToPosition(lastCommand);

        return { current: position, target: position };
    }

    async setPosition(value, callback) {
        const command = this.targetToCommand(value);

        this.log(
            `Set position to ${value} for ${this.name} with command ${command}`
        );

        if (command == null) {
            this.currentPosition.updateValue(value);
            callback();
            return;
        }

        this.updatePositionState(value);

        // return early for Siri to acknowledge asap
        // even though the command might fail later
        callback();

        try {
            await this.device.cancelCurrentExecution();

            await this.device.executeCommand(command);

            // set the final requested position after 6s
            setTimeout(() => {
                this.currentPosition.updateValue(value);
                this.updatePositionState(value);
            }, 6 * 1000);
        } catch (error) {
            this.log.error('Failed to execute command');
        }
    }

    updatePositionState(target) {
        const position = this.currentPosition.value;

        let positionState;
        if (position > target) {
            positionState = Characteristic.PositionState.DECREASING;
        } else if (position < target) {
            positionState = Characteristic.PositionState.INCREASING;
        } else {
            positionState = Characteristic.PositionState.STOPPED;
        }

        this.positionState.updateValue(positionState);
    }

    commandToPosition(command) {
        // map UP and DOWN commands to OPEN and CLOSE
        switch (command) {
            case Command.UP:
                command = Command.OPEN;
                break;
            case Command.DOWN:
                command = Command.CLOSE;
                break;
        }

        const configItem = this.commands.find(
            (item) => item.command === command
        );
        return get(configItem, 'position', Position.CLOSED);
    }

    targetToCommand(target) {
        // there is no default command, simply ignore values
        // that are not mapped (won't send anything)
        return get(
            this.commands.find((item) => item.position === target),
            'command'
        );
    }
}

module.exports = WindowCovering;
