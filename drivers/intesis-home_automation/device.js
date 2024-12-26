'use strict';
const MyCommonFunctions = require("../common");
const DebugMode = MyCommonFunctions.DebugMode;
const MyWMPFunctions = require("../WMP_common");
const GetWMPDeviceState = MyWMPFunctions.GetWMPDeviceState;
const WMPDeviceConnect = MyWMPFunctions.WMPDeviceConnect;
const GetWMPDeviceCapabilities = MyWMPFunctions.GetWMPDeviceCapabilities;

const { Device } = require('homey');
const net = require ('node:net');
var PollingCronId;

class MyDevice extends Device {
  
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Intesis device has been initialized');

    //On first init, let's make this device not tricky
    //await this.setSettings({"device_tricky": 'false'});
    const unit_number = this.getSetting("unit_number") ?? 1;

    GetWMPDeviceState.call(this);
    const polling_rate = this.getSetting("polling_rate") * 1000;
    PollingCronId = setInterval(() => {
      GetWMPDeviceState.call(this);
    }, polling_rate); //every polling_rate seconds

    //Let's verify that polling_rate has npt been modified in code in case of a tricky device (not less than 1 min)
    const new_polling_rate = this.getSetting("polling_rate") * 1000;
    if (new_polling_rate != polling_rate) {
      clearInterval(PollingCronId);
      PollingCronId = setInterval(() => {
        GetWMPDeviceState.call(this);
      }, new_polling_rate); //every polling_rate seconds
    }

    if (DebugMode) {console.log("PollingCronId : ",PollingCronId)}

    // register OnOff capability
    this.registerCapabilityListener("onoff", async (ParamValue) => {
      //SET,acNum:function,value
      var ValueParam;
      if (ParamValue) {ValueParam="ON"} else {ValueParam="OFF"}
      WMPDeviceConnect.call(this,'SET,' + unit_number + ':ONOFF,'+ValueParam);
      this.setCapabilityValue("sensor_power", ParamValue);
    });

    // register thermostat_mode capability
    this.registerCapabilityListener("intesis_mode", async (ParamValue) => {
      //SET,acNum:function,value
        WMPDeviceConnect.call(this,'SET,' + unit_number + ':MODE,'+ParamValue.toUpperCase());
        this.setCapabilityValue("sensor_mode", this.homey.__("device.mode."+ParamValue));
      });

    // register intesis_fanspeed capability
    this.registerCapabilityListener("intesis_fanspeed", async (ParamValue) => {
      //SET,acNum:function,value
      WMPDeviceConnect.call(this,'SET,' + unit_number + ':FANSP,'+ParamValue);
      this.setCapabilityValue("sensor_fan", this.homey.__("device.fan."+ParamValue));
    });
    
    // register intesis_vaneud capability
    this.registerCapabilityListener("intesis_vaneud", async (ParamValue) => {
      //SET,acNum:function,value
      WMPDeviceConnect.call(this,'SET,' + unit_number + ':VANEUD,'+ParamValue);
      //console.log("Valeur vaneud:",this.homey.__("device.vaneud."+ParamValue))
      if (this.hasCapability("sensor_vaneud")) this.setCapabilityValue("sensor_vaneud", ParamValue);
    });
    
    // register intesis_vanelr capability
    this.registerCapabilityListener("intesis_vanelr", async (ParamValue) => {
      //SET,acNum:function,value
      WMPDeviceConnect.call(this,'SET,' + unit_number + ':VANELR,'+ParamValue);
      if (this.hasCapability("sensor_vanelr")) this.setCapabilityValue("sensor_vanelr", ParamValue);
    });
    
    // register target_temperature capability
    this.registerCapabilityListener("target_temperature", async (ParamValue) => {
      //SET,acNum:function,value
      WMPDeviceConnect.call(this,'SET,' + unit_number + ':SETPTEMP,'+ParamValue*10);
      this.setCapabilityValue("sensor_settemp", Number(ParamValue));
    });

    //Adjust the capabilities of the device added
    GetWMPDeviceCapabilities.call(this);
  }

  async setfanspeed(fanspeed) {
    //console.log('Set fan speed to '+fanspeed);
    this.triggerCapabilityListener("intesis_fanspeed", fanspeed)
    .then(console.log('Fan Speed modified'))
    .catch(error => console.log(error.message))
  }
   
  async setvaneud(vaneud) {
    //console.log('Set vane ud to '+vaneud);
    this.triggerCapabilityListener("intesis_vaneud", vaneud)
    .then(console.log('Vane ud modified'))
    .catch(error => console.log(error.message))
  }
   
  async setvanelr(vanelr) {
    //console.log('Set vane lr to '+vanelr);
    this.triggerCapabilityListener("intesis_vanelr", vanelr)
    .then(console.log('Vane lr modified'))
    .catch(error => console.log(error.message))
  }
   
  async setmode(mode) {
    //console.log('Set mode to '+mode);
    this.triggerCapabilityListener("intesis_mode", mode)
    .then(console.log('Mode modified'))
    .catch(error => console.log(error.message))
  }
   
  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
    //Adjust the capabilities of the device added
    //GetWMPDeviceCapabilities.call(this);
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');
    if (Number(newSettings.polling_rate) < 30 || Number(newSettings.polling_rate) > 86400) 
    {
      throw new Error(this.homey.__("settings.bad_polling_rate"));
    }
    //If polling rate has changed, cancel old polling and create a new one
    if (newSettings.polling_rate != oldSettings.polling_rate) {
      if (oldSettings.device_tricky == 'true' && newSettings.polling_rate < 60) {
        throw new Error(this.homey.__("settings.bad_polling_rate_devicetricky"));
      } else {
        clearInterval(PollingCronId);
        var new_polling_rate = newSettings.polling_rate * 1000;
        PollingCronId = setInterval(() => {
          GetWMPDeviceState.call(this);
        }, new_polling_rate); //every polling_rate seconds
      }
    }
    GetWMPDeviceState.call(this);
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
    if (DebugMode) {console.log("PollingCronId : ",PollingCronId)};
    clearInterval(PollingCronId);
  }

}

module.exports = MyDevice;
