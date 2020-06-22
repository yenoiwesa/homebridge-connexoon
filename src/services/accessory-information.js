const Service = require('./service');

let Characteristic;

class AccessoryInformation extends Service {
    constructor({ homebridge, log, device }) {
        super({
            log,
            service: new homebridge.hap.Service.AccessoryInformation(),
        });

        Characteristic = homebridge.hap.Characteristic;

        this.service.setCharacteristic(
            Characteristic.Manufacturer,
            device.manufacturer
        );
        this.service.setCharacteristic(Characteristic.Model, device.model);
        this.service.setCharacteristic(Characteristic.SerialNumber, device.id);
    }
}

module.exports = AccessoryInformation;
