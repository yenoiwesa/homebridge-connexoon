class DeviceStates {

    constructor(states) {
        this.states = states || [];
    }

    get position() {
        let position = this.getStateValue("core:ClosureState");
        if (position == undefined) {
            // for awning and velux
            position = this.getStateValue("core:DeploymentState");
        }

        return position != undefined ? 100 - position : position;
    }

    get hasPositionState() {
        return this.hasState("core:ClosureState") || this.hasState('core:DeploymentState');
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

    hasState(name) {
        let state = this.states.find(obj => obj.name == name);
        return !!state;
    }

    get length() {
        return this.states.length;
    }
}

module.exports = DeviceStates;