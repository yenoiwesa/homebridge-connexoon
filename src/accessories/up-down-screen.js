const { cachePromise } = require('../utils');
const AbstractDevice = require('./abstract-accessory');

let Service;
let Characteristic;

const State = {
    CLOSED: 0,
    OPEN: 100,
};

const Commands = {
    OPEN: 'open',
    CLOSE: 'close',
    UP: 'up',
    DOWN: 'down',
    MY: 'my',
};

const commandToPosition = command => {
    if (!command) {
        return State.CLOSED;
    }

    switch (command) {
        case Commands.OPEN:
        case Commands.UP:
        case Commands.MY:
            return State.OPEN;
        case Commands.CLOSE:
        case Commands.DOWN:
        default:
            return State.CLOSED;
    }
};

const targetToCommand = target => {
    if (target === State.OPEN) {
        return Commands.MY;
    } else if (target === State.CLOSED) {
        return Commands.CLOSE;
    }

    // ignore values that are half open
    return null;
};

class UpDownScreen extends AbstractDevice {
    constructor({ homebridge, log, device }) {
        super({ homebridge, log, device });

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
            .on('get', this.getTargetPosition.bind(this))
            .on('set', this.setPosition.bind(this));

        this.currentPosition.on('get', this.getCurrentPosition.bind(this));

        // set default value
        this.positionState.updateValue(Characteristic.PositionState.STOPPED);

        this.addService(service);

        // refresh values
        this.targetPosition.getValue();
    }

    async getTargetPosition(callback) {
        try {
            const { target } = await this.getPositions();

            this.log.debug(`Target position for ${this.name} is ${target}`);
            callback(null, target);
        } catch (error) {
            this.log.error(error);
            callback(error);
        }
    }

    async getCurrentPosition(callback) {
        try {
            const { current } = await this.getPositions();

            this.log.debug(`Current position for ${this.name} is ${current}`);
            callback(null, current);
        } catch (error) {
            this.log.error(error);
            callback(error);
        }
    }

    async doGetPositions() {
        const lastCommand = await this.device.getLastCommand();
        const position = commandToPosition(lastCommand);

        return { current: position, target: position };
    }

    async setPosition(value, callback) {
        const command = targetToCommand(value);

        this.log(
            `Set position to ${value} for ${this.name} with command ${command}`
        );

        if (command == null) {
            this.currentPosition.updateValue(value);
            callback();
            return;
        }

        this.updatePositionState(value);

        try {
            await this.device.cancelCurrentExecution();

            await this.device.executeCommand(command);

            setTimeout(() => {
                this.currentPosition.updateValue(value);
                this.updatePositionState(value);
            }, 6000);

            callback();
        } catch (error) {
            this.log.error('Failed to execute command', error);
            callback(error);
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
}

module.exports = UpDownScreen;
