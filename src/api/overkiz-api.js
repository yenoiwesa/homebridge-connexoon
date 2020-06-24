const { get } = require('lodash');
const { cachePromise, delayPromise } = require('../utils');
const { Execution } = require('./execution');
const Device = require('./device');
const RequestHandler = require('./request-handler');

const CURRENT_EXECUTIONS_CACHE_DURATION = 300;
const EXECUTIONS_HISTORY_CACHE_DURATION = 2 * 1000;
const COMMAND_EXEC_RETRY_DELAY = 8 * 1000;
const MAX_COMMAND_EXEC_ATTEMPTS = 5;

class OverkizAPI {
    constructor(config, log) {
        this.handler = new RequestHandler(config, log);
        this.log = log;

        this.getCurrentExecutions = cachePromise(
            this.doGetCurrentExecutions.bind(this),
            CURRENT_EXECUTIONS_CACHE_DURATION
        ).exec;

        this.getExecutionsHistory = cachePromise(
            this.doGetExecutionsHistory.bind(this),
            EXECUTIONS_HISTORY_CACHE_DURATION
        ).exec;
    }

    getUrlForQuery(query) {
        return this.handler.server.getUrlForQuery(query);
    }

    async listDevices() {
        try {
            const jsonDevices = await this.handler.sendRequestWithLogin(
                (request) =>
                    request.get({
                        url: this.getUrlForQuery('/setup/devices'),
                        json: true,
                    })
            );

            return jsonDevices.map((json) => new Device(json, this));
        } catch (result) {
            this.log.error('Failed to get device list', result.error);

            throw result;
        }
    }

    async doGetCurrentExecutions() {
        try {
            return await this.handler.sendRequestWithLogin((request) =>
                request.get({
                    url: this.getUrlForQuery('/exec/current'),
                    json: true,
                })
            );
        } catch (result) {
            this.log.error('Failed to get current execution', result.error);

            throw result;
        }
    }

    async doGetExecutionsHistory() {
        try {
            return await this.handler.sendRequestWithLogin((request) =>
                request.get({
                    url: this.getUrlForQuery('/history/executions'),
                    json: true,
                })
            );
        } catch (result) {
            this.log.error('Failed to get the list of events', result.error);

            throw result;
        }
    }

    async executeCommands(label, deviceURL, commands, abortSignal) {
        return this.applyExecution(
            new Execution(label, deviceURL, commands),
            abortSignal
        );
    }

    async applyExecution(execution, abortSignal, attemptCount = 1) {
        try {
            return await this.handler.sendRequestWithLogin((request) =>
                request.post({
                    url: this.getUrlForQuery('/exec/apply'),
                    json: true,
                    body: execution,
                })
            );
        } catch (result) {
            // if the command execution queue is full
            if (get(result, 'error.errorCode') === 'EXEC_QUEUE_FULL') {
                // throw an exception if we already retried too many times
                if (attemptCount >= MAX_COMMAND_EXEC_ATTEMPTS) {
                    this.log.error(
                        `Execution queue is full, too many attempts were made (${MAX_COMMAND_EXEC_ATTEMPTS}), giving up`
                    );

                    return;
                }

                // otherwise, retry the request after a delay
                this.log.debug(
                    `Execution queue is full, re-attempting in ${COMMAND_EXEC_RETRY_DELAY} ms`
                );

                await delayPromise(COMMAND_EXEC_RETRY_DELAY, abortSignal);

                return this.applyExecution(
                    execution,
                    abortSignal,
                    ++attemptCount
                );
            }

            this.log.error('Failed to exec command', result.error);

            throw result;
        }
    }

    async cancelExecution(execId) {
        this.log.debug('Cancelling execution', execId);

        try {
            return await this.handler.sendRequestWithLogin((request) =>
                request.delete({
                    url: this.getUrlForQuery(`/exec/current/setup/${execId}`),
                    json: true,
                })
            );
        } catch (result) {
            this.log.error('Failed to cancel command', execId, result.error);

            throw result;
        }
    }
}

module.exports = OverkizAPI;
