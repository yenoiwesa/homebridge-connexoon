const { get } = require('lodash');
const AbortController = require('abort-controller');
const Service = require('./service');
const { cachePromise, delayPromise, ABORTED } = require('../utils');

const POSITIONS_CACHE_MAX_AGE = 2 * 1000;
const POSITION_STATE_CHANGING_DURATION = 6 * 1000;

let Characteristic;

const Command = {
    OPEN: 'open',
    CLOSE: 'close',
    UP: 'up',
    DOWN: 'down',
    MY: 'my',
};

const DEFAULT_COMMANDS = [Command.CLOSE, Command.MY, Command.OPEN];

class WindowCovering extends Service {
    constructor({ homebridge, log, device, config }) {
        super({
            log,
            service: new homebridge.hap.Service.WindowCovering(),
            device,
        });

        this.device = device;
        this.config = config;

        // using the default commands if none have been defined by the user
        this.commands = get(this.config, 'commands', DEFAULT_COMMANDS);

        if (!Array.isArray(this.commands) || this.commands.length < 2) {
            this.log.error(
                'The device commands settings must be an array of at least two commands.',
                `Using default commands instead for ${this.device.name}.`
            );
            this.commands = DEFAULT_COMMANDS;
        }

        this.getPosition = cachePromise(
            this.doGetPosition.bind(this),
            POSITIONS_CACHE_MAX_AGE
        ).exec;

        Characteristic = homebridge.hap.Characteristic;

        // Current Position
        // Percentage, 0 for closed and 100 for open
        this.currentPosition = this.getCharacteristic(
            Characteristic.CurrentPosition
        ).on('get', (cb) =>
            this.getHomekitState(
                'current position',
                this.getCurrentPosition.bind(this),
                cb
            )
        );

        // Target Position
        // Percentage, 0 for closed and 100 for open
        this.targetPositionSteps = parseFloat(
            (100 / (this.commands.length - 1)).toFixed(2)
        );

        this.targetPosition = this.getCharacteristic(
            Characteristic.TargetPosition
        )
            .setProps({
                minValue: 0,
                maxValue: 100,
                minStep: this.targetPositionSteps,
            })
            .on('get', (cb) =>
                this.getHomekitState(
                    'target position',
                    this.getTargetPosition.bind(this),
                    cb
                )
            )
            .on('set', (value, cb) =>
                this.setHomekitState(
                    'target position',
                    value,
                    this.setTargetPosition.bind(this),
                    cb
                )
            );

        // Position State
        // DECREASING (0) | INCREASING (1) | STOPPED (2)
        this.positionState = this.getCharacteristic(
            Characteristic.PositionState
        );

        // set initial values
        this.currentPosition.updateValue(0);
        this.targetPosition.updateValue(0);
        this.positionState.updateValue(Characteristic.PositionState.STOPPED);
    }

    async doGetPosition() {
        let lastCommand = await this.device.getLastCommand();

        // map UP and DOWN commands to OPEN and CLOSE
        switch (lastCommand) {
            case Command.UP:
                lastCommand = Command.OPEN;
                break;
            case Command.DOWN:
                lastCommand = Command.CLOSE;
                break;
        }

        const position = Math.max(
            this.commands.indexOf(lastCommand) * this.targetPositionSteps,
            0
        );

        this.currentPosition.updateValue(position);
        this.targetPosition.updateValue(position);

        return position;
    }

    async updateState() {
        this.getPosition();
    }

    async getCurrentPosition() {
        // fetch the latest position asynchronously
        this.getPosition();

        // but return the currently known one straight away
        return this.currentPosition.value;
    }

    async getTargetPosition() {
        // fetch the latest position asynchronously
        this.getPosition();

        // but return the currently known one straight away
        return this.targetPosition.value;
    }

    async setTargetPosition(value) {
        const controller = new AbortController();
        const abortSignal = controller.signal;

        const command = this.commands[
            Math.round(value / this.targetPositionSteps)
        ];

        if (command == null) {
            return;
        }

        this.updatePositionState(value);

        // abort current request if there is one
        if (this.controller) {
            this.controller.abort();
        }
        // assign the current request controller
        this.controller = controller;

        await this.device.cancelCurrentExecution();

        if (abortSignal.aborted) {
            this.log.debug(
                `Command for ${this.device.name} was aborted before executing`
            );
            return;
        }

        // do not await for the execution to have been sent as there can
        // be multiple retries
        this.device.executeCommand(command, abortSignal).catch((error) => {
            if (error === ABORTED) {
                this.log.debug(`Command for ${this.device.name} was aborted`);
            } else {
                this.log.error(error);
            }
        });

        // set the final requested position after specific delay
        delayPromise(POSITION_STATE_CHANGING_DURATION, abortSignal)
            .then(() => {
                this.currentPosition.updateValue(value);
                this.updatePositionState(value);
            })
            .catch(() => {
                // do nothing
            });
    }

    updatePositionState(target) {
        const position = this.currentPosition.value;

        let positionState;
        if (position > target) {
            positionState = Characteristic.PositionState.DECREASING;
        } else if (position < target) {
            positionState = Characteristic.PositionState.INCREASING;
        } else {
            positionState = Characteristic.PositionState.STOPPED;
        }

        this.positionState.updateValue(positionState);
    }
}

module.exports = WindowCovering;
