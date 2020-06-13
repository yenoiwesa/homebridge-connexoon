const AccessoryInformation = require('../services/accessory-information');

class Accessory {
    constructor({ homebridge, log, device }) {
        this.device = device;
        this.log = log;
        this.services = [];

        const UUIDGen = homebridge.hap.uuid;

        this.accessory = {
            name: this.name,
            displayName: this.name,
            uuid_base: UUIDGen.generate(this.device.id),
            services: [],
            getServices: () => this.getHomekitServices(),
        };

        this.addService(
            new AccessoryInformation({
                homebridge,
                log,
                device,
            })
        );

        this.log.debug(`Found ${this.constructor.name} ${this.name}`);
    }

    addService(service) {
        this.services.push(service);
    }

    getHomekitAccessory() {
        return this.accessory;
    }

    getHomekitServices() {
        return this.services.map((service) => service.getHomekitService());
    }

    get name() {
        return this.device.name;
    }

    async updateState() {
        for (const service of this.getServices()) {
            service.updateState();
        }
    }
}

module.exports = Accessory;
