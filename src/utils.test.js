const utils = require("./utils");

describe('cachePromise', () => {
    let cachedPromise;
    let promiseCallback;
    let timeout = 1000;

    beforeEach(() => {
        jest.useFakeTimers();
        promiseCallback = jest.fn();
        promiseCallback.mockResolvedValue('This is the result');

        cachedPromise = utils.cachePromise(promiseCallback, timeout);
    });

    test('can return the exec function and the reset function', () => {
        expect(cachedPromise).toHaveProperty('exec');
        expect(cachedPromise).toHaveProperty('reset');
        expect(promiseCallback).not.toBeCalled();
    });

    test('will call exec function', () => {
        cachedPromise.exec();

        expect(promiseCallback).toHaveBeenCalledTimes(1);
    });

    test('can cache the function call', () => {
        cachedPromise.exec();
        cachedPromise.exec();

        expect(promiseCallback).toHaveBeenCalledTimes(1);
    });

    test('will clear cache after a timeout', () => {
        cachedPromise.exec();
        jest.advanceTimersByTime(timeout);

        cachedPromise.exec();

        expect(promiseCallback).toHaveBeenCalledTimes(2);
    });

    afterEach(() => {
        jest.clearAllTimers();
    });
});