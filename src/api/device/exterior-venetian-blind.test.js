const ExteriorVenetianBlind = require('./exterior-venetian-blind');

describe('ExteriorVenetianBlind', () => {

    test('ExteriorVenetianBlind uses "setClosureAndOrientation" to change position', async () => {
        let mockAPI = jest.mock();
        mockAPI.executeCommands = jest.fn();
        let target = new ExteriorVenetianBlind({deviceURL: 'id', states: []}, mockAPI);
        await target.setPosition(12);
        expect(mockAPI.executeCommands).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            [{name: "setClosureAndOrientation", parameters: [88, 0], type: 1}]
        );
    });

    test('ExteriorVenetianBlind returns homekit position', async () => {
        let mockAPI = jest.mock();
        let target = new ExteriorVenetianBlind({states: [
            {name: 'core:ClosureState', value: 0},
            {name: 'core:SlateOrientationState', value: 0}
        ]}, mockAPI);
        expect(target.getPosition()).toBe(100);
        expect(target.getSlateOrientation()).toBe(-90);
    });

    test('Convert from Somfy to Homekit', () => {
        let mockAPI = jest.mock();
        let target = new ExteriorVenetianBlind({states: []}, mockAPI);
        expect(target.fromSomfyOrientation(0)).toBe(-90);
        expect(target.fromSomfyOrientation(100)).toBe(90);
        expect(target.fromSomfyOrientation(50)).toBe(0);
    });

    test('Convert from Homekit to Somfy', () => {
        let mockAPI = jest.mock();
        let target = new ExteriorVenetianBlind({states: []}, mockAPI);
        expect(target.toSomfyOrientation(-90)).toBe(0);
        expect(target.toSomfyOrientation(0)).toBe(50);
        expect(target.toSomfyOrientation(90)).toBe(100);
    });


});