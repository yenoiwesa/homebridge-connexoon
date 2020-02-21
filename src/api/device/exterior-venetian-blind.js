const Device = require("./device");

const CLOSURE_AND_ORIENTATION = 'setClosureAndOrientation';
const POSITION_STATE = 'core:ClosureState';
const ORIENTATION_STATE = 'core:SlateOrientationState';

class ExteriorVenetianBlind extends Device {
    constructor(json, overkiz) {
        super(json, overkiz)
    }

    async setPosition(value) {
        await this.setPositionAndSlateOrientation(value, this.getSlateOrientation());
    }

    getPosition() {
        let position = this.currentStates.getStateValue(POSITION_STATE);
        return this.toggleDevicePosition(position);
    }

    resetPosition(value) {
        this.currentStates.setStateValue(POSITION_STATE, this.toggleDevicePosition(value));
    }

    toggleDevicePosition(value) {
        return 100 - value;
    }

    async setSlateOrientation(value) {
        await this.setPositionAndSlateOrientation(this.getPosition(), value);
    }

    resetSlateOrientation(value) {
        this.currentStates.setStateValue(ORIENTATION_STATE, this.toSomfyOrientation(value));
    }

    getSlateOrientation() {
        let orientation = this.currentStates.getStateValue("core:SlateOrientationState");
        if (orientation == null) {
            orientation = 0;
        }
        return this.fromSomfyOrientation(orientation);
    }

    fromSomfyOrientation(value) {
        return Math.round((value * 1.8) - 90);
    }

    toSomfyOrientation(value) {
        return Math.round((value + 90) / 1.8);
    }

    async setPositionAndSlateOrientation(position, orientation) {
        await this.executeCommand(CLOSURE_AND_ORIENTATION, [
            this.toggleDevicePosition(position),
            this.toSomfyOrientation(orientation)
        ]);
    }
}

module.exports = ExteriorVenetianBlind;