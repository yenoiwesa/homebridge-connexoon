const { get, startCase } = require('lodash');
const { Command } = require('./execution');

class Device {
    constructor(json, overkiz) {
        this.json = json;
        this.overkiz = overkiz;
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

    async getCurrentExecution() {
        const currentExecs = await this.overkiz.getCurrentExecutions();

        for (const exec of currentExecs) {
            const {
                actionGroup: { actions },
            } = exec;
            const action = actions.find(
                (action) => action.deviceURL === this.id
            );

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
        const action = actions.find((action) => action.deviceURL === this.id);

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
                (command) =>
                    command.deviceURL === this.id && command.state !== 'FAILED'
            );

            if (command) {
                return command.command;
            }
        }

        return null;
    }

    async executeCommand(command) {
        return this.overkiz.executeCommands(
            `${this.name} - ${startCase(command)} - HomeKit`,
            this.id,
            [new Command(command)]
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
}

module.exports = Device;
