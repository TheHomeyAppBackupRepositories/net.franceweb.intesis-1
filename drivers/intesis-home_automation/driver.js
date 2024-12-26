'use strict';
const MyCommonFunctions = require("../common");
const DebugMode = MyCommonFunctions.DebugMode;

const Homey = require('homey');

class Driver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');

    const cardActionSetfanspeed = this.homey.flow.getActionCard('intesis-wmp-set-fanspeed');
    cardActionSetfanspeed.registerRunListener(async (args) => {
      args.device.setfanspeed(args.speed);
    })
    const cardActionSetmode = this.homey.flow.getActionCard('intesis-wmp-set-mode');
    cardActionSetmode.registerRunListener(async (args) => {
      args.device.setmode(args.mode);
    })

  }

  /**
   * onPair is called when a Paring session is initiated.
   */
  async onPair(session) {
    var devices = this.getDevices();

    session.setHandler("device_exists", async function (ip_address) {
      var found = false;
      var found_name = "";
      var found_zone = "";
      devices.forEach ( function(device) {
        if (DebugMode) {console.log("device name:",device.getName())};
        if (DebugMode) {console.log("device ip:",device.getSetting("ip_address"))};
        if (device.getSetting("ip_address") === ip_address) {
          found = true;
          found_name = device.getName();
         return;
        }
      })
      if (DebugMode && found) {console.log("Un périphérique existe déjà avec ces paramètres : '"+found_name+"'")};
      return {"found": found, "found_name": found_name, "found_zone": found_zone};
    });

  }

  
}

module.exports = Driver;
