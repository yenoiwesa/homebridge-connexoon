const Event = require('./event');
const EventType = require('./event-type');

const States = {
    INITIALIZED: "INITIALIZED",
    NOT_TRANSMITTED: "NOT_TRANSMITTED",
    TRANSMITTED: "TRANSMITTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    CMDCANCELLED: "CMDCANCELLED"
}

class ExecutionStateChangedEvent extends Event {
    constructor(log, timestamp, execId, deviceURL, oldState, newState) {
        super( log, EventType.ExecutionStateChangedEventType, timestamp, deviceURL );

        this.execId = execId;
        this.oldState = oldState;
        this.newState = newState;
    }

    get hasStartedOrQueued() {
        return this.newState == States.INITIALIZED ||
            this.newState == States.NOT_TRANSMITTED || 
            this.newState == States.TRANSMITTED ||
            this.newState == States.IN_PROGRESS;
    }

    get hasStopped() {
        return this.newState == States.COMPLETED ||
            this.newState == States.FAILED ||
            this.newState == States.CMDCANCELLED; 
    }
}

module.exports = ExecutionStateChangedEvent;