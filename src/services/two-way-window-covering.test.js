const WindowCovering = require('./two-way-window-covering');

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
        mockHAPWindowCovering.addCharacteristic = jest.fn()
            .mockImplementation(() => { return { updateValue: jest.fn(), on: jest.fn().mockReturnThis() } });

        WindowCovering.prototype._createHAPService = jest.fn().mockReturnValue(mockHAPWindowCovering);
        windowCovering = new WindowCovering(
            {log: mockConsole, homebridge: mockHomebridge, device: mockDevice, config: mockConfig});
        
        windowCovering.positionState.updateValue.mockClear();
    });

    test('initialization of the window covering service', () => {
        expect(windowCovering.device).toBe(mockDevice);
    });

    test('Initialization of HAP device', () => {
        expect(windowCovering.getHomekitService()).toBe(mockHAPWindowCovering);
    });


    test('getTargetPosition when not known next target', (done) => {
        windowCovering.getPosition = jest.fn().mockResolvedValue(57);

        windowCovering.getTargetPosition(function(error, target) {
            expect(target).toBe(57);
            done();
        });
    });

    test('getTargetPosition when there is a known next target', (done) => {
        windowCovering.nextTargetPosition = 57;

        windowCovering.getTargetPosition(function(error, target) {
            expect(target).toBe(57);
            done();
        });
    });

    test('getTargetPosition exception', (done) => {
        windowCovering.getPosition = jest.fn().mockRejectedValue(new Error('Async error'));

        windowCovering.getTargetPosition(function(error, target) {
            expect(error).toBeDefined();
            expect(error.message).toMatch('Async error');
            done();
        });
    });

    test('getPosition', async () => {
        mockDevice.currentStates = jest.fn().mockResolvedValue({position: 57});

        let current = await windowCovering.getPosition();
        expect(current).toBe(57);
    });

    test('getPosition exception', async () => {
        mockDevice.currentStates = async () => { throw new Error(); };

        expect.assertions(1);
        try {
            await windowCovering.getPosition();
        } catch(e) {
            expect(e).toBeTruthy();
        }
    });

    
    test('setPosition callback is being called', async () => {
        jest.useFakeTimers();

        mockDevice.cancelCurrentExecution = jest.fn();
        mockDevice.executeCommand = jest.fn();

        await windowCovering.setTargetPosition(100, jest.fn());

        expect(mockDevice.cancelCurrentExecutionByCommand).toHaveBeenCalled();
        expect(mockDevice.executeCommand).toHaveBeenCalled();
    });

    test('setPosition to close a window covering accessory.', async () => {
        jest.useFakeTimers();

        windowCovering.currentPosition.value = 100;
        windowCovering.getPosition = jest.fn().mockResolvedValue(57);
        await windowCovering.setTargetPosition(0, jest.fn());

        expect(windowCovering.positionState.updateValue)
            .toHaveBeenNthCalledWith(1, PositionState.DECREASING);
        expect(mockDevice.cancelCurrentExecutionByCommand).toHaveBeenCalled();
        expect(mockDevice.executeCommand).toHaveBeenCalled();
    });

    test('when polling stops, state is reset', async () => {
        windowCovering.getPosition = jest.fn().mockResolvedValue(0);
        windowCovering.currentPosition.value = 0;
        windowCovering.isPollingActive = true;
        windowCovering.nextTargetPosition = 0;

        windowCovering.isStopped = jest.fn().mockReturnValue(true);

        await windowCovering.pollCurrentPosition(10);

        expect(windowCovering.isPollingActive).toBeFalsy();
        expect(jest.getTimerCount()).toBe(0);
    });

    test('when polling is active, the next poll is scheduled', async () => {
        windowCovering.getPosition = jest.fn().mockResolvedValue(50);
        windowCovering.currentPosition.value = 0;
        windowCovering.isPollingActive = true;
        windowCovering.nextTargetPosition = 0;

        windowCovering.isStopped = jest.fn().mockReturnValue(false);

        await windowCovering.pollCurrentPosition(10);

        expect(windowCovering.isPollingActive).toBeTruthy();
        expect(windowCovering.nextTargetPosition).toBe(0);
        expect(windowCovering.pollingTimeout).toBeTruthy();
        expect(jest.getTimerCount()).toBe(1);
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

    test('updatePositionState is considered as stopped when at 2% from target', () => {
        windowCovering.currentPosition.value = 98;
        windowCovering.updatePositionState(100);
        expect(windowCovering.positionState.updateValue)
            .toHaveBeenCalledWith(PositionState.STOPPED);
    });

    test('Convert from Somfy to Homekit', () => {
        expect(windowCovering.fromSomfy(0)).toBe(-90);
        expect(windowCovering.fromSomfy(100)).toBe(90);
        expect(windowCovering.fromSomfy(50)).toBe(0);
    });

    test('Convert from Homekit to Somfy', () => {
        expect(windowCovering.toSomfy(-90)).toBe(0);
        expect(windowCovering.toSomfy(0)).toBe(50);
        expect(windowCovering.toSomfy(90)).toBe(100);
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
});