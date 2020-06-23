<p align="center">
    <img src="documentation/logo.png" width="300" alt="Connexoon logo">
</p>

# Homebridge Connexoon for RTS

A Homebridge plugin providing support for the **Connexoon** (Somfy), **TaHoma** (Somfy) and **Cozytouch** (Atlantic, Thermor, Sauter) platforms and accessories working over the RTS protocol.

This plugin's implementation is inspired by and initially based on Romain Duboc's [homebridge-tahoma](https://github.com/dubocr/homebridge-tahoma) plugin.

This plugin does not support Somfy IO devices, only RTS devices. Use the [homebridge-tahoma](https://github.com/dubocr/homebridge-tahoma) plugin if you have IO devices in your installation.

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

### Required settings

| Parameter  | Type   | Default | Note                                              |
| ---------- | ------ | ------- | ------------------------------------------------- |
| `username` | String | `null`  | Your Somfy / TaHoma / Cozytouch account username. |
| `password` | String | `null`  | Your Somfy / TaHoma / Cozytouch account password. |

### Optional settings

| Parameter              | Type             | Default        | Note                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `service`              | String           | `ConnexoonRTS` | The name of the service used by your hub. Can be: `Cozytouch`, `TaHoma`, `Connexoon` or `ConnexoonRTS`.                                                                                                                                                                                                                                                |
| `devices`              | Object           | `null`         | A JSON object that allows to configure specific devices, using their name as key and configuration Object as value. Accepted configurations differ from device to device. See sections below.                                                                                                                                                          |
| `pollingInterval`      | Number (minutes) | `10`           | The polling interval for refreshing the platform's accessories state for automations, in minutes. By detault set to 10 minutes, it can be set to `0` to disable polling. Note that the information is refreshed on demand when using the Home app, this configuration is designed to let Homekit automations react to state updates in the background. |
| `useListedDevicesOnly` | Boolean          | `false`        | If set to `true`, only the devices listed in the `devices` setting will be included in the platform. Other devices will be filtered out. To include a device with no additional configuration, use an empty object as value: `"Bedroom Blind": {}`.                                                                                                    |

## Device-specific configuration

Each device can receive additional configurations according to its device type registered in the Connexoon app (or equivalent).

### Window Coverings

Screens (such as window blinds) and Roller Shutters accept the `commands` configuration:

```json
{
    "platforms": [
        {
            "platform": "Connexoon",
            "...": "...",

            "devices": {
                "Bedroom Blind": {
                    "commands": ["close", "my", "open"]
                }
            }
        }
    ]
}
```

Note that the above configuration is the default for a Screen, and thus does not need to declared in the homebridge configuration file to use the default.

#### `commands` - Array - Optional

An Array of Strings mapping RTS commands (one of `open`, `my`, `close`) to homekit window covering positions.

The default value is:

```json
["close", "my", "open"]
```

The above configuration means that the shade will have three 'steps' in the Home app, with the bottom one sending the `close` command, the middle one sending the `my` command and the top one sending the `open` command.

If your shades have been installed in the opposite direction, simply reverse the commands array to:

```json
["open", "my", "close"]
```

It is also possible to override the configuration to have only two 'steps' for the shade's closure, and for instance, use the 'my' preferred position as the open state, with:

```json
["close", "my"]
```

# Limitation

This platform has been designed to support RTS devices only. As of now, the following device types are supported:

-   Awning
-   Curtain
-   Exterior Screen
-   Exterior Venetian Blind
-   Generic
-   Pergola
-   Roller Shutter
-   Screen
-   Swinging Shutter
-   VenetianBlind

Support for more types may be added as needed.

Since the RTS protocol is one-way, actual closure state is unknown and must be inferred from the last command that was submitted to the device.

# Contribute

Please feel free to contribute to this plugin by adding support for new device types, implementing new features or fixing bugs. Pull requests are welcome.
