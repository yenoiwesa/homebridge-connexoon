const WindowCovering = require('./one-way-window-covering');

describe('window-covering', () => {
    let mockDevice;
    let mockHomebridge;
    let mockConsole;
    let mockConfig;
    let mockHAPWindowCovering;
    let windowCovering;
    const PositionState = {
        DECREASING: 'DECREASING',
        INCREASING: 'INCREASING',
        STOPPED: 'STOPPED'
    };

    beforeEach(() => {
        createHomebridgeMock();
        createMockConsole();
        createMockDevice();
        mockHAPWindowCovering = jest.mock();
        mockHAPWindowCovering.getCharacteristic = jest.fn()
            .mockImplementation(() => { return { updateValue: jest.fn(), on: jest.fn().mockReturnThis() } });

        WindowCovering.prototype._createHAPService = jest.fn().mockReturnValue(mockHAPWindowCovering);
        windowCovering = new WindowCovering(
            {log: mockConsole, homebridge: mockHomebridge, eventsController: jest.mock(), device: mockDevice, config: mockConfig});
        
        windowCovering.positionState.updateValue.mockClear();
    });


    test('initialization of the window covering service', () => {
        expect(windowCovering.device).toBe(mockDevice);
    });

    test('Initialization of HAP device', () => {
        expect(windowCovering.getHomekitService()).toBe(mockHAPWindowCovering);
    });


    test('getTargetPosition', (done) => {
        windowCovering.getPositions = jest.fn().mockResolvedValue({ target: 57 });

        windowCovering.getTargetPosition(function(error, target) {
            expect(target).toBe(57);
            done();
        });
    });

    test('getTargetPosition exception', (done) => {
        windowCovering.getPositions = jest.fn().mockRejectedValue(new Error('Async error'));

        windowCovering.getTargetPosition(function(error, target) {
            expect(error).toBeDefined();
            expect(error.message).toMatch('Async error');
            done();
        });
    });

    test('getCurrentPosition', (done) => {
        windowCovering.getPositions = jest.fn().mockResolvedValue({ current: 57 });

        windowCovering.getCurrentPosition(function(error, current) {
            expect(current).toBe(57);
            done();
        });
    });

    test('getCurrentPosition exception', (done) => {
        windowCovering.getPositions = jest.fn().mockRejectedValue(new Error('Async error'));

        windowCovering.getCurrentPosition(function(error, target) {
            expect(error).toBeDefined();
            expect(error.message).toMatch('Async error');
            done();
        });
    });

    test('doGetPositions open', async () => {
        mockDevice.getLastCommand = jest.fn().mockResolvedValue('open');

        let position = await windowCovering.doGetPositions();
        
        expect(position).toHaveProperty('current');
        expect(position).toHaveProperty('target');
        expect(position.target).toBe(100);
        expect(position.current).toBe(100);
    });


    test('doGetPositions close', async () => {
        mockDevice.getLastCommand = jest.fn().mockResolvedValue('close');

        let position = await windowCovering.doGetPositions();
        
        expect(position).toHaveProperty('current');
        expect(position).toHaveProperty('target');
        expect(position.target).toBe(0);
        expect(position.current).toBe(0);
    });

    
    test('setPosition callback is being called', (done) => {
        jest.useFakeTimers();

        mockDevice.cancelCurrentExecution = jest.fn();
        mockDevice.executeCommand = jest.fn();

        windowCovering.setPosition(100, function() {
            expect(windowCovering.positionState.updateValue).toHaveBeenCalled();
            done();
        });
    });

    test('setPosition to close a window covering accessory.', async () => {
        jest.useFakeTimers();

        windowCovering.currentPosition.value = 100;
        await windowCovering.setPosition(0, jest.fn());

        expect(windowCovering.positionState.updateValue)
            .toHaveBeenNthCalledWith(1, PositionState.DECREASING);
        expect(mockDevice.cancelCurrentExecution).toHaveBeenCalled();
        expect(mockDevice.executeCommand).toHaveBeenCalled();

        windowCovering.currentPosition.value = 0;
        jest.runOnlyPendingTimers();

        expect(windowCovering.positionState.updateValue)
            .toHaveBeenNthCalledWith(2, PositionState.STOPPED);
        expect(windowCovering.positionState.updateValue).toHaveBeenCalledTimes(2);
    });

    test('updatePositionState increasing', () => {
        windowCovering.currentPosition.value = 0;
        windowCovering.updatePositionState(100);
        expect(windowCovering.positionState.updateValue)
            .toHaveBeenCalledWith(PositionState.INCREASING);
    });

    test('updatePositionState decreasing', () => {
        windowCovering.currentPosition.value = 100;
        windowCovering.updatePositionState(0);
        expect(windowCovering.positionState.updateValue)
            .toHaveBeenCalledWith(PositionState.DECREASING);
    });

    test('updatePositionState stopped', () => {
        windowCovering.currentPosition.value = 100;
        windowCovering.updatePositionState(100);
        expect(windowCovering.positionState.updateValue)
            .toHaveBeenCalledWith(PositionState.STOPPED);
    });

    test('targetToCommand open', () => {
        expect(windowCovering.targetToCommand(100))
            .toBe('open');
    });

    test('targetToCommand close', () => {
        expect(windowCovering.targetToCommand(0))
            .toBe('close');
    });

    test('targetToCommand my', () => {
        expect(windowCovering.targetToCommand(50))
            .toBe('my');
    });

    test('targetToCommand unknown', () => {
        expect(windowCovering.targetToCommand(75))
            .toBeUndefined();
    });

    test('commandToPosition up/open', () => {
        expect(windowCovering.commandToPosition('up')).toBe(100);
        expect(windowCovering.commandToPosition('open')).toBe(100);
    });

    test('commandToPosition down/close', () => {
        expect(windowCovering.commandToPosition('down')).toBe(0);
        expect(windowCovering.commandToPosition('close')).toBe(0);
    });

    test('commandToPosition unknown', () => {
        expect(windowCovering.commandToPosition('foo')).toBe(0);
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
        mockDevice.cancelCurrentExecution = jest.fn().mockResolvedValue();
        mockDevice.executeCommand = jest.fn().mockResolvedValue();
    }
});