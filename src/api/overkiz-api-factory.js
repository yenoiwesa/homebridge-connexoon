const OverkizAPI = require('./overkiz-api');
const RequestHandler = require('./request-handler');

module.exports = function(config, log) {
    const requestHandler = new RequestHandler(config, log);
    return new OverkizAPI(requestHandler, log);
}
