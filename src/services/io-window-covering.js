const AbstractService = require('./abstract-service');
const EventType = require('../api/events/event-type');

let Service;
let Characteristic;

const MAX_TIMEOUT = 60 * 1000;

class IOWindowCovering extends AbstractService {

    constructor({ homebridge, log, eventsController, device, config }) {
        super({ homebridge, log, device, config });

        this.isCommandRunning = false;
        this.heartBeatTimeout = null;
        this.cachedTargetPosition = -1;

        if (!device.supportsIOProtocol) {
            throw new Error('Wrong Service for a one way window covering device');
        } 

        // Service and Characteristic are from hap-nodejs
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;
        this.PositionState = Characteristic.PositionState;

        this.hapService = this._createHAPService();
        this._mixinHAPServiceCharacteristics();

        eventsController.subscribe(device.id, this.onEvent.bind(this));
        this.log(`Creating window covering ${this.name}`);
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

        this.positionState = this.hapService.getCharacteristic(this.PositionState);
        this.positionState.updateValue(this.PositionState.STOPPED);

        if (this.device.setSlateOrientation) {
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

        let prevPosition = this.device.getPosition();
        this.device.mergeStates(event.deviceStates);
        let position = this.device.getPosition();
        this.inferTargetPositionOnSilenceExecution(position, prevPosition);
        this.updatePositionState(this.cachedTargetPosition);

        this.resetHeartBeat();
        this.log(`Updated position for ${this.name} is ${position}`);

        if (!this.isCommandRunning && this.hasStopped()) {
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
        this.cachedTargetPosition = closing ? 0 : 100;

        this.targetPosition.updateValue(this.cachedTargetPosition);
    }

    onExecutionRegistered(event) {
        if (!event.isAffectingPosition) {
            // only focus on commands that affects position
            return;
        }

        this.isCommandRunning = true;
        this.execId = event.execId;
        this.cachedTargetPosition = this.device.convertPosition(event.targetPosition);
        this.targetPosition.updateValue(this.cachedTargetPosition);
        this.updatePositionState(this.cachedTargetPosition);

        this.resetHeartBeat();
        
        this.log(`Command ${event.command.name} received: move ${this.name} to ${this.cachedTargetPosition}`);
    }

    onExecutionStateChanged(event) {
        let currentCommand = this.execId == null || this.execId == event.execId;
        if (currentCommand && event.hasStopped) {
            this.log(`Stopping move command for ${this.name}`);
            this.markAsStopped();
        }
    }

    getPosition() {
        return this.device.getPosition();
    }

    getPositionCallback(callback) {
        let current = this.getPosition();

        this.log(`Current position for ${this.name} is ${current}`);
        callback(null, current);
    }

    getTargetPosition(callback) {
        if (this.cachedTargetPosition == -1) {
            this.cachedTargetPosition = this.getPosition();
        }
        
        let target = this.cachedTargetPosition;
        this.log(`Target position for ${this.name} is ${target}`);

        callback(null, target);
    }

    async setTargetPosition(value, callback) {
        callback();

        this.log(`Set position to ${value} for ${this.name}`);
        this.cachedTargetPosition = value;
        this.updatePositionState(this.cachedTargetPosition);

        try {
            await this.device.setPosition(value);
        } catch (error) {
            this.log.error('Failed to execute command');
        }
    }

    async markAsStopped() {
        this.isCommandRunning = false;
        this.positionState.updateValue(this.PositionState.STOPPED);
        this.resetCurrentAndTargetPosition(this.cachedTargetPosition);
        this.clearHeartBeatTimeout();
    }

    resetCurrentAndTargetPosition(position) {
        this.device.resetPosition(position);
        this.cachedTargetPosition = position;
        this.targetPosition.updateValue(position);
        this.currentPosition.updateValue(position);
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
        let position = this.device.getPosition();
        let state;

        if (this.device.isRevert) {
            let tmp = position;
            position = target;
            target = tmp;
        }

        // Motor are not precise enough to fully rely on the blind position vs the target postion.
        // If position is within 1% of the target value, call it STOPPED.
        let diff = target - position;
        if (Math.abs(diff) <= 1) {
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
            await this.device.setPositionAndSlateOrientation(this.cachedTargetPosition, value);
            this.currentAngle.updateValue(value);
            this.device.resetSlateOrientation(value);
        } catch (error) {
            this.log.error(`Failed to execute orientation for ${this.device.name}`);
        }
    }

    getTiltAngle(callback) {
        let tilt = this.device.getSlateOrientation();
        callback(null, tilt);
    }
}

module.exports = IOWindowCovering;
