const Device = require('./api/device');

describe('connexion-platform', () => {
    let connexoonPlatform;
    let mockOverkizApi;
    let mockConsole;

    beforeEach(() => {
        mockOverkizApi = jest.mock();
        mockConsole = createMockConsole();
        connexoonPlatform = instantiateConnexoonPlatform();
        connexoonPlatform._registerServices = jest.fn();
    });

    
    test('initialization of the platform', () => {
        expect(connexoonPlatform.accessories).toBeTruthy();
    });


    test('RollerShutter are registered', done => {
        let listDevices = [
            new Device({ uiClass: "RollerShutter", label: "RollerShutter", deviceURL: "4" }, null),
        ];

        mockOverkizApi.listDevices = jest.fn().mockResolvedValue(listDevices);
        connexoonPlatform.accessories(accessories => {
            expect(accessories).toHaveLength(1);
            done();
        });
    });

    
    test('Screen are registered', done => {
        let listDevices = [
            new Device({ uiClass: "Screen", label: "screen", deviceURL: "6" }, null),
        ];

        mockOverkizApi.listDevices = jest.fn().mockResolvedValue(listDevices);
        connexoonPlatform.accessories(accessories => {
            expect(accessories).toHaveLength(1);
            done();
        });
    });

    
    test('Awning are registered', done => {
        let listDevices = [
            new Device({ uiClass: "Awning", label: "Awning", deviceURL: "6" }, null),
        ];

        mockOverkizApi.listDevices = jest.fn().mockResolvedValue(listDevices);
        connexoonPlatform.accessories(accessories => {
            expect(accessories).toHaveLength(1);
            done();
        });
    });
   
/*
    test('ExteriorVenetianBlind are registered', done => {
        let listDevices = [
            new Device({ uiClass: "ExteriorVenetianBlind", label: "ExteriorVenetianBlind", deviceURL: "6" }, null),
        ];

        mockOverkizApi.listDevices = jest.fn().mockResolvedValue(listDevices);
        connexoonPlatform.accessories(accessories => {
            expect(accessories).toHaveLength(1);
            done();
        });
    });
    */

    test('Unknown devices are ignored', done => {
        let listDevices = [
            new Device({ uiClass: "Unknown", label: "Unknown", deviceURL: "6" }, null),
        ];

        mockOverkizApi.listDevices = jest.fn().mockResolvedValue(listDevices);
        connexoonPlatform.accessories(accessories => {
            expect(accessories).toHaveLength(0);
            done();
        });
    });

    function instantiateConnexoonPlatform() {
        jest.mock('./accessory', () => {
            class Accessory {
                constructor({ homebridge, log, device }) {
                    this.device = device;
                    this.log = log;
                }
            }
            return Accessory;
        });
        jest.mock('./api/overkiz-api-factory', () => {
            return (config, log) => mockOverkizApi;
        });

        const { PLUGIN_NAME, PLATFORM_NAME, ConnexoonPlatformFactory } = require("./connexoon-platform");
        const ConnexoonPlatform = ConnexoonPlatformFactory({});
        return new ConnexoonPlatform(mockConsole, {}, {});
    }

    function createMockConsole() {
        let log = jest.fn();
        log.debug = jest.fn();
        log.error = jest.fn();
        log.log = jest.fn();
        log.warn = jest.fn();

        return log;
    }
});