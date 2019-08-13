const request = require('request-promise-native').defaults({ jar: true });
const { cachePromise } = require('../utils');
const { Execution } = require('./execution');

const SERVER = {
    Cozytouch: 'ha110-1.overkiz.com',
    TaHoma: 'tahomalink.com',
    Connexoon: 'tahomalink.com',
    ConnexoonRTS: 'ha201-1.overkiz.com',
};

const SESSION_TIMEOUT = 5 * 60 * 1000;

class OverkizAPI {
    constructor({ username, password, service = 'ConnexoonRTS' }, log) {
        this.username = username;
        this.password = password;
        this.service = service;
        this.server = SERVER[service];
        this.log = log;

        // cached version of methods
        const { exec, reset } = cachePromise(
            this.doLogin.bind(this),
            SESSION_TIMEOUT
        );
        this.login = exec;
        this.resetLogin = reset;

        this.getCurrentExecutions = cachePromise(
            this.doGetCurrentExecutions.bind(this),
            2 * 1000
        ).exec;

        this.getExecutionsHistory = cachePromise(
            this.doGetExecutionsHistory.bind(this),
            2 * 1000
        ).exec;
    }

    getUrlForQuery(query) {
        return `https://${this.server}/enduser-mobile-web/enduserAPI${query}`;
    }

    async doLogin() {
        // check that credentials are provided
        if (!this.username || !this.password) {
            this.log.error(
                `Username and password must be defined as configuration.`
            );
            return Promise.reject();
        }

        this.log.debug(`Connecting ${this.service} server...`);

        try {
            const result = await request.post({
                url: this.getUrlForQuery('/login'),
                form: {
                    userId: this.username,
                    userPassword: this.password,
                },
                json: true,
            });

            this.log.debug('Logged in successfully');

            return result;
        } catch (result) {
            this.log.error('Failed to login', result.error);

            // forward login error
            throw result;
        }
    }

    async sendRequestWithLogin(sendRequest, attempted = false) {
        await this.login();

        try {
            return await sendRequest();
        } catch (result) {
            const { response } = result;
            if (response && response.statusCode === 401 && !attempted) {
                this.resetLogin();
                return this.sendRequestWithLogin(sendRequest, true);
            }

            throw result;
        }
    }

    async listDevices() {
        try {
            return await this.sendRequestWithLogin(() =>
                request.get({
                    url: this.getUrlForQuery('/setup/devices'),
                    json: true,
                })
            );
        } catch (result) {
            this.log.error('Failed to get device list', result.error);

            throw result;
        }
    }

    async doGetCurrentExecutions() {
        try {
            return await this.sendRequestWithLogin(() =>
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
            return await this.sendRequestWithLogin(() =>
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
            return await this.sendRequestWithLogin(() =>
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
}

module.exports = OverkizAPI;
