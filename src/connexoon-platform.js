const { get } = require('lodash');
const OverkizAPI = require('./api/overkiz-api');
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

        this.overkiz = new OverkizAPI(config, log);
    }

    /**
     * Called by Homebridge at platform init to list accessories.
     */
    async accessories(callback) {
        // retrieve devices defined in overkiz
        try {
            const devices = await this.overkiz.listDevices();

            for (const device of devices) {
                // unsupported device types are skipped
                if (device.type in ServicesMapping) {
                    const accessory = new Accessory({
                        homebridge,
                        log: this.log,
                        device,
                    });

                    const serviceClasses = ServicesMapping[device.type];

                    // retrieve accessory config
                    const config = get(this.config, ['devices', device.name]);

                    for (const serviceClass of serviceClasses) {
                        const service = new serviceClass({
                            homebridge,
                            log: this.log,
                            device,
                            config,
                        });

                        accessory.addService(service.getHomekitService());
                    }

                    this.platformAccessories.push(accessory.homekitAccessory);
                } else {
                    this.log.debug(`Ignored device of type ${device.type}`);
                }
            }
            this.log.debug(`Found ${this.platformAccessories.length} devices`);
        } catch (error) {
            // do nothing in case of error
            this.log.error(error);
        } finally {
            callback(this.platformAccessories);
        }
    }
}

module.exports = { PLUGIN_NAME, PLATFORM_NAME, ConnexoonPlatformFactory };
