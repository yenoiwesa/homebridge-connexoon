const http = require('http');
const {
    PLUGIN_NAME,
    PLATFORM_NAME,
    ConnexoonPlatformFactory,
} = require('./connexoon-platform');

module.exports = function(homebridge) {
    // For platform plugin to be considered as dynamic platform plugin,
    // dynamic must be true. This is not our case.
    homebridge.registerPlatform(
        PLUGIN_NAME,
        PLATFORM_NAME,
        ConnexoonPlatformFactory(homebridge),
        false
    );
};

// TODO delete below
let Accessory;
let Service;
let Characteristic;
let UUIDGen;

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function SamplePlatform(log, config, api) {
    log('SamplePlatform Init');
    let platform = this;
    this.log = log;
    this.config = config;
    this.accessories = [];

    this.requestServer = http.createServer(
        function(request, response) {
            if (request.url === '/add') {
                this.addAccessory(new Date().toISOString());
                response.writeHead(204);
                response.end();
            }

            if (request.url == '/reachability') {
                this.updateAccessoriesReachability();
                response.writeHead(204);
                response.end();
            }

            if (request.url == '/remove') {
                this.removeAccessory();
                response.writeHead(204);
                response.end();
            }
        }.bind(this)
    );

    this.requestServer.listen(18081, function() {
        platform.log('Server Listening...');
    });

    if (api) {
        // Save the API object as plugin needs to register new accessory via this object
        this.api = api;

        // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
        // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
        // Or start discover new accessories.
        this.api.on(
            'didFinishLaunching',
            function() {
                platform.log('DidFinishLaunching');
            }.bind(this)
        );
    }
}

// Sample function to show how developer can add accessory dynamically from outside event
SamplePlatform.prototype.addAccessory = function(accessoryName) {
    this.log('Add Accessory');
    let platform = this;
    let uuid;

    uuid = UUIDGen.generate(accessoryName);

    let newAccessory = new Accessory(accessoryName, uuid);
    newAccessory.on('identify', function(paired, callback) {
        platform.log(newAccessory.displayName, 'Identify!!!');
        callback();
    });
    // Plugin can save context on accessory to help restore accessory in configureAccessory()
    // newAccessory.context.something = "Something"

    // Make sure you provided a name for service, otherwise it may not visible in some HomeKit apps
    newAccessory
        .addService(Service.Lightbulb, 'Test Light')
        .getCharacteristic(Characteristic.On)
        .on('set', function(value, callback) {
            platform.log(newAccessory.displayName, 'Light -> ' + value);
            callback();
        });

    this.accessories.push(newAccessory);
    this.api.registerPlatformAccessories(
        'homebridge-samplePlatform',
        'SamplePlatform',
        [newAccessory]
    );
};

SamplePlatform.prototype.updateAccessoriesReachability = function() {
    this.log('Update Reachability');
    for (let index in this.accessories) {
        let accessory = this.accessories[index];
        accessory.updateReachability(false);
    }
};

// Sample function to show how developer can remove accessory dynamically from outside event
SamplePlatform.prototype.removeAccessory = function() {
    this.log('Remove Accessory');
    this.api.unregisterPlatformAccessories(
        'homebridge-samplePlatform',
        'SamplePlatform',
        this.accessories
    );

    this.accessories = [];
};
