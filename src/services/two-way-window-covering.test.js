const WindowCovering = require('./two-way-window-covering');
const DeviceState = require('../api/device-states');
const Command = require('../api/command');
const DeviceStateChangedEvent = require('../api/events/device-state-changed-event');
const ExecutionRegisteredEvent = require('../api/events/execution-registered-event');
const ExecutionStateChangedEvent = require('../api/events/execution-state-changed-event');

describe('window-covering', () => {
    let mockDevice;
    let mockHomebridge;
    let mockConsole;
    let mockConfig;
    let mockHAPWindowCovering;
    let mockEventsController;
    let target;

    const PositionState = {
        DECREASING: 'DECREASING',
        INCREASING: 'INCREASING',
        STOPPED: 'STOPPED'
    };

    beforeEach(() => {
        createHomebridgeMock();
        createMockConsole();
        createMockDevice();
        createMockHAPWindowCovering();
        createMockEventsController();

        WindowCovering.prototype._createHAPService = jest.fn().mockReturnValue(mockHAPWindowCovering);
        target = new WindowCovering(
            {log: mockConsole, eventsController: mockEventsController, homebridge: mockHomebridge, device: mockDevice, config: mockConfig});
        
        target.positionState.updateValue.mockClear();
    });

    test('initialization of the window covering service', () => {
        expect(target.device).toBe(mockDevice);
    });

    test('Initialization of HAP device', () => {
        expect(target.getHomekitService()).toBe(mockHAPWindowCovering);
    });


    test('getTargetPosition when not known next target', (done) => {
        target.getPosition = jest.fn().mockResolvedValue(57);

        target.getTargetPosition(function(error, target) {
            expect(target).toBe(57);
            done();
        });
    });

    test('getTargetPosition when there is a known next target', (done) => {
        target.nextTargetPosition = 57;

        target.getTargetPosition(function(error, target) {
            expect(target).toBe(57);
            done();
        });
    });

    test('getTargetPosition exception', (done) => {
        target.getPosition = jest.fn().mockRejectedValue(new Error('Async error'));

        target.getTargetPosition(function(error, target) {
            expect(error).toBeDefined();
            expect(error.message).toMatch('Async error');
            done();
        });
    });

    test('getPosition', async () => {
        mockDevice.currentStates = jest.fn().mockResolvedValue({position: 57});

        let current = await target.getPosition();
        expect(current).toBe(57);
    });

    test('getPosition exception', async () => {
        mockDevice.currentStates = async () => { throw new Error(); };

        expect.assertions(1);
        try {
            await target.getPosition();
        } catch(e) {
            expect(e).toBeTruthy();
        }
    });

    
    test('setPosition callback is being called', async () => {
        jest.useFakeTimers();

        mockDevice.cancelCurrentExecution = jest.fn();
        mockDevice.executeCommand = jest.fn();

        await target.setTargetPosition(100, jest.fn());

        expect(mockDevice.cancelCurrentExecutionByCommand).toHaveBeenCalled();
        expect(mockDevice.executeCommand).toHaveBeenCalled();
    });

    test('setPosition to close a window covering accessory.', async () => {
        jest.useFakeTimers();

        target.currentPosition.value = 100;
        target.getPosition = jest.fn().mockResolvedValue(57);
        await target.setTargetPosition(0, jest.fn());

        expect(target.positionState.updateValue)
            .toHaveBeenNthCalledWith(1, PositionState.DECREASING);
        expect(mockDevice.cancelCurrentExecutionByCommand).toHaveBeenCalled();
        expect(mockDevice.executeCommand).toHaveBeenCalled();
    });

    test('when a device state changed event is received while opening blinds, position is updated', () => {
        jest.useFakeTimers();

        target.isCommandRunning = true;
        target.currentPosition.value = 0;
        target.nextTargetPosition = 50;
        const event = new DeviceStateChangedEvent(mockConsole, 123, 'abc', 
            new DeviceState([ { "name": "core:ClosureState", "type": 1, "value": "93" } ]));

        target.onEvent(event);

        expect(target.currentPosition.updateValue).toHaveBeenCalledWith(100 - 93); 
        expect(target.nextTargetPosition).toBe(50);
        expect(target.positionState.updateValue).toHaveBeenCalledWith(target.PositionState.INCREASING);
        expect(target.positionState.updateValue).not.toHaveBeenCalledWith(target.PositionState.STOPPED);
        expect(setTimeout).toHaveBeenCalledTimes(1);
    });

    test('when blinds are reaching the target position, the position state is set to STOPPED', () => {
        jest.useFakeTimers();

        let mockvalue = jest.fn()
            .mockReturnValueOnce(0)
            .mockReturnValue(99);

        Object.defineProperty(target.currentPosition, "value", {
            get: mockvalue
        });

        target.nextTargetPosition = 100;
        target.isCommandRunning = true;
        const event = new DeviceStateChangedEvent(mockConsole, 123, 'abc', 
            new DeviceState([ { "name": "core:ClosureState", "type": 1, "value": "1" } ]));

        target.onEvent(event);

        expect(target.currentPosition.updateValue).toHaveBeenCalledWith(99); 
        expect(target.nextTargetPosition).toBe(100);
        expect(target.positionState.updateValue).toHaveBeenLastCalledWith(target.PositionState.STOPPED);
    });

    test('when blinds are closing, target is not changed by error to 100 if pos overreaches', () => {
        jest.useFakeTimers();

        let mockvalue = jest.fn()
            .mockReturnValueOnce(0)
            .mockReturnValue(51);

        Object.defineProperty(target.currentPosition, "value", {
            get: mockvalue
        });

        target.nextTargetPosition = 50;
        target.isCommandRunning = true;
        const event = new DeviceStateChangedEvent(mockConsole, 123, 'abc', 
            new DeviceState([ { "name": "core:ClosureState", "type": 1, "value": "49" } ]));

        target.onEvent(event);

        expect(target.currentPosition.updateValue).toHaveBeenCalledWith(51); 
        expect(target.nextTargetPosition).toBe(50);
        expect(target.positionState.updateValue).toHaveBeenLastCalledWith(target.PositionState.STOPPED);
    });

    test('On state changed event, window covering is able to infer target position (increase)', () => {
        jest.useFakeTimers();

        let mockvalue = jest.fn()
            .mockReturnValueOnce(0)
            .mockReturnValue(80);

        Object.defineProperty(target.currentPosition, "value", {
            get: mockvalue
        });

        target.nextTargetPosition = -1;
        const event = new DeviceStateChangedEvent(mockConsole, 123, 'abc', 
            new DeviceState([ { "name": "core:ClosureState", "type": 1, "value": "20" } ]));

        target.onEvent(event);

        expect(target.nextTargetPosition).toBe(100);
        expect(target.positionState.updateValue).toHaveBeenLastCalledWith(target.PositionState.INCREASING);
    });

    test('Infer decrease from -1', () => {
        target.inferTargetPositionOnSilenceExecution(80, 100, -1);
        expect(target.targetPosition.updateValue).toHaveBeenCalledWith(0); 
    });

    test('Infer decrease from other position', () => {
        target.inferTargetPositionOnSilenceExecution(80, 100, 100);
        expect(target.targetPosition.updateValue).toHaveBeenCalledWith(0); 
    });

    test('Infer increase from -1', () => {
        target.inferTargetPositionOnSilenceExecution(20, 0, -1);
        expect(target.targetPosition.updateValue).toHaveBeenCalledWith(100); 
    });

    test('Infer increase from other position', () => {
        target.inferTargetPositionOnSilenceExecution(20, 0, 0);
        expect(target.targetPosition.updateValue).toHaveBeenCalledWith(100); 
    });

    test('When a new execution registers, the command is processed', () => {
        jest.useFakeTimers();

        let mockvalue = jest.fn().mockReturnValueOnce(0);
        Object.defineProperty(target.currentPosition, "value", {
            get: mockvalue
        });

        target.nextTargetPosition = 0;
        const event = new ExecutionRegisteredEvent(mockConsole, 123, 'abc', 'deviceURL',
            new Command('setPosition' , [{ value: 0, type: 1 }]));

        target.onEvent(event);

        expect(target.nextTargetPosition).toBe(100);
        expect(target.isCommandRunning).toBe(true);
        expect(target.positionState.updateValue).toHaveBeenCalledWith(PositionState.INCREASING);
    });

    test('When a new execution state changes to STOP, position state is set to STOPPED', () => {
        jest.useFakeTimers();

        let event = new ExecutionStateChangedEvent(mockConsole, 123, '123', 'deviceURL', 'RUNNING', 'COMPLETED');
        target.isCommandRunning = true;
        target.positionState.value == PositionState.DECREASING;
        target.onEvent(event);

        expect(target.isCommandRunning).toBe(false);
        expect(target.positionState.updateValue).toHaveBeenCalledWith(PositionState.STOPPED);
    });

    test('When a command for a different execID is received, it is ignored.', () => {
        jest.useFakeTimers();

        let event = new ExecutionStateChangedEvent(mockConsole, 123, '123', 'deviceURL', 'RUNNING', 'COMPLETED');
        target.isCommandRunning = true;
        target.execId = 'not the same';
        target.onEvent(event);

        expect(target.isCommandRunning).toBe(true);
        expect(target.positionState.updateValue).not.toHaveBeenCalled();
    });

    test('updatePositionState increasing', () => {
        target.currentPosition.value = 0;
        target.updatePositionState(100);
        expect(target.positionState.updateValue)
            .toHaveBeenCalledWith(PositionState.INCREASING);
    });

    test('updatePositionState decreasing', () => {
        target.currentPosition.value = 100;
        target.updatePositionState(0);
        expect(target.positionState.updateValue)
            .toHaveBeenCalledWith(PositionState.DECREASING);
    });

    test('updatePositionState stopped', () => {
        target.currentPosition.value = 100;
        target.updatePositionState(100);
        expect(target.positionState.updateValue)
            .toHaveBeenCalledWith(PositionState.STOPPED);
    });

    test('updatePositionState is considered as stopped when at 2% from target', () => {
        target.currentPosition.value = 98;
        target.updatePositionState(100);
        expect(target.positionState.updateValue)
            .toHaveBeenCalledWith(PositionState.STOPPED);
    });

    test('Convert from Somfy to Homekit', () => {
        expect(target.fromSomfy(0)).toBe(-90);
        expect(target.fromSomfy(100)).toBe(90);
        expect(target.fromSomfy(50)).toBe(0);
    });

    test('Convert from Homekit to Somfy', () => {
        expect(target.toSomfy(-90)).toBe(0);
        expect(target.toSomfy(0)).toBe(50);
        expect(target.toSomfy(90)).toBe(100);
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    function createHomebridgeMock() {
        mockHomebridge = jest.mock();
        mockHomebridge.hap = jest.mock();
        mockHomebridge.hap.Characteristic = jest.mock();
        mockHomebridge.hap.Characteristic.PositionState = PositionState;
    }

    function createMockConsole() {
        mockConsole = jest.fn();
        mockConsole.debug = jest.fn();
        mockConsole.error = jest.fn();
        mockConsole.log = jest.fn();
        mockConsole.warn = jest.fn();
    }

    function createMockDevice() {
        mockDevice = jest.mock();
        mockDevice.isTwoWay = true;
        mockDevice.hasCommand = jest.fn().mockReturnValue(true);
        mockDevice.cancelCurrentExecutionByCommand = jest.fn().mockResolvedValue();
        mockDevice.executeCommand = jest.fn().mockResolvedValue();
    }

    function createMockEventsController() {
        mockEventsController = jest.mock()
        mockEventsController.subscribe = jest.fn();
    }

    function createMockHAPWindowCovering() {
        mockHAPWindowCovering = jest.mock();
        mockHAPWindowCovering.getCharacteristic = jest.fn()
            .mockImplementation(() => createMockCharacteristic())
        mockHAPWindowCovering.addCharacteristic = jest.fn()
            .mockImplementation(() => createMockCharacteristic())
    }

    function createMockCharacteristic() {
        let characteristic = {
            updateValue: jest.fn(),
            on: jest.fn().mockReturnThis()
        };

        return characteristic;
    }
});