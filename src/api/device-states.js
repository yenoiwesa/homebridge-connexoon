class DeviceStates {

    constructor(states) {
        this.states = states || [];
    }

    get position() {
        let position = this.getStateValue("core:ClosureState");

        return position != undefined ? 100 - position : position;
    }

    get slateOrientation() {
        return this.getStateValue("core:SlateOrientationState");
    }

    get openClosed() {
        return this.getStateValue("core:OpenClosedState");
    }

    getStateValue(name) {
        let state = this.states.find(obj => obj.name == name);
        return state ? state.value : undefined;
    }
}

module.exports = DeviceStates;