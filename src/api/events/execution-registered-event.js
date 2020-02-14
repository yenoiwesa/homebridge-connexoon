
const Event = require('./event');
const EventType = require('./event-type');

class ExecutionRegisteredEvent extends Event {
    constructor(log, timestamp, execId, deviceURL, command) {
        super( log, EventType.ExecutionRegisteredEventType, timestamp, deviceURL );

        this.execId = execId;
        this.command = command;
    }

    get targetPosition() {
        if (!this.isAffectingPosition) {
            return 0;
        }

        return this.command.parameters[0].value;
    }

    get isAffectingPosition() {
        let cmd = this.command.name;

        return ['setClosureAndOrientation', 'setPosition', 'setClosure'].includes(cmd);
    }
}

module.exports = ExecutionRegisteredEvent;