const LoginMethod = require('./login-method');

const SOMFY_OAUTH_URL = 'https://accounts.somfy.com/oauth/oauth/v2/token';
const SOMFY_OAUTH_CLIENT_ID =
    '0d8e920c-1478-11e7-a377-02dd59bd3041_1ewvaqmclfogo4kcsoo0c8k4kso884owg08sg8c40sk4go4ksg';
const SOMFY_OAUTH_CLIENT_SECRET =
    '12k73w1n540g8o4cokg0cw84cog840k84cwggscwg884004kgk';

const SESSION_TIMEOUT = 3600 * 1000;

class OAuthLogin extends LoginMethod {
    constructor(credentials, log) {
        super(credentials, SESSION_TIMEOUT, log);
    }

    async doLogin() {
        this.log.debug(`Connecting to Somfy OAuth server...`);

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

        this.log.debug('Logged in successfully via Somfy OAuth');

        // store the oauth access token as default
        // to the request object
        this.request = this.request.defaults({
            auth: {
                bearer: result['access_token'],
            },
        });

        return result;
    }
}

module.exports = OAuthLogin;
