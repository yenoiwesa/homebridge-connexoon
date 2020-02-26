const Device = require("./device");

const CLOSURE = 'setClosure';
const STATE = 'core:ClosureState';

class RollerShutter extends Device {
    constructor(json, overkiz) {
        super(json, overkiz)
    }

    async setPosition(value) {
        await this.executeCommand(CLOSURE, [this.convertPosition(value)]);
    }

    getPosition() {
        let position = this.currentStates.getStateValue(STATE);
        return this.convertPosition(position);
    }

    resetPosition(value) {
        this.currentStates.setStateValue(STATE, this.convertPosition(value));
    }

    convertPosition(value) {
        return 100 - value;
    }
}

module.exports = RollerShutter;