
const Event = require('./event');
const EventType = require('./event-type');

class DeviceStateChangedEvent extends Event {
    constructor(log, timestamp, deviceURL, deviceStates) {
        super( log, EventType.DeviceStateChangedEventType, timestamp, deviceURL );

        this.deviceStates = deviceStates;
    }
}

module.exports = DeviceStateChangedEvent;