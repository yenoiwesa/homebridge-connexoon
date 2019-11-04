const SERVER = {
    Cozytouch: 'ha110-1.overkiz.com',
    TaHoma: 'tahomalink.com',
    Connexoon: 'tahomalink.com',
    ConnexoonRTS: 'ha201-1.overkiz.com',
};

class Server {
    constructor(service = 'ConnexoonRTS') {
        this.service = service;
        this.domain = SERVER[service];
    }

    getUrlForQuery(query) {
        return `https://${this.domain}/enduser-mobile-web/enduserAPI${query}`;
    }
}

module.exports = Server;
