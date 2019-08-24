class Accessory {
    constructor({ homebridge, log, device }) {
        this.device = device;
        this.log = log;

        const UUIDGen = homebridge.hap.uuid;
        const Service = homebridge.hap.Service;
        const Characteristic = homebridge.hap.Characteristic;

        const informationService = new Service.AccessoryInformation();
        informationService.setCharacteristic(
            Characteristic.Manufacturer,
            this.device.manufacturer
        );
        informationService.setCharacteristic(
            Characteristic.Model,
            this.device.model
        );
        informationService.setCharacteristic(
            Characteristic.SerialNumber,
            this.device.id
        );

        this.homekitAccessory = {
            name: this.name,
            displayName: this.name,
            uuid_base: UUIDGen.generate(this.device.id),
            services: [informationService],
            getServices: () => this.homekitAccessory.services,
        };

        this.log.debug(`Found ${this.constructor.name} ${this.name}`);
    }

    addService(service) {
        this.homekitAccessory.services.push(service);
        return service;
    }

    get name() {
        return this.device.name;
    }
}

module.exports = Accessory;
