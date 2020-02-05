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

module.exports = Execution;
