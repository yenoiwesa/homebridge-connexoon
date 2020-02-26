const DEVICE_CLASSES = {
    Screen: require('./roller-shutter'),
    RollerShutter: require('./roller-shutter'),
    Awning: require('./awning'),
    ExteriorVenetianBlind: require('./exterior-venetian-blind'),
    Default: require('./roller-shutter')
};

function deviceFactory(json, overkiz) {
    let deviceClass = DEVICE_CLASSES[json.uiClass] || DEVICE_CLASSES.Default;

    if (deviceClass) {
        return new deviceClass(json, overkiz);
    }
}

module.exports = deviceFactory;