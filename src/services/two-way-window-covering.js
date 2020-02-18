const AbstractService = require('./abstract-service');
const EventType = require('./../api/events/event-type');

let Service;
let Characteristic;

const Command = {
    CLOSURE_AND_ORIENTATION: 'setClosureAndOrientation',
    CLOSURE: 'setClosure',
    ORIENTATION: 'setOrientation'
};

const MAX_TIMEOUT = 60 * 1000;

class TwoWayWindowCovering extends AbstractService {

    constructor({ homebridge, log, eventsController, device, config }) {
        super({ homebridge, log, device, config });

        this.pollingTimeout = null;
        this.heartBeatTimeout = null;
        this.nextTargetPosition = -1;
        this.isCommandRunning = false;

        if (!device.isTwoWay) {
            throw new Error('Wrong Service for a one way window covering device');
        } 

        // Service and Characteristic are from hap-nodejs
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;
        this.PositionState = Characteristic.PositionState;

        this.hapService = this._createHAPService();
        this._mixinHAPServiceCharacteristics();

        eventsController.subscribe(device.id, this.onEvent.bind(this));
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
        this.positionState = this.hapService.getCharacteristic(this.PositionState);
        this.positionState.updateValue(this.PositionState.STOPPED);

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

    onEvent(event) {
        switch(event.type) {
            case EventType.DeviceStateChangedEventType:
                this.onDeviceStateChagned(event);
                break;
            case EventType.ExecutionRegisteredEventType:
                this.onExecutionRegistered(event);
                break;
            case EventType.ExecutionStateChangedEventType:
                this.onExecutionStateChanged(event);
                break;
            default:
                this.log.error(`Event ${event.name} of type ${event.type} is unknonw`);
        }
    }

    onDeviceStateChagned(event) {
        if (!event.deviceStates.hasPositionState) {
            // only care about position state at the moment
            return;
        }

        let prevPosition = this.currentPosition.value;
        let position = event.deviceStates.position;
        this.currentPosition.updateValue(position);
        this.inferTargetPositionOnSilenceExecution(position, prevPosition);
        this.updatePositionState(this.nextTargetPosition);

        this.resetHeartBeat();
        this.log.debug(`Updated position for ${this.name} is ${position}`);

        if (this.hasStopped()) {
            this.markAsStopped();
        }
    }

    /**
     * When a remote control is used, the TaHoma will not generate an execution registration event
     * but simply provide device state changed event.
     * This method will infer any hidden commands and return a plausible target position. 
     */
    inferTargetPositionOnSilenceExecution(position, prevPosition) {
        if (this.isCommandRunning || position == prevPosition) {
            return;
        }

        let closing = prevPosition - position > 0;

        this.nextTargetPosition = closing ? 0 : 100;

        this.targetPosition.updateValue(this.nextTargetPosition);
    }

    onExecutionRegistered(event) {
        if (!event.isAffectingPosition) {
            // only focus on commands that affects position
            return;
        }

        this.isCommandRunning = true;
        this.execId = event.execId;
        this.nextTargetPosition = event.targetPosition;
        this.targetPosition.updateValue(this.nextTargetPosition);
        this.updatePositionState(this.nextTargetPosition);

        this.resetHeartBeat();
        
        this.log(`Command ${event.command.name} received: move ${this.name} to ${this.nextTargetPosition}`);
    }

    onExecutionStateChanged(event) {
        let currentCommand = this.execId == null || this.execId == event.execId;
        if (currentCommand && event.hasStopped && !this.hasStopped()) {
            this.log(`Stopping move command for ${this.name}`);
            this.markAsStopped();
        }
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
                this.nextTargetPosition = target;
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
        this.updatePositionState(this.nextTargetPosition);

        try {
            await this.device.executeCommand(Command.CLOSURE, [100 - value]);
        } catch (error) {
            this.log.error('Failed to execute command');
        }
    }

    async markAsStopped() {
        this.isCommandRunning = false;
        this.positionState.updateValue(this.PositionState.STOPPED);
        this.resetCurrentAndTargetPosition(this.currentPosition.value);
        this.clearHeartBeatTimeout();
    }

    resetCurrentAndTargetPosition(position) {
        this.currentPosition.updateValue(position);
        this.targetPosition.updateValue(position);
    }

    clearHeartBeatTimeout() {
        if (this.heartBeatTimeout) {
            clearTimeout(this.heartBeatTimeout);
            this.heartBeatTimeout = null;
        }
    }

    resetHeartBeat() {
        if (this.heartBeatTimeout) {
            clearTimeout(this.heartBeatTimeout);
        }
        this.heartBeatTimeout = setTimeout(this.markAsStopped.bind(this), MAX_TIMEOUT);
    }

    updatePositionState(target) {
        const position = this.currentPosition.value;

        let state;

        // Motor are not precise enough to fully rely on the blind position vs the target postion.
        // If position is within 2% of the target value, call it STOPPED.
        let diff = target - position;
        if (Math.abs(diff) <= 2) {
            state = this.PositionState.STOPPED;
        } else if (position > target) {
            state = this.PositionState.DECREASING;
        } else if (position < target) {
            state = this.PositionState.INCREASING;
        }

        this.positionState.updateValue(state);
    }

    hasStopped() {
        return this.positionState.value == this.PositionState.STOPPED;
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
            this.log.error(`Failed to retrieve orientation object for ${this.name}. ${e.message}`);
            callback(e);
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
