'use strict';

const DebugMode = true;

const Homey = require('homey');

function Sleep(ms) {
  //return new Promise(resolve => setTimeout(resolve, ms));
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < ms);
}

async function WriteSettings(SettingName,SettingValue) {
  try {
    const $Now = Now.call(this);
    switch (SettingName) {
      case "device_capabilities":
        SettingValue = '#' + $Now + '#\n' + SettingValue;
        await this.setSettings({"device_capabilities": SettingValue})
        break;
      case "device_state":
        SettingValue = '#' + $Now + '#\n' + SettingValue;
        await this.setSettings({"device_state": SettingValue})
        break;
      case "device_log":
        var $DeviceLogFull = await this.getSetting("device_log");
        $DeviceLogFull += SettingValue + " ";
        await this.setSettings({"device_log": $DeviceLogFull.slice(-2000)})
        break;
      case "device_tricky":
        await this.setSettings({"device_tricky": SettingValue})
        break;
      default:
        SettingValue = '#' + $Now + '#\n' + SettingValue;
        await this.setSettings({"device_state": SettingName})
        break;
      }
  } catch (error) {console.log("Error:",error)}
}

function Now() {
  //let $TimeZone = this.homey.clock.getTimezone();
  var $date = new Date();
  var $DateString = $date.getUTCFullYear().toString().slice(-2) + 
      ("0" + ($date.getUTCMonth()+1)).slice(-2) + 
      ("0" + $date.getUTCDate()).slice(-2) + 
      ("0" + $date.getUTCHours()).slice(-2) + 
      ("0" + $date.getUTCMinutes()).slice(-2) + 
      ("0" + $date.getUTCSeconds()).slice(-2);
  return $DateString;
}

module.exports = { DebugMode, Sleep, Now, WriteSettings };
