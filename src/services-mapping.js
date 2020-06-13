const WindowCovering = require('./services/window-covering-2');

module.exports = {
    // maps API device UI Class to a list of services
    Screen: [WindowCovering],
    RollerShutter: [WindowCovering],
};
