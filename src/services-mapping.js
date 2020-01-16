const WindowCovering = require('./services/window-covering');
const Awning = require('./services/awning');

module.exports = {
    // maps API device UI Class to a list of services
    Screen: [WindowCovering],
    RollerShutter: [WindowCovering],
    Awning: [WindowCovering]
};
