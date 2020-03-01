const ExecutionRegisteredEvent = require('./execution-registered-event');

describe('ExecutionRegisteredEvent', () => {
    let mockConsole;

    beforeEach(() => {
        createMockConsole();
    });

    test('Get target returns the target in SMOFY referential', async () => {
        let command = {
            name: "setClosureAndOrientation",
            parameters: [ { type: 1, value: "39" }, { type: 1, value: "100" } ]
        };
        let target = new ExecutionRegisteredEvent(mockConsole, 123, 'execId', 'deviceURL', command);
        
        expect(target.targetPosition).toBe(39);
    });

    function createMockConsole() {
        mockConsole = jest.fn();
        mockConsole.debug = jest.fn();
        mockConsole.error = jest.fn();
        mockConsole.log = jest.fn();
        mockConsole.warn = jest.fn();
    }
});
