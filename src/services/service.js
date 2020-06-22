class Service {
    constructor({ log, service, device }) {
        this.log = log;
        this.service = service;
        this.device = device;
    }

    updateState() {
        // to be implemented in children classes
    }

    getHomekitService() {
        return this.service;
    }

    getCharacteristic(characteristic) {
        return this.service.getCharacteristic(characteristic);
    }

    async getHomekitState(state, getStateFn, callback) {
        this.log.debug(`Get ${this.device.name} ${state}`);

        try {
            const value = await getStateFn();

            this.log.info(`Get ${this.device.name} ${state} success: ${value}`);
            callback(null, value);
        } catch (error) {
            this.log.error(
                `Could not fetch ${this.device.name} ${state}`,
                error
            );

            callback(error);
        }
    }

    async setHomekitState(state, value, setStateFn, callback) {
        this.log.debug(`Set ${this.device.name} ${state} with value: ${value}`);

        try {
            await setStateFn(value);

            this.log.info(`Set ${this.device.name} ${state} success: ${value}`);
            callback();
        } catch (error) {
            this.log.error(`Could not set ${this.device.name} ${state}`, error);

            callback(error);
        }
    }
}

module.exports = Service;
