const RollerShutter = require('./roller-shutter');
const Command = require('../command');

describe('RollerShutter', () => {

    test('RollerShutter uses "setClosure" to change position', async () => {
        let mockAPI = jest.mock();
        mockAPI.executeCommands = jest.fn();
        let target = new RollerShutter({deviceURL: 'id', states: []}, mockAPI);
        await target.setPosition(12);
        expect(mockAPI.executeCommands).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            [{name: "setClosure", parameters: [88], type: 1}]
        );
    });

    test('RollerShutter returns homekit position', async () => {
        let mockAPI = jest.mock();
        let target = new RollerShutter({states: [{name: 'core:ClosureState', value: 0}]}, mockAPI);
        expect(target.getPosition()).toBe(100);
    });

    test('Convert position', () => {
        let mockAPI = jest.mock();
        let target = new RollerShutter({states: []}, mockAPI)
        expect(target.convertPosition(23)).toBe(77);
    });

});