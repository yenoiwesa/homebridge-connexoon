class AbstractDevice {
    constructor({ homebridge, log, device, overkiz }) {
        this.device = device;
        this.log = log;
        this.overkiz = overkiz;

        const UUIDGen = homebridge.hap.uuid;
        const Service = homebridge.hap.Service;
        const Characteristic = homebridge.hap.Characteristic;

        const informationService = new Service.AccessoryInformation();
        informationService.setCharacteristic(
            Characteristic.Manufacturer,
            this.manufacturer
        );
        informationService.setCharacteristic(Characteristic.Model, this.model);
        informationService.setCharacteristic(
            Characteristic.SerialNumber,
            this.id
        );

        this.accessory = {
            name: this.name,
            displayName: this.name,
            uuid_base: UUIDGen.generate(this.id),
            services: [informationService],
            getServices: () => this.accessory.services,
        };

        this.log.debug(`Found ${this.constructor.name} ${this.name}`);
    }

    addService(service) {
        this.accessory.services.push(service);
        return service;
    }

    get name() {
        return this.device.label;
    }

    get manufacturer() {
        return 'Somfy';
    }

    get model() {
        return this.device.definition.uiClass;
    }

    get id() {
        return this.device.deviceURL;
    }
}

module.exports = AbstractDevice;
