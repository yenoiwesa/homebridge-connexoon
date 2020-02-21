const RTSWindowCovering = require('./services/rts-window-covering');
const IOWindowCovering = require('./services/io-window-covering');

const RTS = {
    Screen: RTSWindowCovering,
    RollerShutter: RTSWindowCovering,
    // Awning: RTSWindowCovering // TODO: Fix awning open state
};

const IO = {
    Screen: IOWindowCovering,
    RollerShutter: IOWindowCovering,
    //Awning: IOWindowCovering, // TODO: Fix awning open state
    ExteriorVenetianBlind: IOWindowCovering
};

function serviceFactory({homebridge, log, eventsController, device, config}) {
    let serviceClass = (device.supportsIOProtocol ? IO[device.type] : RTS[device.type]);

    if (serviceClass) {
        return new serviceClass({ homebridge, eventsController, log, device, config });
    }
}

module.exports = serviceFactory;
