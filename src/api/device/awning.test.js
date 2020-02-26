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
        let target = new Awning({states: [{name: 'core:DeploymentState', value: 10}]}, mockAPI);
        expect(target.getPosition()).toBe(10);
    });
    
    test('Awning is cap at 99%', async () => {
        let mockAPI = jest.mock();
        let target = new Awning({states: [{name: 'core:DeploymentState', value: 100}]}, mockAPI);
        expect(target.getPosition()).toBe(99);
    });
    
    test('Awning is cap at 1%', async () => {
        let mockAPI = jest.mock();
        let target = new Awning({states: [{name: 'core:DeploymentState', value: 0}]}, mockAPI);
        expect(target.getPosition()).toBe(1);
    });

    test('Converting position is a noop for awing', () => {
        let mockAPI = jest.mock();
        let target = new Awning({states: [{name: 'core:DeploymentState', value: 0}]}, mockAPI);
        expect(target.convertPosition(23)).toBe(23);
    });

});