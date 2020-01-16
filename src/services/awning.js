const { get } = require('lodash');
const { cachePromise } = require('../utils');
const AbstractService = require('./abstract-service');

class Awning extends AbstractService {
    constructor({ homebridge, log, device, config }) {
        super({ homebridge, log, device, config });

        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;

    }
}

module.exports = Awning;