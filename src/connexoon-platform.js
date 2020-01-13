const { get } = require('lodash');
const overkizAPIFactory = require('./api/overkiz-api-factory');
const Accessory = require('./accessory');
const ServicesMapping = require('./services-mapping');

let homebridge;

const PLUGIN_NAME = 'homebridge-connexoon';
const PLATFORM_NAME = 'Connexoon';

const ConnexoonPlatformFactory = homebridgeInstance => {
    homebridge = homebridgeInstance;

    return ConnexoonPlatform;
};

class ConnexoonPlatform {
    constructor(log, config = {}, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.platformAccessories = [];

        this.log(`${PLATFORM_NAME} Init`);

        this.overkiz = overkizAPIFactory(config, log);
    }

    /**
     * Called by Homebridge at platform init to list accessories.
     */
    async accessories(callback) {
        try {
            const devices = await this.overkiz.listDevices();

            for (const device of devices) {
                this._registerDevice(device);
            }

            this.log.debug(`Found ${this.platformAccessories.length} devices`);
        } catch (error) {
            // do nothing in case of error
            this.log.error(error);
        } finally {
            callback(this.platformAccessories);
        }
    }

    _registerDevice(device) {
        if (!(device.type in ServicesMapping)) {
            this.log.debug(`Ignored device of type ${device.type}`);
            return;
        }

        const accessory = new Accessory({
            homebridge,
            log: this.log,
            device,
        });

        // retrieve accessory config
        const config = get(this.config, ['devices', device.name]);
        this._registerServices(accessory, device, config);

        this.platformAccessories.push(accessory.homekitAccessory);
    }

    _registerServices(accessory, device, config) {
        const serviceClasses = ServicesMapping[device.type];
        for (const serviceClass of serviceClasses) {
            const service = new serviceClass({
                homebridge,
                log: this.log,
                device,
                config,
            });

            accessory.addService(service.getHomekitService());
        }
    }
}

module.exports = { PLUGIN_NAME, PLATFORM_NAME, ConnexoonPlatformFactory };
