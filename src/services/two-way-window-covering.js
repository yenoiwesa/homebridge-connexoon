const AbstractService = require('./abstract-service');

let Service;
let Characteristic;

const Command = {
    CLOSURE_AND_ORIENTATION: 'setClosureAndOrientation',
    CLOSURE: 'setClosure',
    ORIENTATION: 'setOrientation'
};

const POLL_TIMEOUT = 60 * 1000;
const POLL_FREQUENCY = 5 * 1000;

class TwoWayWindowCovering extends AbstractService {

    constructor({ homebridge, log, device, config }) {
        super({ homebridge, log, device, config });

        this.pollingTimeout = null;
        this.pollingMaxTimeout = null;
        this.isPollingActive = false;
        this.nextTargetPosition = -1;

        if (!device.isTwoWay) {
            throw new Error('Wrong Service for a one way window covering device');
        } 

        // Service and Characteristic are from hap-nodejs
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;

        this.hapService = this._createHAPService();
        this._mixinHAPServiceCharacteristics();
    }

    _createHAPService() {
        return new Service.WindowCovering(this.name);
    }

    _mixinHAPServiceCharacteristics() {
        this.targetPosition = this.hapService.getCharacteristic(Characteristic.TargetPosition);
        this.targetPosition
            .on('get', this.getTargetPosition.bind(this))
            .on('set', this.setTargetPosition.bind(this));

        this.currentPosition = this.hapService.getCharacteristic(Characteristic.CurrentPosition);
        this.currentPosition.on('get', this.getPositionCallback.bind(this));

        // set default value
        this.positionState = this.hapService.getCharacteristic(Characteristic.PositionState);
        this.positionState.updateValue(Characteristic.PositionState.STOPPED);

        if (this.device.hasCommand(Command.ORIENTATION)) {
            this.currentAngle = this.hapService.addCharacteristic(Characteristic.CurrentHorizontalTiltAngle);
            this.targetTiltAngle = this.hapService.addCharacteristic(Characteristic.TargetHorizontalTiltAngle);
            this.targetTiltAngle.on('set', this.setTiltAngle.bind(this));
            this.targetTiltAngle.on('get', this.getTiltAngle.bind(this));
        }
    }

    getHomekitService() {
        return this.hapService;
    }

    async getPosition() {
        try {
            let state = await this.device.currentStates();
            return state.position;
        } catch (e) {
            this.log.error(`Error for ${this.name}: ${e}`);
            throw new Error(`Failed to retrieve position object for ${this.name}`);
        }
    }

    async getPositionCallback(callback) {
        try {
            let current = await this.getPosition();

            this.log.debug(`Current position for ${this.name} is ${current}`);
            callback(null, current);
        } catch (error) {
            callback(error);
        }
    }

    async getTargetPosition(callback) {
        try {
            let target;

            if (this.nextTargetPosition != -1) {
                target = this.nextTargetPosition;
            } else {
                // fallback if next target is unknown.
                target = await this.getPosition();
            }

            this.log.debug(`Target position for ${this.name} is ${target}`);
            callback(null, target);
        } catch (error) {
            callback(error);
        }
    }

    async setTargetPosition(value, callback) {
        callback();

        this.log(`Set position to ${value} for ${this.name}`);
        this.nextTargetPosition = value;

        try {
            await this.device.cancelCurrentExecutionByCommand(Command.CLOSURE);
            this.startPollingForCurrentPosition(POLL_FREQUENCY, POLL_TIMEOUT);
            await this.device.executeCommand(Command.CLOSURE, [100 - value]);
        } catch (error) {
            this.log.error('Failed to execute command');
        }
    }

    startPollingForCurrentPosition(frequency, maxPollingTimeout) {
        if (this.isPollingActive) {
            this.log.debug(`Polling already active for ${this.name}, skipping`);
            return;
        }

        this.log.debug(`Start polling for ${this.name}`);
        this.clearPollingTimeout();

        this.isPollingActive = true;

        this.pollCurrentPosition(frequency);
        this.registerMaxPollingTimeout(maxPollingTimeout);
    }


    clearPollingTimeout() {
        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout);
            this.pollingTimeout = null;
        }
        if (this.pollingMaxTimeout) {
            clearTimeout(this.pollingMaxTimeout);
            this.pollingMaxTimeout = null;
        }
    }

    async pollCurrentPosition(frequency) {
        try {
            let position = await this.getPosition();
            this.currentPosition.updateValue(position);
            this.updatePositionState(this.nextTargetPosition);
            this.log.debug(`Updated position for ${this.name} is ${position}`);
        } catch (e) {
            // retry until the max polling timeout occurs
            this.log.error(`Failed to retrieve position for ${this.name}.`);
        }

        if (this.isStopped()) {
            this.log.debug(`Command for ${this.name} done`);
            await this.resetExistingPoll();
        } else if (this.isPollingActive) {
            this.pollingTimeout = setTimeout(this.pollCurrentPosition.bind(this, frequency), frequency);
        }
    }

    async resetExistingPoll() {
        try {
            let position = await this.getPosition();
            this.currentPosition.updateValue(position);
            this.targetPosition.updateValue(position);
        } catch(e) {
            this.log.error(`Failed to retrieve position for ${this.name}.`);
        }

        this.isPollingActive = false;

        this.clearPollingTimeout();
    }

    registerMaxPollingTimeout(timeout) {
        this.pollingMaxTimeout = setTimeout(this.resetExistingPoll.bind(this), timeout);
    }

    updatePositionState(target) {
        const position = this.currentPosition.value;

        let state;

        // Motor are not precise enough to fully rely on the blind position vs the target postion.
        // If position is within 2% of the target value, call it STOPPED.
        let diff = target - position;
        if (Math.abs(diff) <= 2) {
            state = Characteristic.PositionState.STOPPED;
        } else if (position > target) {
            state = Characteristic.PositionState.DECREASING;
        } else if (position < target) {
            state = Characteristic.PositionState.INCREASING;
        }

        this.positionState.updateValue(state);
    }

    isStopped() {
        return this.positionState.value == Characteristic.PositionState.STOPPED;
    }

    async setTiltAngle(value, callback) {
        callback();

        try {
            await this.device.cancelCurrentExecutionByCommand(Command.ORIENTATION);
            await this.device.executeCommand(Command.ORIENTATION, [this.toSomfy(value)]);
            this.currentAngle.updateValue(value);
        } catch (error) {
            this.log.error(`Failed to execute orientation for ${this.device.name}`);
        }
    }

    async getTiltAngle(callback) {
        try {
            let state = await this.device.currentStates();
            let tilt = this.fromSomfy(state.slateOrientation);
            this.currentAngle.updateValue(tilt); 
            callback(null, tilt);
        } catch (e) {
            this.log.error(`Error for ${this.name}: ${e}`);
            throw new Error(`Failed to retrieve orientation object for ${this.name}`);
        }
    }

    fromSomfy(value) {
        return Math.round((value * 1.8) - 90);
    }

    toSomfy(value) {
        return Math.round((value + 90) / 1.8);
    }
}

module.exports = TwoWayWindowCovering;
