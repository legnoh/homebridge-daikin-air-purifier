homebridge-daikin-air-purifier (beta)
========================

- Homebridge Plugin for Daikin Smart Purifier(MCK70U(no checked)/MCK70V).
- Complies with ```Service.AirPurifier```
- Compatible with ***iOS 11 and above*** -  iOS 10 Home app does not support AirPurifier service. 
- this plugin can't set "humdity". please wait update :bow:

## Installation

1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g legnoh/homebridge-daikin-air-purifier`
3. Update your configuration file. See below example.

## Config file

- please create "Out-of-Home"(宅外操作) Password before setting homebridge.
    - FYI: [ダイキン スマートアプリ アプリの特長 \| Daikin APP \| ダイキン工業株式会社](https://www.daikinaircon.com/app/smart_app/about04.html)

```json
"accessories": [{
    "accessory": "DaikinAirPurifier",
    "name": "YOUR_DEVICE_NAME",
    "login_id": "YOUR_ID",
    "password": "YOUR_PASSWORD"
}]
```


## Configurations

|             Parameter            |                       Description                       | Required |  Default  |  type  |
| -------------------------------- | ------------------------------------------------------- |:--------:|:---------:|:---------:|
| `accessory`                      | always "DaikinAirPurifier".                              |     ✓    |      -    |  String  |
| `name`                           | name of the accessory - for DisplayName and logs.        |     ✓    |      -    |  String  |
| `username`                       | your "out-of-home" Login id.                             |     ✓    |      -    |  String  |
| `password`                       | your "out-of-home" password.                             |     ✓    |      -    |  String  |

## Control

TBD