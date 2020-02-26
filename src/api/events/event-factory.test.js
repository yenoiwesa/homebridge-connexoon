const EventFactory = require('./event-factory');
const EventType = require('./event-type');

describe('EventsController', () => {
    let mockConsole;
    let eventFactory;

    beforeEach(() => {
        createMockConsole();
        eventFactory = new EventFactory(mockConsole);
    });

    test('When an execution state changed event arrives, it is correctly converted', () => {
        let eventJson = {
            "timestamp": 1581116121345,
            "setupOID": "setup OID",
            "execId": "exec ID",
            "newState": "NOT_TRANSMITTED",
            "ownerKey": "key",
            "type": 1,
            "subType": 1,
            "oldState": "INITIALIZED",
            "timeToNextState": 0,
            "name": "ExecutionStateChangedEvent"
        };

        let events = eventFactory.createEvents(eventJson, ['id1']);
        expect(events).not.toBe(null);
        expect(events[0].type).toBe(EventType.ExecutionStateChangedEventType);
        expect(events[0].id).toBe('id1');
        expect(events[0].execId).toBe('exec ID');
        expect(events[0].timestamp).toBe(1581116121345);
        expect(events[0].newState).toBe('NOT_TRANSMITTED');
        expect(events[0].oldState).toBe('INITIALIZED');
    });

    test('When an execution state changed event arrives with multiple devices, an event is created by device', () => {
        let eventJson = {
            "timestamp": 1581116121345,
            "setupOID": "setup OID",
            "execId": "exec ID",
            "newState": "NOT_TRANSMITTED",
            "ownerKey": "key",
            "type": 1,
            "subType": 1,
            "oldState": "INITIALIZED",
            "timeToNextState": 0,
            "name": "ExecutionStateChangedEvent"
        };

        let events = eventFactory.createEvents(eventJson, ['id1', 'id2', 'id3']);
        expect(events).not.toBe(null);
        expect(events.length).toBe(3);
        expect(events[0].type).toBe(EventType.ExecutionStateChangedEventType);
        expect(events[0].id).toBe('id1');
        expect(events[1].type).toBe(EventType.ExecutionStateChangedEventType);
        expect(events[1].id).toBe('id2');
        expect(events[2].type).toBe(EventType.ExecutionStateChangedEventType);
        expect(events[2].id).toBe('id3');
    });

    test('When a device state changed event arrives, it is correctly converted', () => {
        let eventJson = {
            "timestamp": 1581116159451,
            "setupOID": "setup OID",
            "deviceURL": "id1",
            "deviceStates": [
              {
                "name": "core:RSSILevelState",
                "type": 2,
                "value": "84.0"
              },
              {
                "name": "core:SlateOrientationState",
                "type": 1,
                "value": "100"
              }
            ],
            "name": "DeviceStateChangedEvent"
        };

        let events = eventFactory.createEvents(eventJson, ['id1']);
        expect(events).not.toBe(null);
        expect(events.length).toBe(1);
        expect(events[0].type).toBe(EventType.DeviceStateChangedEventType);
        expect(events[0].id).toBe('id1');
        expect(events[0].timestamp).toBe(1581116159451);
        expect(events[0].deviceStates.length).toBe(2);
        expect(events[0].deviceStates.getStateValue('core:RSSILevelState')).toBe('84.0');
        expect(events[0].deviceStates.getStateValue('core:SlateOrientationState')).toBe('100');
    });

    test('When a new registration execution event arrives, it is correctly converted', () => {
        let eventJson = {
            "timestamp": 1581116121345,
            "setupOID": "setup OID",
            "execId": "exec ID",
            "label": "a label",
            "metadata": "",
            "type": 1,
            "subType": 1,
            "triggerId": "",
            "actions": [
                {
                    "deviceURL": "id1",
                    "commands": [
                        { "name": "setClosureAndOrientation", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] }
                    ]
                }
            ],
            "name": "ExecutionRegisteredEvent"
        };

        let events = eventFactory.createEvents(eventJson, ['id1']);
        expect(events).not.toBe(null);
        expect(events[0].type).toBe(EventType.ExecutionRegisteredEventType);
        expect(events[0].id).toBe('id1');
        expect(events[0].execId).toBe('exec ID');
        expect(events[0].timestamp).toBe(1581116121345);
        expect(events[0].command).toBeTruthy();
        expect(events[0].command.name).toBe('setClosureAndOrientation');
        expect(events[0].command.parameters.length).toBe(2);
        expect(events[0].command.parameters[0].value).toBe('39');
        expect(events[0].command.parameters[1].value).toBe('100');
    });

    test('When a new registration execution event arrives with multiple commands, it is correctly converted', () => {
        let eventJson = {
            "timestamp": 1581116121345,
            "setupOID": "setup OID",
            "execId": "exec ID",
            "label": "a label",
            "metadata": "",
            "type": 1,
            "subType": 1,
            "triggerId": "",
            "actions": [
                {
                    "deviceURL": "id1",
                    "commands": [
                        { "name": "command1", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] },
                        { "name": "command2", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] },
                        { "name": "command3", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] }
                    ]
                }
            ],
            "name": "ExecutionRegisteredEvent"
        };

        let events = eventFactory.createEvents(eventJson, ['id1']);
        expect(events).not.toBe(null);
        expect(events.length).toBe(3);
        expect(events[0].command.name).toBe('command1');
        expect(events[1].command.name).toBe('command2');
        expect(events[2].command.name).toBe('command3');
    });

    test('When a new registration execution event arrives with multiple actions, it is correctly converted', () => {
        let eventJson = {
            "timestamp": 1581116121345,
            "setupOID": "setup OID",
            "execId": "exec ID",
            "label": "a label",
            "metadata": "",
            "type": 1,
            "subType": 1,
            "triggerId": "",
            "actions": [
                {
                    "deviceURL": "id1",
                    "commands": [
                        { "name": "command1", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] },
                        { "name": "command2", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] },
                        { "name": "command3", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] }
                    ]
                },
                {
                    "deviceURL": "id2",
                    "commands": [
                        { "name": "command4", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] },
                        { "name": "command5", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] },
                        { "name": "command6", "parameters": [ { "type": 1, "value": "39" }, { "type": 1, "value": "100" } ] }
                    ]
                }
            ],
            "name": "ExecutionRegisteredEvent"
        };

        let events = eventFactory.createEvents(eventJson, ['id1']);
        expect(events).not.toBe(null);
        expect(events.length).toBe(6);
        expect(events[0].id).toBe('id1');
        expect(events[0].command.name).toBe('command1');
        expect(events[1].id).toBe('id1');
        expect(events[1].command.name).toBe('command2');
        expect(events[2].id).toBe('id1');
        expect(events[2].command.name).toBe('command3');
        expect(events[3].id).toBe('id2');
        expect(events[3].command.name).toBe('command4');
        expect(events[4].id).toBe('id2');
        expect(events[4].command.name).toBe('command5');
        expect(events[5].id).toBe('id2');
        expect(events[5].command.name).toBe('command6');
    });

    function createMockConsole() {
        mockConsole = jest.fn();
        mockConsole.debug = jest.fn();
        mockConsole.error = jest.fn();
        mockConsole.log = jest.fn();
        mockConsole.warn = jest.fn();
    }
});