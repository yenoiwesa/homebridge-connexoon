const Device = require("./device");
const DeviceStates = require("./device-states");

describe('Device', () => {

    test('device can detect statefulness IO', () => {
        let device = new Device({qualifiedName: 'io:ExteriorVenetianBlindIOComponent'}, {});
        expect(device.isTwoWay).toBeTruthy();
    });

    test('device can detect statefulness RTS', () => {
        let device = new Device({qualifiedName: 'rts:ExteriorVenetianBlindRTSComponent'}, {});
        expect(device.isTwoWay).toBeFalsy();
    });

    test('device can get device states', async () => {
        let mockAPI = jest.mock();
        mockAPI.getCurrentStates = jest.fn().mockResolvedValue([]);
        let device = new Device({deviceURL: 'URL'}, mockAPI);
        let states = await device.currentStates();

        expect(mockAPI.getCurrentStates).toHaveBeenCalledWith("URL");
        expect(states).toMatchObject(new DeviceStates());
    });
});