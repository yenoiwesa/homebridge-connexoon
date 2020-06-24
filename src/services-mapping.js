const WindowCovering = require('./services/window-covering');

module.exports = {
    // maps API device UI Class to a list of services
    Awning: [WindowCovering],
    Curtain: [WindowCovering],
    ExteriorScreen: [WindowCovering],
    ExteriorVenetianBlind: [WindowCovering],
    Generic: [WindowCovering],
    Pergola: [WindowCovering],
    RollerShutter: [WindowCovering],
    Screen: [WindowCovering],
    SwingingShutter: [WindowCovering],
    VenetianBlind: [WindowCovering],
};
