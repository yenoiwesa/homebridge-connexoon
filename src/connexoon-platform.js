const OverkizAPI = require('./api/overkiz-api');
const DeviceMapping = require('./device-mapping');

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
        // retrieve accessories defined in overkiz
        try {
            const apiDevices = await this.overkiz.listDevices();

            for (const apiDevice of apiDevices) {
                const deviceType = apiDevice.widget;

                // unsupported device types are skipped
                if (deviceType in DeviceMapping) {
                    const deviceClass = DeviceMapping[deviceType];

                    const device = new deviceClass({
                        homebridge,
                        log: this.log,
                        device: apiDevice,
                        overkiz: this.overkiz,
                    });

                    this.platformAccessories.push(device.accessory);
                } else {
                    this.log.debug(`Ignored device of type ${deviceType}`);
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
