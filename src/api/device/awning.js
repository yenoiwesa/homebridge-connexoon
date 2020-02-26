const Device = require("./device");

const CLOSURE = 'setDeployment';
const STATE = 'core:DeploymentState';

class Awning extends Device {
    constructor(json, overkiz) {
        super(json, overkiz)
        this.isRevert = true;
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
        if (value == 100) {
            value = 99;
        } else if (value == 0) {
            value = 1;
        }
        
        return value;
    }

}

module.exports = Awning;