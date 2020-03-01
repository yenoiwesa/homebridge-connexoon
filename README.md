<p align="center">
    <img src="documentation/logo.png" width="300" alt="Connexoon logo">
</p>

# Homebridge Connexoon for RTS and IO

A Homebridge plugin providing support for the **Connexoon** (Somfy), **TaHoma** (Somfy) and **Cozytouch** (Atlantic, Thermor, Sauter) platforms and accessories working over the RTS and IO protocol.

This plugin's implementation is inspired by and initially based on Romain Duboc's [homebridge-tahoma](https://github.com/dubocr/homebridge-tahoma) plugin.

This plugin support for Somfy IO devices is limited. Extending the pluging to include more device should be relatively easy. Don't hesitate to submit a PR with extensions. You can also consider using the [homebridge-tahoma](https://github.com/dubocr/homebridge-tahoma) plugin.

# Requirements

-   **Node** version 11 or above (verify with `node --version`).
-   **Homebridge** version 0.4.0 or above.

# Installation

1. Install homebridge using:

```sh
npm install -g homebridge
```

2. Install the plugin using:

```sh
npm install -g homebridge-connexoon
```

3. Update your configuration file. See bellow for a sample.

> **Note:** it is also possible to install this plugin in a local `npm` package instead using the homebridge option `--plugin-path`.

# Running tests

This plugin comes with a set of unit tests. To run them, do the following:

```sh
npm test
```

# Configuration

## General settings

To configure homebridge-connexoon, add the `Connexoon` platform to the `platforms` section of your homebridge's `config.js` file:

```json
{
    "bridge": { "...": "..." },

    "description": "...",

    "platforms": [
        {
            "platform": "Connexoon",
            "name": "My Connexoon Hub",

            "username": "<Somfy account username>",
            "password": "<Somfy account password>"
        }
    ]
}
```

The platform can be configured with the following parameters:

| Parameter  | Type   | Default        | Note                                                                                                                                                                                                     |
| ---------- | ------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `username` | String | `null`         | **Required** - Your Somfy / TaHoma / Cozytouch account username.                                                                                                                                         |
| `password` | String | `null`         | **Required** - Your Somfy / TaHoma / Cozytouch account password.                                                                                                                                         |
| `service`  | String | `ConnexoonRTS` | Optional - The name of the service used by your hub. Can be: `Cozytouch`, `TaHoma`, `Connexoon` or `ConnexoonRTS`.                                                                                       |
| `devices`  | Object | `null`         | Optional - A JSON object that allows to configure specific devices, using their name as key and configuration Object as value. Accepted configurations differ from device to device. See sections below. |

## Device-specific configuration

Each device can receive additional configurations according to its device type registered in the Connexoon app (or equivalent).

### Window Coverings (RTS Only)

Screens (such as window blinds) and Roller Shutters accept the `commands` configuration:

```json
{
    "platforms": [
        {
            "platform": "Connexoon",
            "...": "...",

            "devices": {
                "Bedroom Blind": {
                    "commands": [
                        { "command": "open", "position": 100 },
                        { "command": "my", "position": 50 },
                        { "command": "close", "position": 0 }
                    ]
                }
            }
        }
    ]
}
```

Note that the above configuration is the default for a Screen, and thus does not need to declared in the homebridge configuration file to use the default.

#### `commands` - Array - Optional

An Array of Objects mapping RTS commands (one of `open`, `my`, `close`) to homekit window covering positions (integer from `0` to `100`), and vice versa. This is not supported for IO devices.

The default value is:

```json
[
    { "command": "open", "position": 100 },
    { "command": "my", "position": 50 },
    { "command": "close", "position": 0 }
]
```

It means that for a homekit command of `100` (i.e. **open**), the plugin will send the `open` command to the device.
If the homekit command received is `0` (i.e. **close**), the plugin will send `close`.
For a command of exactly `50`, the preferred position command `my` will be sent.

In reverse, when calculating the current state of the device, the plugin will retrieve the last command that was executed and convert it to a homekit position from `0` to `100`.
With the default configuration, if the last command was `open`, the accessory will show a position of `100` (i.e. **open**) in the Home app, etc.

It is possible to override this configuration so that, for instance, opening the blind from homekit executes the `my` command instead:

```json
[
    { "command": "my", "position": 100 },
    { "command": "open", "position": 100 },
    { "command": "close", "position": 0 }
]
```

In the configuration above, the `my` command is associated to the homekit position `100` (i.e. **open**). As it is the first item in the array, it will take precedence over the `open` command when the plugin will determine what command to send.

# Automation

As other plug-ins, homebridge-connexoon allows you to automate your blinds and awnings. Homebridge-connexoon fully supports `PositionState` like `Opening`, `Closing`, and `Stopped`. With the [Eve app](https://apps.apple.com/us/app/eve-for-homekit/id917695792), you can use those states as trigger for advance scenarios. For instance:

- When my blinds are opening after sunrise and before sunset, switch off all lights in the room

(IO device only) This plug-in is also listening for actions happening outside of homekit echo system. For instance, if you have SOMFY remote controls in your home to activate your blinds, homebridge-connexoon will detect when you are operating your blinds through those remote controls. This will allow a seamless integration and ensure your home app is always in sync with your physical devices.

# Limitation

I have created this homebridge plugin for my personal use, and thus it fits the purpose of my home's installation.

Currently, the platform only supports RTS devices of the following type:

-   **Screen**
-   **Roller Shutter**
-   **ExteriorVenetianBlind (IO only)**
-   **Awning (IO only)**

Support for more types may be added as needed.

For RTS devices, which is a one-way protocol, devices status is unknown and must be inferred from the last command that was submitted to the device.
IO supports two-way communication and allow more advance automation scenarios.

# Contribute

Please feel free to contribute to this plugin by adding support for new device types, implementing new features or fixing bugs. Pull requests are welcome.

 - Matthieu Di Berardino: Initial plugin and RTS devices implementations.
 - Renault John Lecoultre: IO devices implementations and unit testing.
