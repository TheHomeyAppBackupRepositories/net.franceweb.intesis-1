'use strict';
const MyCommonFunctions = require("./common");
const DebugMode = MyCommonFunctions.DebugMode;
const Sleep = MyCommonFunctions.Sleep;
const Now = MyCommonFunctions.Now;
const WriteSettings = MyCommonFunctions.WriteSettings;

const OpenConDelay = 5000; //5 seconds
var DeviceTricky = false;

const Homey = require('homey');
const net = require ('node:net');
var $ReturnData;
var DeviceState = "";

function WMPDeviceConnect($Command) {

  var settings = this.getSettings();
  if (settings.ip_address == "Ex:192.168.0.xxx") {
    this.setUnavailable(this.homey.__("device.settings_empty"));
  } else {
    const intesis_ip = settings.ip_address
    const intesis_port = settings.ip_port
    const unit_number = settings.unit_number
    try 
    {
      //WriteSettings.call(this,"device_log", Now.call(this)+'#OPENCON');
      const client = net.createConnection({ host: intesis_ip, port: intesis_port }, () => {
        if (DebugMode) {console.log('Connected to server '+intesis_ip+':'+intesis_port)};
        if (DebugMode) {console.log('Sending Unit #' + unit_number + ' Commands '+$Command)};
        this.setAvailable().catch(this.error);
        //Close connexion after 5 seconds
        setTimeout(() => { client.end() }, OpenConDelay)
        //client.write($Command+'\r\n');
        //WriteSettings.call(this,"device_log", Now.call(this)+'#>'+$Command);
        $Command.split('/').forEach( ($Cmd) => {
          //WriteSettings.call(this,"device_log", Now.call(this)+'#>'+$Cmd);
          if (DebugMode) {console.log("Send Cmd : ",Now.call(this)+'#>'+$Cmd)};
          client.write($Cmd+'\r\n');
        });
      });
      
      client.on('error', (error) => {
        //WriteSettings.call(this,"device_log", Now.call(this)+'#'+error.code);
        if (DebugMode) {console.log('Error : ',error)};
        if (error.coce = 'ECONNREFUSED') 
        {
          console.log("Error:",error.code);
          console.log("$Command:",$Command);
          this.setUnavailable(this.homey.__("device.local_device_unreachable"));
        } else {
          this.setUnavailable(error.code);
        }
      });

      client.on('data', (data) => {
        //WriteSettings.call(this,"device_log", Now.call(this)+'#'+data);
        $ReturnData = data;
        //console.log("UseValue : ",$ReturnData.toString());
        UseWMPValues.call(this);
      });

      client.on('end', () => {
        if (DebugMode) {console.log('Disconnectd from server '+intesis_ip+':'+intesis_port)};
        //WriteSettings.call(this,"device_log", Now.call(this)+'#CLOSECON');
      }); 
    } 
    catch(error) 
    {
      //WriteSettings.call(this,"device_log", Now.call(this)+'#'+error.code);
      //$Message += '*** ERROR\n' + error + '\n[END]';
      //WriteSettings.call(this,"device_state", $Message);
      //Homey.alert(error)
      client.end();
    }
  };
};

function UseWMPValues() {
  if (DebugMode) {console.log('ReturnedData : ',$ReturnData.toString())};
  if ($ReturnData.toString().includes("LIMITS")) {
    //We have asked for LIMITS of the unit to upgrade or downgrades capabilities
    //Write them on device settings zone "device_capabilities"
    //WriteSettings.call(this,"device_capabilities", $ReturnData.toString().trimEnd());

    if (DebugMode) {console.log("LIMITS return :\n",$ReturnData.toString())};
    if (! $ReturnData.toString().includes("LIMITS:VANEUD")) {
      //No VANEUD Capability for this unit, remove device capabilities
      if (DebugMode) {console.log("Remove Capability for VANEUD")};
      this.removeCapability("intesis_vaneud")
      this.removeCapability("sensor_vaneud")
    }
    if (! $ReturnData.toString().includes("LIMITS:VANELR")) {
      //No VANELR Capability for this unit, remove device capability
      if (DebugMode) {console.log("Remove Capability for VANELR")};
      this.removeCapability("intesis_vanelr")
      this.removeCapability("sensor_vanelr")
    }
    $ReturnData.toString().split(/\r?\n/).forEach((LineContent,index) => {
      //LineContent = LIMITS:FANSP,[AUTO,1,2,3,4]
      if (DebugMode) {console.log('LineContent : ',LineContent)};
      let LineValues = LineContent.split(',[');
      //LineValues = LIMITS:FANSP / AUTO,1,2,3,4]
      if (LineValues.length < 2) { return; };
      const ParamName = LineValues[0].split(':')[1].toLowerCase();
      //ParamName = fansp
      const ParamValue = LineValues[1].replace("]", "").toLowerCase();
      //ParamValue = auto,1,2,3,4
      if (DebugMode) {console.log(ParamName+' : ',ParamValue)};
      //console.log(ParamName+' : ',ParamValue);
      switch (ParamName) {
        case "fansp":
          //below not working: can't adapt capabilities dynamically on code ???
          //const DeviceCapOptions = this.getCapabilityOptions("intesis_fansp");
          //this.capabilities.push('intesis_fanspeed')
          //this.capabilitiesOptions['intesis_fanspeed'] = {'title': {'en': 'Is offline'}}
          //const DeviceCapOptions = this.getCapabilities() //.getCapabilities()["intesis_fanspeed"];//("intesis_fansp");
          //console.log("DeviceCapOptions:",DeviceCapOptions['intesis_fanspeed']);
          break;
        }
    });
    return;
  } else {
    //Write brute values on device settings zone "device_state"
    //var DeviceState = "";
    //if ( ($ReturnData.toString().trim() != "ACK") && (! this.getSetting('device_tricky') == 'true') && ($ReturnData.toString().split(/\r?\n/).length <= 10) ) {
    if ( ($ReturnData.toString().trim() != "ACK") && (this.getSetting('device_tricky') != 'true') && ($ReturnData.toString().split(/\r?\n/).length <= 1) ) {
      //Device is tricky, it returns only one value at command GET,1:*
      //WriteSettings.call(this,"device_tricky", "true");
      console.log("Device FOUND tricky !");
    }
    $ReturnData.toString().split(/\r?\n/).forEach((LineContent,index) => {
      //LineContent = CHN,1:FANSP,2
      if (DebugMode) {console.log('LineContent : ',LineContent)};
      let LineValues = LineContent.split(',');
      //LineValues = CHN / 1:FANSP / 2
      if (LineValues.length < 3) { return; };
      const UnitNumber = LineValues[1].split(':')[0];
      //UnitNumber = 1
      if (DebugMode) {console.log('UnitNumber : ',UnitNumber)};
      if (UnitNumber == (this.getSetting('unit_number') ?? 1)) {
        const ParamName = LineValues[1].split(':')[1].toLowerCase();
        //ParamName = fansp
        const ParamValue = LineValues[2].toLowerCase();
        //ParamValue = 2
        if (DebugMode) {console.log(ParamName+':',ParamValue)};
        switch (ParamName) {
          case "onoff":
            this.setCapabilityValue("onoff", (ParamValue == "on")).catch(err => {console.log('Value error')});
            this.setCapabilityValue("sensor_power", (ParamValue == "on"));
            DeviceState += ParamName.toUpperCase() + ":" + ParamValue.toUpperCase() + "\r\n";
            break;
          case "mode":
            //CHN,1:MODE,COOL (heat, cool, off, auto)
              this.setCapabilityValue("intesis_mode", ParamValue);//.catch(err => {console.log('Value error')})
              this.setCapabilityValue("sensor_mode", this.homey.__("device.mode."+ParamValue));
              DeviceState += ParamName.toUpperCase() + ":" + ParamValue.toUpperCase() + "\r\n";
              break;
          case "fansp":
            //  CHN,1:FANSP,2
            this.setCapabilityValue("intesis_fanspeed", ParamValue);//.catch(err => {console.log('Value error')});
            this.setCapabilityValue("sensor_fan", this.homey.__("device.fan."+ParamValue));
            DeviceState += ParamName.toUpperCase() + ":" + ParamValue.toUpperCase() + "\r\n";
          case "vaneud":
            //  CHN,1:VANEUD,2
            if (this.hasCapability("intesis_vaneud")) {
              this.setCapabilityValue("intesis_vaneud", ParamValue).catch(err => {console.log('Value error')})
              DeviceState += ParamName.toUpperCase() + ":" + ParamValue.toUpperCase() + "\r\n";
            };
            if (this.hasCapability("sensor_vaneud")) {this.setCapabilityValue("sensor_vaneud", this.homey.__("device.vaneud."+ParamValue))};
            break;
          case "vanelr":
            //  CHN,1:VANELR,2
            if (this.hasCapability("intesis_vanelr")) {
              this.setCapabilityValue("intesis_vanelr", ParamValue).catch(err => {console.log('Value error')})
              DeviceState += ParamName.toUpperCase() + ":" + ParamValue.toUpperCase() + "\r\n";
            };
            if (this.hasCapability("sensor_vanelr")) {this.setCapabilityValue("sensor_vanelr", this.homey.__("device.vanelr."+ParamValue))};
            break;
          case "ambtemp":
            //CHN,1:AMBTEMP,261
            this.setCapabilityValue("measure_temperature", Number(ParamValue)/10);
            this.setCapabilityValue("sensor_ambtemp", Number(ParamValue)/10);
            DeviceState += ParamName.toUpperCase() + ":" + (Number(ParamValue)/10).toString().toUpperCase() + "\r\n";
            break;
          case "setptemp":
            //CHN,1:SETPTEMP,260
            //Some units go to setptemp at 32768 when in Fan mode, so don't consider setptemp if <0 or >100
            if ((Number(ParamValue)/10 >= 0) && (Number(ParamValue)/10 <= 100)) {
              this.setCapabilityValue("target_temperature", Number(ParamValue)/10);
              this.setCapabilityValue("sensor_settemp", Number(ParamValue)/10);
              DeviceState += ParamName.toUpperCase() + ":" + (Number(ParamValue)/10).toString().toUpperCase() + "\r\n";
            }
            break;
          default:
            //UNKNOWN
            DeviceState += "[TRASH]" + ParamName.toUpperCase() + ":" + ParamValue.toUpperCase() + "\r\n";
            //DeviceState += ParamName.toUpperCase() + " : " + "\r\n";
            break;
        };
      };
    });
    //console.log("DeviceState Fn:",DeviceState);
    //WriteSettings.call(this,"device_state", DeviceState.trim());
  }
};

function GetWMPDeviceState() {
  //console.log("--- DEBUT");
  DeviceState = "";
  //console.log("this.getSetting('device_tricky') : ", this.getSetting('device_tricky'));
  const unit_number = this.getSetting('unit_number') ?? 1;
  if (this.getSetting('device_tricky') == 'true') { 
    //Device is tricky, it returns only one value at command GET,1:*
    //console.log("GetWMPDeviceState : Device is tricky");
    //If polling rate is less than 1 minute, we adjust it to 1 minute
    if (this.getSetting('polling_rate') < 60) this.setSettings({"polling_rate": 60})
    //We now send each command individualy
    const $Capabilities = "ONOFF,MODE,FANSP,AMBTMP,SETPTEMP";//,VANEUD,VANELR"; //,ERRSTATUS,ERRCODE";
    var $Cmd = "";
    $Capabilities.split(',').forEach(($Capability) => {
      //console.log("State : "+$Capability);
      sleep(500); //Pause 0.5 seconds
      WMPDeviceConnect.call(this,'GET,' + unit_number + ':'+$Capability); 
      $Cmd += 'GET,' + unit_number + ':' + $Capability + '/';
    });
    //console.log("State : "+$Cmd.slice(0, -2));
    //WMPDeviceConnect.call(this,$Cmd.slice(0, -2)); //After 2 seconds
  } else {
    //console.log("GetWMPDeviceState : Device is NOT tricky");
    //console.log("State : "+'GET,1:*');
    WMPDeviceConnect.call(this,'GET,' + unit_number + ':*');
  }
  //console.log("--- FIN");
  //WriteSettings.call(this,"device_state", DeviceState.trim());
}

function GetWMPDeviceCapabilities() {
  WMPDeviceConnect.call(this,'LIMITS:*');
}

module.exports = { DeviceTricky, WMPDeviceConnect, GetWMPDeviceState, GetWMPDeviceCapabilities };

  /*
  Cmd : GET,acNum:function
  Ret : CHN,acNum:function,value
  Where
    • acNum corresponds to the AC unit we are controlling (only 1 possible)
    • function corresponds to the function monitored. It has to be one of the following:
      o ONOFF: Shows the AC unit On or Off
      o MODE: Shows the mode (heat, cool, fan, dry or auto)5
      o SETPTEMP: Shows the set point temperature
      o FANSP: Shows the fan speed 7
      o VANEUD: Shows the Up/Down vane position 7
      o VANELR: Shows the Left/Right vane position 7
      o AMBTMP: Shows the ambient temperature
      o ERRSTATUS: Shows if any error occurs. Responds is “OK” if there is not error, “ERR” if any error ocurrs. (Not available for INWMPUNI001I000)
      o ERRCODE: Shows the error code. (Not available for INWMPUNI001I000)
      o * : Show all previous function status
    • value corresponds to the current function value (check section 4 for detailed values)
  
  Exemple :
    > GET,1:MODE
    < CHN,1:MODE,AUTO

  Real :
    data :  
    CHN,1:ONOFF,ON
    CHN,1:MODE,COOL
    CHN,1:FANSP,2
    CHN,1:VANEUD,1
    CHN,1:SETPTEMP,260
    CHN,1:AMBTEMP,261
    CHN,1:ERRSTATUS,OK
    CHN,1:ERRCODE,0
  */

  /*
  Cmd : SET,acNum:function,value
  Ret : CHN,acNum:function,value
  Where
    • acNum corresponds to the AC unit we are controlling (only 1 possible)
    • function corresponds to the function monitored. It has to be one of the following:
      o ONOFF: Turns the AC unit On or Off
      o MODE: Sets the mode (heat, cool, fan, dry or auto)2
      o SETPTEMP: Sets the set point temperature 3
      o FANSP: Sets the fan speed 2
      o VANEUD: Sets the Up/Down vane position 2
      o VANELR: Sets the Left/Right vane position 2
    • value is the value that you want to apply to each function (check section 4 for detailed values).
  
  Exemple :
    < SET,1:ONOFF,ON
    < ACK
    < CHN,1:ONOFF,ON

  Real :
    data :  
  */

  /*
  Limits command to return limits of the unit
  LIMITS:*
    LIMITS:ONOFF,[OFF,ON]
    LIMITS:MODE,[AUTO,HEAT,DRY,FAN,COOL]
    LIMITS:FANSP,[1,2,3]
    LIMITS:SETPTEMP,[160,320]
  LIMITS:*
    LIMITS:MODE,[AUTO,HEAT,DRY,FAN,COOL]
    LIMITS:FANSP,[AUTO,1,2,3,4]
    LIMITS:VANEUD,[AUTO,SWING,PULSE]
    LIMITS:VANELR,[AUTO,SWING,PULSE]
    LIMITS:SETPTEMP,[180,300]
  */
