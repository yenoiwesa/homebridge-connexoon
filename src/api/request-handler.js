const SimpleAuthLogin = require('./simple-auth-login');
const OAuthLogin = require('./oauth-login');
const Server = require('./server');

class RequestHandler {
    constructor({ username, password, service }, log) {
        this.username = username;
        this.password = password;
        this.server = new Server(service);
        this.log = log;
        this.loginHandler = null;
    }

    async login() {
        // check that credentials are provided
        if (!this.username || !this.password) {
            this.log.error(
                'Username and password must be defined as configuration.'
            );
            throw 'Username and password must be defined as configuration.';
        }

        // if the login method has been resolved already, only use the one
        if (this.loginHandler) {
            try {
                return await this.loginHandler.login();
            } catch (result) {
                this.log.error('Failed to login', result.error);

                // forward login error
                throw result;
            }
        }

        // Otherwise try to resolve the login method by attempting
        // each one
        try {
            this.loginHandler = new OAuthLogin(
                { username: this.username, password: this.password },
                this.log
            );
            return await this.loginHandler.login();
        } catch (result) {
            this.log.debug('Failed to login via Somfy OAuth', result.error);
        }

        this.log.debug('Could not connect with OAuth, attempting simple auth');

        try {
            this.loginHandler = new SimpleAuthLogin(
                { username: this.username, password: this.password },
                this.server,
                this.log
            );
            return await this.loginHandler.login();
        } catch (result) {
            this.log.debug('Failed to login via Simple Auth', result.error);
        }

        this.log.error(
            'Could not login with any of the authentication methods.'
        );

        throw 'Could not login with any of the authentication methods.';
    }

    resetLogin() {
        if (this.loginHandler) {
            this.loginHandler.reset();
        }
    }

    async sendRequestWithLogin(sendRequest, attempted = false) {
        await this.login();

        try {
            return await sendRequest(this.loginHandler.request);
        } catch (result) {
            const { response } = result;
            if (response && response.statusCode === 401 && !attempted) {
                this.resetLogin();
                return this.sendRequestWithLogin(sendRequest, true);
            }

            throw result;
        }
    }
}

module.exports = RequestHandler;
