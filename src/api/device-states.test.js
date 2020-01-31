const DeviceStates = require("./device-states");

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

    test('device states doesn\'t have position', () => {
        let state = new DeviceStates([]);
        expect(state.position).toBeUndefined();
    });

    test('device states can detect open / closed state', () => {
        let state = new DeviceStates([{name: 'core:OpenClosedState', value: "open"}]);
        expect(state.openClosed).toBe("open");
    });

});