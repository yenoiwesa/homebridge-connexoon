const { get, isNumber, remove } = require('lodash');
const OverkizAPI = require('./api/overkiz-api');
const Accessory = require('./accessories/accessory');
const ServicesMapping = require('./services-mapping');

const PLUGIN_NAME = 'homebridge-connexoon';
const PLATFORM_NAME = 'Connexoon';
const DEVICES_CONFIG = 'devices';
const MINUTE = 60 * 1000;
const INIT_RETRY_INTERVAL = 1; // minutes
const POLLING_INTERVAL_CONFIG = 'pollingInterval';
const POLLING_INTERVAL_DEFAULT = 10; // minutes
const USE_LISTED_DEVICES_ONLY_CONFIG = 'useListedDevicesOnly';
const USE_LISTED_DEVICES_ONLY_DEFAULT = false;

class ConnexoonPlatform {
    constructor(log, config = {}, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.accessories = [];

        this.log(`${PLATFORM_NAME} Init`);

        this.overkiz = new OverkizAPI(config, log);

        /**
         * Platforms should wait until the "didFinishLaunching" event has fired before
         * registering any new accessories.
         */
        api.on('didFinishLaunching', () => this.initAccessories());
    }

    /**
     * Homebridge will call the "configureAccessory" method once for every cached
     * accessory restored
     */
    configureAccessory(homekitAccessory) {
        this.log.info(
            `Restoring cached accessory ${homekitAccessory.displayName}`
        );
        try {
            this.accessories.push(this.createAccessory(homekitAccessory));
        } catch (error) {
            this.log.error(
                `Failed to restore cached accessory ${homekitAccessory.displayName}`,
                error
            );
        }
    }

    async initAccessories() {
        try {
            const newAccessories = [];

            const devices = await this.getDevices();

            for (const device of devices) {
                // find the existing accessory if one was restored from cache
                let accessory = this.accessories.find(
                    (accessory) => accessory.context.device.id === device.id
                );

                // if none found, create a new one
                if (!accessory) {
                    const uuid = this.api.hap.uuid.generate(device.id);
                    const homekitAccessory = new this.api.platformAccessory(
                        device.name,
                        uuid
                    );
                    homekitAccessory.context.device = device.toContext();
                    accessory = this.createAccessory(homekitAccessory);
                    this.accessories.push(accessory);
                    newAccessories.push(accessory);
                }

                accessory.assignDevice(device);
            }

            // register new accessories
            if (newAccessories.length) {
                this.api.registerPlatformAccessories(
                    PLUGIN_NAME,
                    PLATFORM_NAME,
                    newAccessories.map((accessory) =>
                        accessory.getHomekitAccessory()
                    )
                );
            }

            // unregister accessories with no device assigned
            const orphanAccessories = remove(
                this.accessories,
                (accessory) => !accessory.device
            );
            if (orphanAccessories.length) {
                this.log.debug(
                    `Unregistering ${orphanAccessories.length} orphan accessories`
                );
                this.api.unregisterPlatformAccessories(
                    PLUGIN_NAME,
                    PLATFORM_NAME,
                    orphanAccessories.map((accessory) =>
                        accessory.getHomekitAccessory()
                    )
                );
            }

            this.initPolling();
        } catch (error) {
            this.log.error(
                `Could not initialise platform, will retry in ${INIT_RETRY_INTERVAL} min`,
                error
            );
            setTimeout(
                () => this.initAccessories(),
                INIT_RETRY_INTERVAL * MINUTE
            );
        }
    }

    createAccessory(homekitAccessory) {
        // retrieve accessory config
        const config = get(
            this.devicesConfig,
            homekitAccessory.context.device.name
        );

        return new Accessory({
            api: this.api,
            log: this.log,
            homekitAccessory,
            config,
        });
    }

    async getDevices() {
        const devices = [];

        try {
            const allDevices = await this.overkiz.listDevices();
            const useListedDevicesOnly = get(
                this.config,
                USE_LISTED_DEVICES_ONLY_CONFIG,
                USE_LISTED_DEVICES_ONLY_DEFAULT
            );

            for (const device of allDevices) {
                if (
                    useListedDevicesOnly &&
                    !(device.name in this.devicesConfig)
                ) {
                    this.log.info(
                        `Ignored ${device.name} as it is not listed in devices`
                    );
                    continue;
                }

                // unsupported device types are skipped
                if (device.type in ServicesMapping) {
                    devices.push(device);
                } else {
                    this.log.debug(`Ignored device of type ${device.type}`);
                }
            }
            this.log.debug(`Found ${devices.length} devices`);
        } catch (error) {
            // do nothing in case of error
            this.log.error(error);
        }

        return devices;
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
            this.poll(pollingInterval * MINUTE);
        } else {
            this.log.info(`Polling for Connexoon accessory state disabled`);
        }
    }

    poll(interval) {
        setInterval(() => {
            this.log.debug(`Polling for Connexoon accessory state`);
            for (const accessory of this.accessories) {
                accessory.updateState();
            }
        }, interval);
    }

    get devicesConfig() {
        return get(this.config, DEVICES_CONFIG, {});
    }
}

module.exports = { PLATFORM_NAME, ConnexoonPlatform };
