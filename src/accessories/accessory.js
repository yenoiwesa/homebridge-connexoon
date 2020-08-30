const ServicesMapping = require('../services-mapping');
const AccessoryInformation = require('../services/accessory-information');

class Accessory {
    constructor({ api, log, homekitAccessory, config }) {
        this.api = api;
        this.log = log;
        this.accessory = homekitAccessory;
        this.config = config;
        this.services = [];

        this.services.push(
            new AccessoryInformation({
                api,
                log,
                accessory: this,
            })
        );

        const serviceClasses = ServicesMapping[this.context.device.type];

        for (const ServiceClass of serviceClasses) {
            const service = new ServiceClass({
                api,
                log,
                accessory: this,
                config,
            });

            this.services.push(service);
        }

        this.log.debug(`Found ${this.constructor.name} ${this.name}`);
    }

    assignDevice(device) {
        this.device = device;

        // use the most up to date device in the accessory context
        this.context.device = device.toContext();
    }

    getHomekitAccessory() {
        return this.accessory;
    }

    get context() {
        return this.accessory.context;
    }

    get name() {
        return this.context.device.name;
    }

    async updateState() {
        for (const service of this.services) {
            service.updateState();
        }
    }
}

module.exports = Accessory;
