/* LibreSpeed browser adapter for the ZapSpeed Next.js frontend. */
function Speedtest() {
  this._settings = {};
  this._selectedServer = null;
  this._state = 0;
}

Speedtest.prototype = {
  constructor: Speedtest,
  getState: function() {
    return this._state;
  },
  setParameter: function(parameter, value) {
    if (this._state === 3) throw "You cannot change settings while running the test";
    this._settings[parameter] = value;
  },
  setSelectedServer: function(server) {
    if (this._state === 3) throw "You can't select a server while the test is running";
    if (server.server.charAt(server.server.length - 1) !== "/") server.server += "/";
    if (server.server.indexOf("//") === 0) server.server = location.protocol + server.server;
    this._selectedServer = server;
    this._state = 2;
  },
  start: function() {
    if (this._state === 3) throw "Test already running";
    if (!this._selectedServer) throw "No LibreSpeed server selected";
    this.worker = new Worker("/speedtest_worker.js?r=" + Math.random());
    this.worker.onmessage = function(event) {
      const data = JSON.parse(event.data);
      if (this.onupdate) this.onupdate(data);
      if (data.testState >= 4) {
        clearInterval(this.updater);
        this._state = 4;
        if (this.onend) this.onend(data.testState === 5);
      }
    }.bind(this);
    this.updater = setInterval(function() {
      this.worker.postMessage("status");
    }.bind(this), 200);
    this._settings.url_dl = this._selectedServer.server + this._selectedServer.dlURL;
    this._settings.url_ul = this._selectedServer.server + this._selectedServer.ulURL;
    this._settings.url_ping = this._selectedServer.server + this._selectedServer.pingURL;
    this._settings.url_getIp = this._selectedServer.server + this._selectedServer.getIpURL;
    this._settings.telemetry_extra = JSON.stringify({ server: this._selectedServer.name });
    this._state = 3;
    this.worker.postMessage("start " + JSON.stringify(this._settings));
  },
  abort: function() {
    if (this._state < 3) throw "You cannot abort a test that's not started yet";
    if (this._state < 4) this.worker.postMessage("abort");
  }
};
