const request = require('request-promise-native');
const { cachePromise } = require('../utils');
const { Execution } = require('./execution');
const Device = require('./device');

const SERVER = {
    Cozytouch: 'ha110-1.overkiz.com',
    TaHoma: 'tahomalink.com',
    Connexoon: 'tahomalink.com',
    ConnexoonRTS: 'ha201-1.overkiz.com',
};

const SOMFY_OAUTH_URL = 'https://accounts.somfy.com/oauth/oauth/v2/token';
const SOMFY_OAUTH_CLIENT_ID =
    '0d8e920c-1478-11e7-a377-02dd59bd3041_1ewvaqmclfogo4kcsoo0c8k4kso884owg08sg8c40sk4go4ksg';
const SOMFY_OAUTH_CLIENT_SECRET =
    '12k73w1n540g8o4cokg0cw84cog840k84cwggscwg884004kgk';

const SESSION_TIMEOUT = 3600 * 1000;

class OverkizAPI {
    constructor({ username, password, service = 'ConnexoonRTS' }, log) {
        this.username = username;
        this.password = password;
        this.service = service;
        this.server = SERVER[service];
        this.log = log;
        this.request = request;

        // cached version of methods
        const { exec, reset } = cachePromise(
            this.doLogin.bind(this),
            SESSION_TIMEOUT
        );
        this.login = exec;
        this.resetLogin = reset;

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
            const result = await this.request.post({
                url: SOMFY_OAUTH_URL,
                form: {
                    grant_type: 'password',
                    username: this.username,
                    password: this.password,
                    client_id: SOMFY_OAUTH_CLIENT_ID,
                    client_secret: SOMFY_OAUTH_CLIENT_SECRET,
                },
                json: true,
            });

            this.log.debug('Logged in successfully');

            // store the oauth access token as default
            // to the request object
            this.request = this.request.defaults({
                auth: {
                    bearer: result['access_token'],
                },
            });

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
            const jsonDevices = await this.sendRequestWithLogin(() =>
                this.request.get({
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

    async doGetCurrentExecutions() {
        try {
            return await this.sendRequestWithLogin(() =>
                this.request.get({
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
                this.request.get({
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
                this.request.post({
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
            return await this.sendRequestWithLogin(() =>
                this.request.delete({
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
