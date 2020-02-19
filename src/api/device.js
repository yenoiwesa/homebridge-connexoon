const { get, startCase } = require('lodash');
const Command = require('./command');
const DeviceStates = require('./device-states');

const States = {
    IN_PROGRESS: 'IN_PROGRESS'
}

class Device {
    constructor(json, overkiz) {
        this.json = json;
        this.overkiz = overkiz;

        if (json.definition && json.definition.states) {
            this.currentStates = new DeviceStates(json.definition.states);
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

    get isTwoWay() {
        return !!(this.json.controllableName && this.json.controllableName.startsWith('io:'));
    }
    
    get states() {
        return this.json.states ? new DeviceStates(this.json.states) : new DeviceStates([]);
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

    async getCurrentExecutionByCommand(command) {
        const currentExecs = await this.overkiz.getCurrentExecutions();

        for (const exec of currentExecs) {
            if (exec.state != States.IN_PROGRESS) {
                continue;
            }
            const { actionGroup: { actions } } = exec;
            const action = actions.find(
                action => {
                    if (action.deviceURL !== this.id) {
                        return false;
                    }
                  return !!(action.commands.find((item) => item.name == command));
                });

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

    async cancelCurrentExecutionByCommand(command) {
        try {
            const currentExec = await this.getCurrentExecutionByCommand(command);

            if (currentExec) {
                return await this.cancelExecution(currentExec);
            }
        } catch (error) {
            // ignore
        }
    }

    async refreshCurrentStates() {
        const states = await this.overkiz.currentStates(this.id);

        this.currentStates = new DeviceStates(states);
        return this.currentStates;
    }
}

module.exports = Device;
