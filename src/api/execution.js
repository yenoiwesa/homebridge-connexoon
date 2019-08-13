class Command {
    constructor(name, parameters = []) {
        this.type = 1;
        this.name = name;
        this.parameters = parameters;
    }
}

class Execution {
    constructor(label, deviceURL, commands) {
        this.label = label;
        this.actions = [
            {
                deviceURL: deviceURL,
                commands: commands,
            },
        ];
    }
}

module.exports = { Execution, Command };
