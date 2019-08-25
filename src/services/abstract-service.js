class AbstractService {
    constructor({ log, device, config }) {
        this.device = device;
        this.log = log;
        this.config = config;

        this.log.debug(
            `Found service ${this.constructor.name} for ${this.name}`
        );
    }

    get name() {
        return this.device.name;
    }

    getHomekitService() {
        throw 'Must be implemented';
    }
}

module.exports = AbstractService;
