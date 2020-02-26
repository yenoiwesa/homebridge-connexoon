class Command {
    constructor(name, parameters = []) {
        this.type = 1;
        this.name = name;
        this.parameters = parameters;
    }
}

module.exports = Command;
