const DeviceStates = require('./device-states');

describe('DeviceStates', () => {

    test('device states can detect slate orientation', () => {
        let state = new DeviceStates([{name: 'core:SlateOrientationState', value: 12}]);
        expect(state.slateOrientation).toBe(12);
    });

    test('device states doesn\'t have slate orientation', () => {
        let state = new DeviceStates([]);
        expect(state.slateOrientation).toBeUndefined();
    });
    
    test('device states can detect position', () => {
        let state = new DeviceStates([{name: 'core:ClosureState', value: 10}]);
        expect(state.position).toBe(90);
    });

    test('device states can detect position at 0 from Somfy', () => {
        let state = new DeviceStates([{name: 'core:ClosureState', value: 0}]);
        expect(state.position).toBe(100);
    });

    test('device states can detect position based on DeploymentState', () => {
        let state = new DeviceStates([{name: 'core:DeploymentState', value: 0}]);
        expect(state.position).toBe(100);
    });

    test('device states doesn\'t have position', () => {
        let state = new DeviceStates([]);
        expect(state.position).toBeUndefined();
    });

    test('device states can detect open / closed state', () => {
        let state = new DeviceStates([{name: 'core:OpenClosedState', value: 'open'}]);
        expect(state.openClosed).toBe('open');
    });

    test('device states can detect a given state when available', () => {
        let state = new DeviceStates([{name: 'core:OpenClosedState', value: 'open'}]);
        expect(state.hasState('core:OpenClosedState')).toBeTruthy();
    });

    test('device states can detect a given state when not available', () => {
        let state = new DeviceStates([]);
        expect(state.hasState('core:OpenClosedState')).toBeFalsy();
    });

    test('device states can detect when position state is available (closure state)', () => {
        let state = new DeviceStates([{name: 'core:ClosureState', value: 0}]);
        expect(state.hasPositionState).toBeTruthy();
    });

    test('device states can detect when position state is available', () => {
        let state = new DeviceStates([{name: 'core:DeploymentState', value: 0}]);
        expect(state.hasPositionState).toBeTruthy();
    });

    test('device states can detect when position state is not available', () => {
        let state = new DeviceStates([{name: 'core:Stuff', value: 0}]);
        expect(state.hasPositionState).toBeFalsy();
    });

    test('device states can change state value', () => {
        let state = new DeviceStates([{name: 'core:Stuff', value: 0}]);
        state.setStateValue('core:Stuff', 42);
        expect(state.getStateValue('core:Stuff')).toBe(42);
    });

    test('change state value is a noop when state doesn\'t exist', () => {
        let state = new DeviceStates([{name: 'core:Stuff', value: 0}]);
        state.setStateValue('Not there', 42);
        expect(state.getStateValue('Not there')).toBeUndefined();
    });

    test('device states can be merged with new states', () => {
        let state = new DeviceStates([{name: 'oldStuff', value: 0}]);
        let newState = new DeviceStates([{name: 'newStuff', value: 42}]);
        state.mergeStates(newState);
        expect(state.length).toBe(2);
        expect(state.getStateValue('oldStuff')).toBe(0);
        expect(state.getStateValue('newStuff')).toBe(42);
    });

    test('device states can be merged with existing states', () => {
        let state = new DeviceStates([{name: 'oldStuff', value: 0}]);
        let newState = new DeviceStates([{name: 'oldStuff', value: 42}]);
        state.mergeStates(newState);
        expect(state.length).toBe(1);
        expect(state.getStateValue('oldStuff')).toBe(42);
    });
});