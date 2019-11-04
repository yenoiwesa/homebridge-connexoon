const LoginMethod = require('./login-method');

const SESSION_TIMEOUT = 5 * 60 * 100;

class SimpleAuthLogin extends LoginMethod {
    constructor(credentials, server, log) {
        super(credentials, SESSION_TIMEOUT, log);

        this.server = server;
        this.request = this.request.defaults({ jar: true });
    }

    async doLogin() {
        this.log.debug(`Connecting to ${this.server.domain}...`);

        const result = await this.request.post({
            url: this.server.getUrlForQuery('/login'),
            form: {
                userId: this.username,
                userPassword: this.password,
            },
            json: true,
        });

        this.log.debug('Logged in successfully via Simple Auth');

        return result;
    }
}

module.exports = SimpleAuthLogin;
