const Awning = require('./awning');

describe('Awning', () => {

    test('Awning uses "setClosure" to change position', async () => {
        let mockAPI = jest.mock();
        mockAPI.executeCommands = jest.fn();
        let target = new Awning({deviceURL: 'id', states: []}, mockAPI);
        await target.setPosition(12);
        expect(mockAPI.executeCommands).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            [{name: "setDeployment", parameters: [12], type: 1}]
        );
    });

    test('Awning returns homekit position', async () => {
        let mockAPI = jest.mock();
        let target = new Awning({states: [{name: 'core:DeploymentState', value: 0}]}, mockAPI);
        expect(target.getPosition()).toBe(0);
    });

});