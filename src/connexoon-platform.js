const { get, isNumber } = require('lodash');
const OverkizAPI = require('./api/overkiz-api');
const Accessory = require('./accessories/accessory');
const ServicesMapping = require('./services-mapping');

let homebridge;

const PLUGIN_NAME = 'homebridge-connexoon';
const PLATFORM_NAME = 'Connexoon';
const POLLING_INTERVAL_CONFIG = 'pollingInterval';
const POLLING_INTERVAL_DEFAULT = 10; // minutes

const ConnexoonPlatformFactory = (homebridgeInstance) => {
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

                    for (const ServiceClass of serviceClasses) {
                        const service = new ServiceClass({
                            homebridge,
                            log: this.log,
                            device,
                            config,
                        });

                        accessory.addService(service);
                    }

                    this.platformAccessories.push(accessory);
                } else {
                    this.log.debug(`Ignored device of type ${device.type}`);
                }
            }
            this.log.debug(`Found ${this.platformAccessories.length} devices`);

            this.initPolling();
        } catch (error) {
            // do nothing in case of error
            this.log.error(error);
        } finally {
            callback(
                this.platformAccessories.map((accessory) =>
                    accessory.getHomekitAccessory()
                )
            );
        }
    }

    initPolling() {
        const pollingInterval = Math.max(
            get(this.config, POLLING_INTERVAL_CONFIG, POLLING_INTERVAL_DEFAULT),
            0
        );

        if (pollingInterval && isNumber(pollingInterval)) {
            this.log.info(
                `Starting polling for Connexoon accessory state every ${pollingInterval} minute(s)`
            );

            // start polling
            this.poll(pollingInterval * 60 * 1000);
        } else {
            this.log.info(`Polling for Connexoon accessory state disabled`);
        }
    }

    poll(interval) {
        setInterval(() => {
            this.log.debug(`Polling for Connexoon accessory state`);
            for (const accessory of this.platformAccessories) {
                accessory.updateState();
            }
        }, interval);
    }
}

module.exports = { PLUGIN_NAME, PLATFORM_NAME, ConnexoonPlatformFactory };
