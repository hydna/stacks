(function () {
  var HYDNA_URL = "stacks.hydna.net/9999";
  var HEARTBEAT_INTERVAL = 15 * 1000; // 15 Sec
  var chan;
  var useruuid;
  var m;

  if ((m = /hydna_stacks_uuid\=([A-Za-z0-9\-]+)/.exec(document.cookie))) {
    useruuid = m[1];
  } else {
    useruuid = (function () {
        var S4 = function() {
           return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    })();
    document.cookie = "hydna_stacks_uuid=" + useruuid;
  }

  chan = new HydnaChannel(HYDNA_URL, 'w');

  chan.onopen = function(e) {
    function send () {
      try {
        chan.send(useruuid + " " + document.location.pathname, 2);
      } catch (err) {
        // just ignore...
      }
    }
    setInterval(send, HEARTBEAT_INTERVAL);
    send();
  };

  // Ignore any errors, we are just here to shoooot....

})();