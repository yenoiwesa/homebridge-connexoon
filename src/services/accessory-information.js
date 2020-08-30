const Service = require('./service');

let Characteristic;

class AccessoryInformation extends Service {
    constructor({ api, log, accessory }) {
        super({
            log,
            accessory,
            serviceType: api.hap.Service.AccessoryInformation,
        });

        Characteristic = api.hap.Characteristic;

        this.service.setCharacteristic(
            Characteristic.Manufacturer,
            accessory.context.device.manufacturer
        );
        this.service.setCharacteristic(
            Characteristic.Model,
            accessory.context.device.model
        );
        this.service.setCharacteristic(
            Characteristic.SerialNumber,
            accessory.context.device.id
        );
    }
}

module.exports = AccessoryInformation;
