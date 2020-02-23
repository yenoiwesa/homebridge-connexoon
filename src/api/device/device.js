const { get, startCase } = require('lodash');
const Command = require('../command');
const DeviceStates = require('./device-states');

class Device {
    constructor(json, overkiz) {
        this.json = json;
        this.overkiz = overkiz;
        this.isRevert = false;

        if (json.states) {
            this.currentStates = new DeviceStates(json.states);
        }
    }

    get id() {
        return this.json.deviceURL;
    }

    get type() {
        return this.json.uiClass;
    }

    get name() {
        return this.json.label;
    }

    get manufacturer() {
        return 'Somfy';
    }

    get model() {
        return this.json.widget;
    }

    get supportsIOProtocol() {
        return !!(this.json.controllableName && this.json.controllableName.startsWith('io:'));
    }
    
    hasCommand(command) {
        if (!this.json.definition || !this.json.definition.commands) {
            return false;
        }
        const list = this.json.definition.commands;
        return !!(list.find((item) => item.commandName == command));
    }


    async getCurrentExecution() {
        const currentExecs = await this.overkiz.getCurrentExecutions();

        for (const exec of currentExecs) {
            const {
                actionGroup: { actions },
            } = exec;
            const action = actions.find(action => action.deviceURL === this.id);

            if (action) {
                return exec;
            }
        }

        return null;
    }

    async getCurrentCommand() {
        const currentExec = await this.getCurrentExecution();

        if (!currentExec) {
            return null;
        }

        const {
            actionGroup: { actions },
        } = currentExec;
        const action = actions.find(action => action.deviceURL === this.id);

        return get(action, ['commands', 0, 'name']);
    }

    async getLastCommand() {
        const [currentCommand, passedExecs] = await Promise.all([
            this.getCurrentCommand(),
            this.overkiz.getExecutionsHistory(),
        ]);

        if (currentCommand) {
            return currentCommand;
        }

        for (const { commands } of passedExecs) {
            const command = commands.find(
                command =>
                    command.deviceURL === this.id && command.state !== 'FAILED'
            );

            if (command) {
                return command.command;
            }
        }

        return null;
    }

    async executeCommand(command, params = []) {
        return this.overkiz.executeCommands(
            `${this.name} - ${startCase(command)} - HomeKit`,
            this.id,
            [new Command(command, params)]
        );
    }

    async cancelExecution(exec) {
        return this.overkiz.cancelExecution(exec.id);
    }

    async cancelCurrentExecution() {
        try {
            const currentExec = await this.getCurrentExecution();

            if (currentExec) {
                return await this.cancelExecution(currentExec);
            }
        } catch (error) {
            // ignore
        }
    }

    resetPosition(value) {
        // noop
    }

    mergeStates(states) {
        return this.currentStates.mergeStates(states);
    }

    async refreshCurrentStates() {
        const states = await this.overkiz.currentStates(this.id);

        this.currentStates = new DeviceStates(states);
        return this.currentStates;
    }
}

module.exports = Device;
