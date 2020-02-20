const Device = require("./device");
const DeviceStates = require("./device-states");

describe('Device', () => {

    test('device can detect statefulness IO', () => {
        let device = new Device({controllableName: 'io:ExteriorVenetianBlindIOComponent'}, {});
        expect(device.isTwoWay).toBeTruthy();
    });

    test('device handle cases where there is no qualified name', () => {
        let device = new Device({}, {});
        expect(device.isTwoWay).toBeFalsy();
    });

    test('device can detect statefulness RTS', () => {
        let device = new Device({controllableName: 'rts:ExteriorVenetianBlindRTSComponent'}, {});
        expect(device.isTwoWay).toBeFalsy();
    });

    test('device can get device states', async () => {
        let mockAPI = jest.mock();
        mockAPI.currentStates = jest.fn().mockResolvedValue([]);
        let device = new Device({deviceURL: 'URL'}, mockAPI);
        let states = await device.refreshCurrentStates();
        
        expect(mockAPI.currentStates).toHaveBeenCalledWith("URL");
        expect(states).toMatchObject(new DeviceStates());
    });
});