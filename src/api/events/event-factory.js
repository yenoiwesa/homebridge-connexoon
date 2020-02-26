
const DeviceStateChangedEvent = require('./device-state-changed-event');
const ExecutionRegisteredEvent = require('./execution-registered-event');
const ExecutionStateChangedEvent = require('./execution-state-changed-event');
const DeviceStates = require('../device/device-states');
const Command = require('../command');

class EventFactory {
    constructor(log) {
        this.log = log;
    }

    createEvents(jsonEvent, deviceURLs) {
        if (jsonEvent == null || !jsonEvent.name) {
            this.log.warn(`JSON event is invalid: ${jsonEvent}.`)    
            return null;
        }

        let events;
        switch(jsonEvent.name) {
            case 'DeviceStateChangedEvent':
                events = this.createDeviceStateChangedEvent(jsonEvent);
                break;
            case 'ExecutionRegisteredEvent':
                events = this.createExecutionRegisteredEvent(jsonEvent);
                break;
            case 'ExecutionStateChangedEvent':
                events = this.createExecutionStateChangedEvent(jsonEvent, deviceURLs);
                break;
            default:
                this.log.debug(`Ignore event ${jsonEvent.name}`);
                events = [];
        }
        return events;
    }

    createDeviceStateChangedEvent(jsonEvent) {
        let states = new DeviceStates(jsonEvent.deviceStates || []);
        return [new DeviceStateChangedEvent(
            this.log,
            jsonEvent.timestamp,
            jsonEvent.deviceURL,
            states
        )];
    }

    createExecutionRegisteredEvent(jsonEvent) {
        if (jsonEvent.actions == null || jsonEvent.actions.length == 0) {
            this.log.warn(`Can't create event for ${jsonEvent.name}. List of actions is unavailable.`);
            return [];
        }

        return jsonEvent.actions
            .map((action) => this.createExecutionRegisteredEventFromAction(jsonEvent, action))
            .reduce((prev, curr) => prev.concat(curr));
    }

    createExecutionRegisteredEventFromAction(jsonEvent, action) {
        if (action.commands == null || action.commands.length == 0) {
            this.log.warn(`Can't create event for ${jsonEvent.name}. List of commands is unavailable.`);
            return [];
        }

        return action.commands.map((command) => new ExecutionRegisteredEvent(
            this.log,
            jsonEvent.timestamp,
            jsonEvent.execId,
            action.deviceURL,
            new Command(command.name, command.parameters)
        ));
    }

    createExecutionStateChangedEvent(jsonEvent, deviceURLs) {
        if (deviceURLs == null || deviceURLs.length == 0) {
            this.log.warn(`Can't create event for ${jsonEvent.name}. List of devices is unavailable.`);
            return [];
        }

        return deviceURLs.map((id) => new ExecutionStateChangedEvent(
            this.log,
            jsonEvent.timestamp,
            jsonEvent.execId,
            id,
            jsonEvent.oldState,
            jsonEvent.newState));
    }
}

module.exports = EventFactory;