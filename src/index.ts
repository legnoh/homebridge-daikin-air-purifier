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
    humidifierService: any;
    humiditySensorService: any;
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
            .on('get', this.getAirPurifierActive.bind(this))
            .on('set', this.setAirPurifierActive.bind(this));

        this.airPurifierService
            .getCharacteristic(Characteristic.CurrentAirPurifierState)
            .on('get', this.getCurrentAirPurifierState.bind(this));

        this.airPurifierService
            .getCharacteristic(Characteristic.TargetAirPurifierState)
            .on('get', this.getTargetAirPurifierState.bind(this))
            .on('set', this.setTargetAirPurifierState.bind(this));

        this.airPurifierService
            .getCharacteristic(Characteristic.RotationSpeed)
            .on('get', this.getRotationSpeed.bind(this))
            .on('set', this.setRotationSpeed.bind(this));

        this.airPurifierService
            .getCharacteristic(Characteristic.FilterChangeIndication)
            .on('get', this.getFilterChangeIndication.bind(this));

        this.services.push(this.airPurifierService);

        // Service "Air Quality Sensor"
        // https://github.com/KhaosT/HAP-NodeJS/blob/243c112abee13346007db358b13b5bbeda75e0af/lib/gen/HomeKitTypes.js#L2696-L2720
        this.airQualitySensorService = new Service.AirQualitySensor(this.name);

        this.airQualitySensorService
            .getCharacteristic(Characteristic.AirQuality)
            .on('get', this.getAirQuality.bind(this));

        this.services.push(this.airQualitySensorService);

        // Service "Humidifier Dehumidifier"
        // https://github.com/KhaosT/HAP-NodeJS/blob/243c112abee13346007db358b13b5bbeda75e0af/lib/gen/HomeKitTypes.js#L3013-L3038
        this.humidifierService = new Service.HumidifierDehumidifier(this.name);

        this.humidifierService
            .getCharacteristic(Characteristic.Active)
            .on('get', this.getHumidifierActive.bind(this))
            .on('set', this.setHumidifierActive.bind(this));

        this.humidifierService
            .getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
            .on('get', this.getCurrentHumidifierState.bind(this));

        this.humidifierService
            .getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
            .setProps({validValues: [Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER] })
            .setValue(Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER);

        this.humidifierService
            .addCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold)
            .on('get', this.getRelativeHumidityHumidifierThreshold.bind(this))
            .on('set', this.setRelativeHumidityHumidifierThreshold.bind(this));

        this.humidifierService
            .getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.getCurrentRelativeHumidity.bind(this));

        this.humidifierService
            .getCharacteristic(Characteristic.WaterLevel)
            .on('get', this.getWaterLevel.bind(this));

        this.services.push(this.humidifierService);

        // Service "Humidity Sensor"
        // https://github.com/KhaosT/HAP-NodeJS/blob/243c112abee13346007db358b13b5bbeda75e0af/lib/gen/HomeKitTypes.js#L3040-L3056
        this.humiditySensorService = new Service.HumiditySensor(this.name);

        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Daikin')
            .setCharacteristic(Characteristic.Model, 'MCK70V');

        this.services.push(this.informationService);
    }

    async getAirPurifierActive(next: any) {
        const unitInfo = await this.client.getUnitInfo();
        this.log("getActiveCharacteristic POW:" + unitInfo.ctrl_info.pow);
        return next(null, unitInfo.ctrl_info.pow);
    }

    async setAirPurifierActive(pow: number, next: any) {
        this.log("setActiveCharacteristic");
        await this.client.setPower(pow);
        if(pow == POW_OFF){
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.INACTIVE);
            this.airPurifierService.getCharacteristic(Characteristic.RotationSpeed)
                .updateValue(0);
            this.humidifierService.getCharacteristic(Characteristic.Active)
                .updateValue(Characteristic.Active.INACTIVE);
            this.humidifierService.getCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold)
                .updateValue(0);
        } else {
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        }
        return next();
    }

    async getCurrentAirPurifierState(next: any) {
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

    async getTargetAirPurifierState(next: any) {
        this.log("getTargetAirPurifierStateCharacteristic");
        const unitInfo = await this.client.getUnitInfo();
        this.log("getTargetAirPurifierStateCharacteristic MODE: " + unitInfo.ctrl_info.mode);
        if(unitInfo.ctrl_info.mode == MODE_SMART || unitInfo.ctrl_info.mode == MODE_AUTOFAN) {
            return next(null, Characteristic.TargetAirPurifierState.AUTO);
        } else {
            return next(null, Characteristic.TargetAirPurifierState.MANUAL);
        }
    }

    async setTargetAirPurifierState(target: number, next: any) {
        this.log("setTargetAirPurifierStateCharacteristic");
        const unitInfo = await this.client.getUnitInfo();
        switch (target) {
            case Characteristic.TargetAirPurifierState.MANUAL :
                await this.client.setPollenMode();
                this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                    .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
                break;
            case Characteristic.TargetAirPurifierState.AUTO :
                this.airPurifierService.getCharacteristic(Characteristic.RotationSpeed)
                    .updateValue(100);
                if (unitInfo.ctrl_info.humd == HUMD_OFF) {
                    await this.client.setAutofanMode();
                } else {
                    await this.client.setSmartMode();
                    this.humidifierService.getCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold)
                        .updateValue(100);
                }
                this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                    .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
                break;
        }
        return next();
    }

    async getRotationSpeed(next: any) {
        this.log("getRotationSpeedCharacteristic");
        const unitInfo = await this.client.getUnitInfo();
        if (unitInfo.ctrl_info.pow == POW_OFF) {
            return next(null, 0);
        } else if (unitInfo.ctrl_info.mode == MODE_ECONO) {
            return next(null, 5);
        } else if (unitInfo.ctrl_info.mode == MODE_POLLEN) {
            return next(null, 100);
        } else {
            switch (unitInfo.ctrl_info.airvol) {
                case AIRVOL_AUTOFAN:
                    return next(null, 100);
                case AIRVOL_TURBO:
                    return next(null, 75);
                case AIRVOL_STANDARD:
                    return next(null, 50);
                case AIRVOL_LOW:
                    return next(null, 25);
                case AIRVOL_QUIET:
                    return next(null, 10);
                default:
                    return next(null, 0);
            }
        }
    }

    async setRotationSpeed(speed: number, next: any) {
        this.log("setRotationSpeedCharacteristic");
        let airvol = Math.ceil(speed / 20 );
        this.log("airvol: " + airvol);
        if (speed == 0) {
            await this.client.setPower(POW_OFF);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.INACTIVE);
        } else if ( speed > 0 && speed < 10 ) {
            await this.client.setEconoMode();
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        } else if ( speed >= 10 && speed < 25 ) {
            await this.client.setAirvol(AIRVOL_QUIET);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.IDLE);
        } else if ( speed >= 25 && speed < 50 ) {
            await this.client.setAirvol(AIRVOL_LOW);
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
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

    async getFilterChangeIndication(next: any) {
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

    async getHumidifierActive(next: any) {
        const unitInfo = await this.client.getUnitInfo();
        this.log("getHumidifierActive: pow:" + unitInfo.ctrl_info.pow + "mode:" + unitInfo.ctrl_info.mode + "humd:" + unitInfo.ctrl_info.humd);
        if( unitInfo.ctrl_info.humd == HUMD_OFF) {
            return next(null, Characteristic.Active.INACTIVE);
        } else {
            return next(null, Characteristic.Active.ACTIVE);
        }
    }

    async setHumidifierActive(pow: number, next: any) {
        this.log("setHumidifierActive");
        const unitInfo = await this.client.getUnitInfo();
        if(pow == POW_OFF){
            if(unitInfo.ctrl_info.pow == POW_ON && (unitInfo.ctrl_info.mode == MODE_SMART || unitInfo.ctrl_info.mode == MODE_MOIST) ){
                await this.client.setControlInfo(POW_ON, MODE_AUTOFAN, AIRVOL_AUTOFAN, HUMD_OFF);
            } else {
                await this.client.setControlInfo(POW_ON, unitInfo.ctrl_info.mode, unitInfo.ctrl_info.airvol, HUMD_OFF);
            }
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.INACTIVE);
            this.humidifierService.getCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold)
                .updateValue(0);
        } else {
            if (unitInfo.ctrl_info.mode == MODE_AUTOFAN) {
                await this.client.setSmartMode();
                this.humidifierService.getCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold)
                    .updateValue(100);
            } else {
                await this.client.setControlInfo(POW_ON, unitInfo.ctrl_info.mode, unitInfo.ctrl_info.airvol, HUMD_STANDARD);
                this.humidifierService.getCharacteristic(Characteristic.RelativeHumidityHumidifierThreshold)
                    .updateValue(50);
            }
            this.airPurifierService.getCharacteristic(Characteristic.CurrentAirPurifierState)
                .updateValue(Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
        }
        return next();
    }

    async getCurrentHumidifierState(next: any) {
        const unitInfo = await this.client.getUnitInfo();
        if (unitInfo.ctrl_info.pow == POW_OFF || unitInfo.ctrl_info.humd == HUMD_OFF) {
            return next(null, Characteristic.CurrentHumidifierDehumidifierState.INACTIVE);
        } else {
            return next(null, Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING);
        }
    }

    async getRelativeHumidityHumidifierThreshold(next: any) {
        this.log("getTargetRelativeHumidityHumidifierThreshold");
        const unitInfo = await this.client.getUnitInfo();
        if ( unitInfo.ctrl_info.mode == MODE_SMART ) {
            return next(null, 100);
        } else if (unitInfo.ctrl_info.mode == MODE_MOIST){
            return next(null, 70);
        } else if (unitInfo.ctrl_info.humd == HUMD_HIGH){
            return next(null, 60);
        } else if (unitInfo.ctrl_info.humd == HUMD_STANDARD) {
            return next(null, 50);
        } else if (unitInfo.ctrl_info.humd == HUMD_LOW) {
            return next(null, 40);
        } else if (unitInfo.ctrl_info.humd == HUMD_OFF) {
            return next(null, 0);
        }
    }

    async setRelativeHumidityHumidifierThreshold(humd: number, next: any) {
        this.log("setTargetRelativeHumidityHumidifierThreshold: " + humd);
        const unitInfo = await this.client.getUnitInfo();
        if (humd == 100) {
            await this.client.setSmartMode();
        } else if (humd >= 70 && humd < 100) {
            await this.client.setMoistMode();
        } else if (humd >= 60 && humd < 70 && (unitInfo.ctrl_info.mode != MODE_SMART && unitInfo.ctrl_info.mode != MODE_MOIST) ) {
            await this.client.setControlInfo(POW_ON, unitInfo.ctrl_info.mode, unitInfo.ctrl_info.airvol, HUMD_HIGH);
        } else if (humd >= 60 && humd < 70 && (unitInfo.ctrl_info.mode == MODE_SMART || unitInfo.ctrl_info.mode == MODE_MOIST) ) {
            await this.client.setControlInfo(POW_ON, MODE_AUTOFAN, unitInfo.ctrl_info.airvol, HUMD_HIGH);
        } else if (humd >= 50 && humd < 60 && (unitInfo.ctrl_info.mode != MODE_SMART && unitInfo.ctrl_info.mode != MODE_MOIST) ) {
            await this.client.setControlInfo(POW_ON, unitInfo.ctrl_info.mode, unitInfo.ctrl_info.airvol, HUMD_STANDARD);
        } else if (humd >= 50 && humd < 60 && (unitInfo.ctrl_info.mode == MODE_SMART || unitInfo.ctrl_info.mode == MODE_MOIST) ) {
            await this.client.setControlInfo(POW_ON, MODE_AUTOFAN, unitInfo.ctrl_info.airvol, HUMD_STANDARD);
        } else if (humd > 0 && humd < 50 && (unitInfo.ctrl_info.mode != MODE_SMART && unitInfo.ctrl_info.mode != MODE_MOIST) ) {
            await this.client.setControlInfo(POW_ON, unitInfo.ctrl_info.mode, unitInfo.ctrl_info.airvol, HUMD_LOW);
        } else if (humd > 0 && humd < 50 && (unitInfo.ctrl_info.mode == MODE_SMART || unitInfo.ctrl_info.mode == MODE_MOIST) ) {
            await this.client.setControlInfo(POW_ON, MODE_AUTOFAN, unitInfo.ctrl_info.airvol, HUMD_LOW);
        } else if (humd == 0 && (unitInfo.ctrl_info.mode == MODE_SMART || unitInfo.ctrl_info.mode == MODE_MOIST) ) {
            await this.client.setControlInfo(POW_ON, MODE_AUTOFAN, AIRVOL_AUTOFAN, HUMD_OFF);
        } else if (humd == 0) {
            await this.client.setControlInfo(POW_ON, unitInfo.ctrl_info.mode, unitInfo.ctrl_info.airvol, HUMD_OFF);
        }

        if (humd == 0) {
            this.humidifierService.getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
                .updateValue(Characteristic.CurrentHumidifierDehumidifierState.INACTIVE);
            this.humidifierService.getCharacteristic(Characteristic.Active)
                .updateValue(Characteristic.Active.INACTIVE);
        } else {
            this.humidifierService.getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
                .updateValue(Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING);
            this.humidifierService.getCharacteristic(Characteristic.Active)
                .updateValue(Characteristic.Active.ACTIVE);
        }
        return next();
    }

    async getCurrentRelativeHumidity(next: any) {
        const unitInfo = await this.client.getUnitInfo();
        this.log("getCurrentRelativeHumidity: " + unitInfo.sensor_info.hhum);
        return next(null, unitInfo.sensor_info.hhum);
    }

    async getWaterLevel(next: any) {
        const unitInfo = await this.client.getUnitInfo();
        this.log("getWaterLevel: " + unitInfo.unit_status.water_supply);
        if (unitInfo.unit_status.water_supply == 0) {
            return next(null, 100);
        } else {
            return next(null, 0);
        }
    }

    getServices() {
        this.log("getServices");
        return this.services;
    }
}