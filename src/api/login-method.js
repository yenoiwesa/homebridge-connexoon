const request = require('request-promise-native');
const { cachePromise } = require('../utils');

class LoginMethod {
    constructor({ username, password }, sessionTimeout, log) {
        this.username = username;
        this.password = password;
        this.log = log;
        this.request = request;

        const { exec, reset } = cachePromise(
            this.doLogin.bind(this),
            sessionTimeout
        );
        this.login = exec;
        this.reset = reset;
    }

    async doLogin() {
        throw 'Must be implemented';
    }
}

module.exports = LoginMethod;
