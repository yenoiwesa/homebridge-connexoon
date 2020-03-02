const EventsController = require("./events-controller");
const EventType = require('./event-type');

describe('EventsController', () => {
    let mockOverkizApi;
    let mockEventFactory;
    let mockConsole;
    let target;
    let gcTimerMs;

    beforeEach(() => {
        createMockConsole();
        mockOverkizApi = jest.mock();
        mockEventFactory = jest.mock();
        gcTimerMs = 3*60*1000;

        target = new EventsController(mockConsole, mockEventFactory, mockOverkizApi, 5*1000, 10*1000, gcTimerMs);
    });

    test('Event controller can be created', () => {
        expect(target.refreshFrequencyMs).toBe(10*1000);
    });

    test('Events controller can register for events', async () => {
        mockOverkizApi.registerEvents = jest.fn().mockResolvedValue(123);
        await target.registerEventController();

        expect(target.listenerId).toBe(123);
    });

    test('When registration fails, retry with exponential backoff', async (done) => {
        jest.useFakeTimers();


        mockOverkizApi.registerEvents = jest.fn().mockRejectedValue('Oops');
        await target.registerEventController();

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000);
        jest.runOnlyPendingTimers();
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 4000);
        
        expect(mockOverkizApi.registerEvents).toHaveBeenCalledTimes(3);
    });

    test('Events controller logs an error when failing to register for events', async () => {
        mockOverkizApi.registerEvents = jest.fn().mockRejectedValue('No way');
        await target.registerEventController();

        expect(target.listenerId).toBeFalsy();
        expect(mockConsole.error).toHaveBeenCalled();
    });

    test('Events controller can unregister for events', async () => {
        mockOverkizApi.unregisterEvent = jest.fn();
        await target.unregisterEventController();
    });

    test('Events controller logs an error when failing to unregister for events', async () => {
        mockOverkizApi.unregisterEvent = jest.fn().mockRejectedValue('No way');
        await target.unregisterEventController();

        expect(mockConsole.warn).toHaveBeenCalled();
    });

    test('Events controller can add entries in the execution cache', () => {
        target.assignDeviceUrlToExecId('exec1', 'deviceurl1');
        target.assignDeviceUrlToExecId('exec2', 'deviceurl2');
        target.assignDeviceUrlToExecId('exec2', 'deviceurl3');

        expect(target.getDeviceUrlsForExecId('exec1').length).toBe(1);
        expect(target.getDeviceUrlsForExecId('exec2').length).toBe(2);
    });

    test('Events controller can remove entries in the execution cache', () => {
        target.assignDeviceUrlToExecId('exec1', 'deviceurl1');
        target.assignDeviceUrlToExecId('exec2', 'deviceurl2');
        target.assignDeviceUrlToExecId('exec2', 'deviceurl3');

        target.removeExecution('exec1');

        expect(target.getDeviceUrlsForExecId('exec1').length).toBe(0);
        expect(target.getDeviceUrlsForExecId('exec2').length).toBe(2);
        expect(target.executionToDeviceUrl.hasOwnProperty('exec1')).toBeFalsy();
    });

    test('Events controller returns an empty set when exec id is unknown', () => {
        expect(target.getDeviceUrlsForExecId('exec1').length).toBe(0);
    });

    test('Events controller GC should be called after expected time', () => {
        jest.useFakeTimers();

        target.garbageCollectExecutions = jest.fn();
        target.startGarbageCollector();

        expect(setInterval).toHaveBeenCalled();
        expect(target.garbageCollectExecutions).not.toHaveBeenCalled();

        jest.advanceTimersByTime(3*60*1000);

        expect(target.garbageCollectExecutions).toHaveBeenCalled();
    });

    test('Events controller GC should garbage collect old executions', () => {
        target.assignDeviceUrlToExecId('exec1', 'deviceurl1');
        target.assignDeviceUrlToExecId('exec1', 'deviceurl2');
        target.assignDeviceUrlToExecId('exec2', 'deviceurl2');

        target.executionToDeviceUrl['exec2'].timestamp = Date.now() - gcTimerMs - 1;

        target.garbageCollectExecutions();

        expect(target.getDeviceUrlsForExecId('exec1').length).toBe(2);
        expect(target.getDeviceUrlsForExecId('exec2').length).toBe(0);
    });

    test('Events controller GC should be a noop when nothing needs deletion', () => {
        target.assignDeviceUrlToExecId('exec1', 'deviceurl1');
        target.assignDeviceUrlToExecId('exec1', 'deviceurl2');
        target.assignDeviceUrlToExecId('exec2', 'deviceurl2');

        target.garbageCollectExecutions();

        expect(target.getDeviceUrlsForExecId('exec1').length).toBe(2);
        expect(target.getDeviceUrlsForExecId('exec2').length).toBe(1);
    });

    test('Events controller GC should behave correctly when nothing is in the cache.', () => {
        target.garbageCollectExecutions();
    });

    test('When Events controller fetch event fails, retry registration', async () => {
        jest.useFakeTimers();
        mockOverkizApi.fetchEvents = jest.fn().mockRejectedValue('No way');
        let registerSpy = jest.spyOn(target, 'retryEventsRegistration');
        target.isConnected = true;
        await target.fetchEventsLoop();
        expect(registerSpy).toHaveBeenCalled();
    });

    test('Events controller fetchEvents flattens events created by factory', async () => {
        mockOverkizApi.fetchEvents = jest.fn().mockResolvedValue([
            jest.mock(), jest.mock(), jest.mock(), jest.mock()
        ]);
        mockEventFactory.createEvents = jest.fn().mockReturnValue([
            jest.mock(), jest.mock()
        ]);
        target.isConnected = true;
        target.callSubscriber = jest.fn();

        await target.fetchEvents();
        expect(target.callSubscriber).toHaveBeenCalledTimes(8);
    });
    
    test('Events controller fetchEvents is resiliant to null', async () => {
        mockOverkizApi.fetchEvents = jest.fn().mockResolvedValue([
            jest.mock(), jest.mock()
        ]);
        mockEventFactory.createEvents = jest.fn()
            .mockReturnValueOnce(null)
            .mockReturnValueOnce([jest.mock()]);
        target.callSubscriber = jest.fn();
        target.isConnected = true;

        await target.fetchEvents();
        expect(target.callSubscriber).toHaveBeenCalledTimes(1);
    });

    test('Events controller fetchEvents provide the right context to the event factory', async () => {
        target.assignDeviceUrlToExecId('exec1', 'deviceurl1');

        let jsonEvent = jest.mock();
        jsonEvent.execId = 'id';
        mockOverkizApi.fetchEvents = jest.fn().mockResolvedValue([ jsonEvent ]);
        mockEventFactory.createEvents = jest.fn()
            .mockReturnValueOnce([jest.mock()]);

        target.callSubscriber = jest.fn();
        target.getDeviceUrlsForExecId = jest.fn();
        target.isConnected = true;

        await target.fetchEvents();
        expect(target.callSubscriber).toHaveBeenCalledTimes(1);
        expect(target.getDeviceUrlsForExecId).toHaveBeenCalledWith('id');
    });

    test('Execution lifecyle print an error message if event is of an unknown type', async () => {
        let event = jest.mock();

        target.updateExecutionLifeCycle(event);
        expect(mockConsole.error).toHaveBeenCalled();
    });

    test('Execution lifecyle register new execution', async () => {
        let event = { type: EventType.ExecutionRegisteredEventType, execId: 'exec1' };

        target.updateExecutionLifeCycle(event);
        expect(target.getDeviceUrlsForExecId('exec1').length).toBe(1);
    });

    test('Execution lifecyle on state changed is a noop if command is still running', async () => {
        let event = {
            type: EventType.ExecutionStateChangedEventType,
            execId: 'exec1',
            hasStopped: false
        };
        target.assignDeviceUrlToExecId('exec1', 'deviceurl1');

        target.updateExecutionLifeCycle(event);
        expect(target.getDeviceUrlsForExecId('exec1').length).toBe(1);
    });

    test('Execution lifecyle on state changed removes execution that ended.', async () => {
        let event = {
            type: EventType.ExecutionStateChangedEventType,
            execId: 'exec1',
            hasStopped: true
        };
        target.assignDeviceUrlToExecId('exec1', 'deviceurl1');

        target.updateExecutionLifeCycle(event);
        expect(target.getDeviceUrlsForExecId('exec1').length).toBe(0);
    });

    test('Events controller logs an error when trying to propagate an event with no id', async () => {
        let event = jest.mock();

        target.callSubscriber(event);
        expect(mockConsole.warn).toHaveBeenCalled();
    });

    test('Call subscriber is a noop if no subscribers', async () => {
        let event = { id: 'foo' };
        target.callSubscriber(event);
    });

    test('When a callback is registered, it get called when an event matching is received', (done) => {
        let event = { id: 'foo' };
        target.subscribe('foo', (event) => {
            expect(event.id).toBe('foo');
            done();
        });
        target.callSubscriber(event);
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    function createMockConsole() {
        mockConsole = jest.fn();
        mockConsole.debug = jest.fn();
        mockConsole.error = jest.fn();
        mockConsole.log = jest.fn();
        mockConsole.warn = jest.fn();
    }
});
