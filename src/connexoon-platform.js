const { get } = require('lodash');
const serviceFactory = require('./service-factory');
const overkizAPIFactory = require('./api/overkiz-api-factory');
const Accessory = require('./accessory');

const eventsControllerFactory = require('./api/events/events-controller-factory');

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
        this.eventsController = eventsControllerFactory(log, this.overkiz);
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

        await this.eventsController.start();
    }

    _registerDevice(device) {
        const config = get(this.config, ['devices', device.name]);
        let service = serviceFactory({homebridge, log: this.log, eventsController: this.eventsController, device, config});

        if (!service) {
            this.log.debug(`Ignored device of type ${device.type}`);
            return;
        }

        const accessory = new Accessory({
            homebridge,
            log: this.log,
            device,
        });

        accessory.addService(service.getHomekitService());
        this.platformAccessories.push(accessory.homekitAccessory);
    }
}

module.exports = { PLUGIN_NAME, PLATFORM_NAME, ConnexoonPlatformFactory };
