const { cachePromise } = require('../utils');
const { Execution } = require('./execution');
const Device = require('./device');

class OverkizAPI {
    constructor(requestHandler, log) {
        this.requestHandler = requestHandler;
        this.log = log;

        this.getCurrentExecutions = cachePromise(
            this.doGetCurrentExecutions.bind(this),
            1000
        ).exec;

        this.getExecutionsHistory = cachePromise(
            this.doGetExecutionsHistory.bind(this),
            2 * 1000
        ).exec;
    }

    getUrlForQuery(query) {
        return this.requestHandler.server.getUrlForQuery(query);
    }

    async listDevices() {
        try {
            const jsonDevices = await this.requestHandler.sendRequestWithLogin(
                request =>
                    request.get({
                        url: this.getUrlForQuery('/setup/devices'),
                        json: true,
                    })
            );

            return jsonDevices.map(json => new Device(json, this));
        } catch (result) {
            this.log.error('Failed to get device list', result.error);

            throw result;
        }
    }

    async currentStates(deviceURL) {
        try {
            return await this.requestHandler.sendRequestWithLogin(request =>
                request.get({
                    url: this.getUrlForQuery(`/setup/devices/${encodeURI(deviceURL)}/states`),
                    json: true
                })
            );
        } catch (result) {
            this.log.error(`Failed to get states for ${deciveURL} command`, result.error);

            throw result;
        }
    }


    async doGetCurrentExecutions() {
        try {
            return await this.requestHandler.sendRequestWithLogin(request =>
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
            return await this.requestHandler.sendRequestWithLogin(request =>
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

    async executeCommands(label, deviceURL, commands) {
        const execution = new Execution(label, deviceURL, commands);

        try {
            return await this.requestHandler.sendRequestWithLogin(request =>
                request.post({
                    url: this.getUrlForQuery('/exec/apply'),
                    json: true,
                    body: execution,
                })
            );
        } catch (result) {
            this.log.error('Failed to exec command', result.error);

            throw result;
        }
    }

    async cancelExecution(execId) {
        this.log.debug('Cancelling execution', execId);

        try {
            return await this.requestHandler.sendRequestWithLogin(request =>
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
