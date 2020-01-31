const OneWayWindowCovering = require('./services/one-way-window-covering');
const TwoWayWindowCovering = require('./services/two-way-window-covering');
const Awning = require('./services/awning');

const ONE_WAY = {
    Screen: OneWayWindowCovering,
    RollerShutter: OneWayWindowCovering,
    Awning: OneWayWindowCovering
};

const TWO_WAY = {
    Screen: TwoWayWindowCovering,
    RollerShutter: TwoWayWindowCovering,
    Awning: TwoWayWindowCovering
};

function serviceFactory({homebridge, log, device, config}) {
    let serviceClass = (device.isTwoWay ? TWO_WAY[device.type] : ONE_WAY[device.type]);

    if (serviceClass) {
        return new theClass({ homebridge, log, device, config });
    }
}

module.exports = serviceFactory;
