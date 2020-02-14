const EventsController = require('./events-controller');
const EventFactory = require('./event-factory');

module.exports = function(log, overkiz) {
    let eventFactory = new EventFactory(log);
    return new EventsController(log, eventFactory, overkiz)
}