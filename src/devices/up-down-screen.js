const { get, startCase } = require('lodash');
const { cachePromise } = require('../utils');
const { Command } = require('../api/execution');
const AbstractDevice = require('./abstract-device');

let Service;
let Characteristic;

const State = {
    CLOSED: 0,
    OPEN: 100,
};

const Commands = {
    OPEN: 'open',
    CLOSE: 'close',
    MY: 'my',
};

class UpDownScreen extends AbstractDevice {
    constructor({ homebridge, log, device, overkiz }) {
        super({ homebridge, log, device, overkiz });

        // Service and Characteristic are from hap-nodejs
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;

        this.getPositions = cachePromise(
            this.doGetPositions.bind(this),
            2 * 1000
        ).exec;

        this.buildServices();
    }

    buildServices() {
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
            .on('get', callback => this.getTargetPosition(callback))
            .on('set', (value, callback) => this.setPosition(value, callback));

        this.currentPosition.on('get', callback =>
            this.getCurrentPosition(callback)
        );

        // set default value
        this.positionState.updateValue(Characteristic.PositionState.STOPPED);

        this.addService(service);

        // refresh values
        this.targetPosition.getValue();
    }

    async getTargetPosition(callback) {
        this.log(`get target position for ${this.name}`);

        try {
            const { target } = await this.getPositions();

            this.log.debug(`target position for ${this.name} is ${target}`);
            callback(null, target);
        } catch (error) {
            this.log.error(error);
            callback(error);
        }
    }

    async getCurrentPosition(callback) {
        this.log(`get current position for ${this.name}`);

        try {
            const { current } = await this.getPositions();

            this.log.debug(`current position for ${this.name} is ${current}`);
            callback(null, current);
        } catch (error) {
            this.log.error(error);
            callback(error);
        }
    }

    async doGetPositions() {
        const lastCommand = await this.getLastCommand();
        const position = this.commandToPosition(lastCommand);

        return { current: position, target: position };
    }

    async getLastCommand() {
        const [currentExecs, passedExecs] = await Promise.all([
            this.overkiz.getCurrentExecutions(),
            this.overkiz.getExecutionsHistory(),
        ]);

        let lastCommand;

        for (const {
            actionGroup: { actions },
        } of currentExecs) {
            const action = actions.find(action => action.deviceURL === this.id);
            lastCommand = get(action, ['commands', 0, 'name']);

            if (lastCommand) {
                return lastCommand;
            }
        }

        for (const { commands } of passedExecs) {
            const command = commands.find(
                command =>
                    command.deviceURL === this.id && command.state !== 'FAILED'
            );

            if (command) {
                return command.command;
            }
        }

        return null;
    }

    commandToPosition(command) {
        if (!command) {
            return State.CLOSED;
        }

        switch (command) {
            case Commands.OPEN:
            case Commands.MY:
                return State.OPEN;
            case Commands.CLOSE:
            default:
                return State.CLOSED;
        }
    }

    targetToCommand(target) {
        if (target === State.OPEN) {
            return Commands.MY;
        } else if (target === State.CLOSED) {
            return Commands.CLOSE;
        }

        // ignore values that are half open
        return null;
    }

    async setPosition(value, callback) {
        const command = this.targetToCommand(value);

        this.log(
            `set position to ${value} for ${this.name} with command ${command}`
        );

        if (command == null) {
            this.currentPosition.updateValue(value);
            callback();
            return;
        }

        try {
            await this.overkiz.executeCommands(
                `${this.name} - ${startCase(command)} - HomeKit`,
                this.id,
                [new Command(command)]
            );

            this.currentPosition.updateValue(value);
            callback();
        } catch (error) {
            this.log.error('Failed to execute command', error);
            callback(error);
        }
    }
}

module.exports = UpDownScreen;
