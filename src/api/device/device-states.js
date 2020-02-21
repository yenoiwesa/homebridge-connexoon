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
        let state = this.getState(name);
        return state ? state.value : undefined;
    }

    setStateValue(name, value) {
        let state = this.getState(name);

        if (state) {
            state.value = value;
        }
    }

    hasState(name) {
        let state = this.getState(name);
        return !!state;
    }

    getState(name) {
        return this.states.find(obj => obj.name == name);
    }

    get length() {
        return this.states.length;
    }

    mergeStates(newStates) {
        if (!(newStates instanceof DeviceStates)) {
            throw new TypeError(`Parameter must be of type Array when it is ${typeof newStates}`);
        }

        newStates.states.forEach(state => {
            this.replaceOrAddState(state);
        });
        return this;
    }

    replaceOrAddState(newState) {
        let currentState = this.getState(newState.name);
        if (!currentState) {
            this.states.push(newState);
        } else {
            currentState.value = newState.value;
        }
    }
}

module.exports = DeviceStates;