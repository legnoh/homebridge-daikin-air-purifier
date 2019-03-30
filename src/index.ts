import * as Daikin from 'daikin-air-purifier';
let Service, Characteristic;

export default function (homebridge: any) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-daikin-air-purifier", "DaikinAirPurifier", DAP);
}

const RES_STYLE_NONE = 0
const RES_STYLE_URLENCODED = 1
const RES_STYLE_COLON = 2
const POW_ON = 1;
const POW_OFF = 0;
const MODE_SMART = 1;
const MODE_AUTOFAN = 0;
const MODE_ECONO = 2;
const MODE_POLLEN = 3;
const MODE_MOIST = 4;
const MODE_CITCULATOR = 5;
const AIRVOL_AUTOFAN = 0;
const AIRVOL_QUIET = 1;
const AIRVOL_LOW = 2;
const AIRVOL_STANDARD = 3;
const AIRVOL_TURBO = 5;
const HUMD_OFF = 0;
const HUMD_LOW = 1;
const HUMD_STANDARD = 2;
const HUMD_HIGH = 3;
const HUMD_AUTO = 4;

class DAP {
    log: Function;
    config: {};
    name: string;
    login_id: string;
    password: string;
    client: Daikin.AirPurifier;
    airPurifierService: any;
    airQualitySensorService: any;
    informationService: any;
    services: any;

    constructor(log, config) {
        this.log = log;
        this.config = config;
        this.name = config["name"];
        this.login_id = config['login_id'];
        this.password = config['password'];
        this.client = new Daikin.AirPurifier(this.login_id, this.password);
        this.services = [];

        // Service "Air Purifier"
        // https://github.com/KhaosT/HAP-NodeJS/blob/243c112abee13346007db358b13b5bbeda75e0af/lib/gen/HomeKitTypes.js#L2673-L2694
        this.airPurifierService = new Service.AirPurifier(this.name);

        this.airPurifierService
            .getCharacteristic(Characteristic.Active)
            .on('get', this.getActiveCharacteristic.bind(this))
            .on('set', this.setActiveCharacteristic.bind(this));

        this.airPurifierService
            .getCharacteristic(Characteristic.CurrentAirPurifierState)
            .on('get', this.getCurrentAirPurifierStateCharacteristic.bind(this));

        this.airPurifierService
            .getCharacteristic(Characteristic.TargetAirPurifierState)
            .on('get', this.getTargetAirPurifierStateCharacteristic.bind(this))
            .on('set', this.setTargetAirPurifierStateCharacteristic.bind(this));

        this.airPurifierService
            .getCharacteristic(Characteristic.RotationSpeed)
            .on('get', this.getRotationSpeedCharacteristic.bind(this))
            .on('set', this.setRotationSpeedCharacteristic.bind(this));

        this.airPurifierService
            .getCharacteristic(Characteristic.FilterChangeIndication)
            .on('get', this.getFilterChangeIndicationCharacteristic.bind(this));

        this.services.push(this.airPurifierService);

        // Service "Air Quality Sensor"
        // https://github.com/KhaosT/HAP-NodeJS/blob/243c112abee13346007db358b13b5bbeda75e0af/lib/gen/HomeKitTypes.js#L2696-L2720
        this.airQualitySensorService = new Service.AirQualitySensor(this.name);

        this.airQualitySensorService
            .getCharacteristic(Characteristic.AirQuality)
            .on('get', this.getAirQuality.bind(this));

        this.services.push(this.airQualitySensorService);

        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Daikin')
            .setCharacteristic(Characteristic.Model, 'MCK70V');

        this.services.push(this.informationService);
    }

    async getActiveCharacteristic(next: any) {
        this.log("getActiveCharacteristic");
        const unitInfo = await this.client.getUnitInfo();
        this.log("getActiveCharacteristic POW:" + unitInfo.ctrl_info.pow);
        return next(null, unitInfo.ctrl_info.pow);
    }

    async setActiveCharacteristic(pow: number, next: any) {
        this.log("setActiveCharacteristic");
        await this.client.setPower(pow);
        if(pow == POW_OFF){
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.INACTIVE);
        } else {
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        }
        return next();
    }

    async getCurrentAirPurifierStateCharacteristic(next: any) {
        this.log("getCurrentAirPurifierStateCharacteristic");
        const unitInfo = await this.client.getUnitInfo();
        this.log("getCurrentAirPurifierStateCharacteristic POW:" + unitInfo.ctrl_info.pow);
        if(unitInfo.ctrl_info.pow == POW_OFF) {
            return next(null, Characteristic.CurrentAirPurifierState.INACTIVE);
        } else if (unitInfo.ctrl_info.airvol == AIRVOL_QUIET) {
            return next(null, Characteristic.CurrentAirPurifierState.IDLE);
        } else {
            return next(null, Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        }
    }

    async getTargetAirPurifierStateCharacteristic(next: any) {
        this.log("getTargetAirPurifierStateCharacteristic");
        const unitInfo = await this.client.getUnitInfo();
        this.log("getTargetAirPurifierStateCharacteristic MODE: " + unitInfo.ctrl_info.mode);
        if(unitInfo.ctrl_info.mode == MODE_SMART) {
            return next(null, Characteristic.TargetAirPurifierState.AUTO);
        } else {
            return next(null, Characteristic.TargetAirPurifierState.MANUAL);
        }
    }

    async setTargetAirPurifierStateCharacteristic(target: number, next: any) {
        this.log("setTargetAirPurifierStateCharacteristic");
        switch (target) {
            case Characteristic.TargetAirPurifierState.MANUAL :
                await this.client.setPollenMode();
                this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                    .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
                break;
            case Characteristic.TargetAirPurifierState.AUTO :
                await this.client.setSmartMode();
                this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                    .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
                break;
        }
        return next();
    }

    async getRotationSpeedCharacteristic(next: any) {
        this.log("getRotationSpeedCharacteristic");
        const unitInfo = await this.client.getUnitInfo();
        this.log("getRotationSpeedCharacteristic airvol: " + unitInfo.ctrl_info.airvol);
        return next(null, unitInfo.ctrl_info.airvol * 20 );
    }

    async setRotationSpeedCharacteristic(speed: number, next: any) {
        this.log("setRotationSpeedCharacteristic");
        let airvol = Math.ceil(speed / 20 );
        this.log("airvol: " + airvol);
        if (speed == 0) {
            await this.client.setPower(POW_OFF);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.INACTIVE);
        } else if ( speed > 0 && speed < 25 ) {
            await this.client.setAirvol(AIRVOL_QUIET);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.IDLE);
        } else if ( speed >= 25 && speed < 50 ) {
            await this.client.setAirvol(AIRVOL_LOW);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.IDLE);
        } else if ( speed >= 50 && speed < 75 ) {
            await this.client.setAirvol(AIRVOL_STANDARD);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        } else if (speed >= 75 && speed < 100 ) {
            await this.client.setAirvol(AIRVOL_TURBO);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        } else if (speed == 100) {
            await this.client.setAirvol(AIRVOL_AUTOFAN);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        }
        return next();
    }

    async getFilterChangeIndicationCharacteristic(next: any) {
        this.log("getFilterChangeIndicationCharacteristic");
        const unitInfo = await this.client.getUnitInfo();
        this.log("getFilterChangeIndicationCharacteristic filter: " + unitInfo.unit_status.filter);
        return next(null, unitInfo.unit_status.filter);
    }

    async getAirQuality(next: any) {
        this.log("getAirQuality");
        const unitInfo = await this.client.getUnitInfo();
        this.log("getAirQuality dust:" + unitInfo.sensor_info.dust + " pm25:" + unitInfo.sensor_info.pm25 + " odor:" + unitInfo.sensor_info.odor);
        let aq = Math.max(unitInfo.sensor_info.dust, unitInfo.sensor_info.pm25, unitInfo.sensor_info.odor);

        switch (aq) {
            case 0:
                return next(null, Characteristic.AirQuality.EXCELLENT);
            case 1:
                return next(null, Characteristic.AirQuality.GOOD);
            case 2:
                return next(null, Characteristic.AirQuality.FAIR);
            case 3:
                return next(null, Characteristic.AirQuality.INFERIOR);
            case 4:
            case 5:
                return next(null, Characteristic.AirQuality.POOR);
            default:
                return next(null, Characteristic.AirQuality.UNKNOWN);
        }
    }

    getServices() {
        this.log("getServices");
        return this.services;
    }
}