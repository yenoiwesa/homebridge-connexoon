const { PLATFORM_NAME, ConnexoonPlatform } = require('./connexoon-platform');

module.exports = (api) => {
    api.registerPlatform(PLATFORM_NAME, ConnexoonPlatform);
};
