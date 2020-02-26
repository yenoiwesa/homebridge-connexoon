
class Event {
    constructor( log, type, timestamp, deviceURL ) {
        this.timestamp = timestamp;
        this.type = type;
        this.id = deviceURL;
        this.log = log;
    }
}

module.exports = Event;