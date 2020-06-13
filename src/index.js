const {
    PLUGIN_NAME,
    PLATFORM_NAME,
    ConnexoonPlatformFactory,
} = require('./connexoon-platform');

module.exports = (homebridge) => {
    // For platform plugin to be considered as dynamic platform plugin,
    // dynamic must be true. This is not our case.
    homebridge.registerPlatform(
        PLUGIN_NAME,
        PLATFORM_NAME,
        ConnexoonPlatformFactory(homebridge),
        false
    );
};
