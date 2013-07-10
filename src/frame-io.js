;(function(exports) {
  var FrameIO = {},
      Channel,

      packetPrefix = '!FRAMEIO!',
      encode = JSON.stringify,
      decode = JSON.parse;

  /* FrameIO TODO's:
  *   1) Implement FrameIO.channels = {}
  *      Prevent channels to same origin to prevent redundant events
  *   2) Allow multiple event listeners with same name
  *   3) Clean up callbacks after invoking 
  *   4) Allow optional data to be passed into .request()
  *   5) Allow unique packet prefix to be defiend in options 
  *   6) Add ack/readyState to FIO instances with 1 to 1 relationships
 */

  //TODO: Open up helper method to window so outside postMEssage apis can use to determine source of packet
  FrameIO.isOwn = function(data) {
  
  };

  FrameIO.Channel = Channel = function(frame, options) {
    var self = this; // so lame
    this.endpoint = frame; // Perhaps call it target insead?
    this.listeners = {};
    this.callbacks = {};
    this.responders = {};
    window.addEventListener('message', function(event) {
      postMessageHandler.call(self, event); 
    }, false);
  }


  Channel.prototype.on = function(event, callback) {
    this.listeners[event] = callback;
  };


  Channel.prototype.emit = function(event, data) {
    this.endpoint.postMessage(buildPayload(event, data), '*');
  };

  /*
    Data Structure:
    {
      event : 'evtName',
      data : {}
    }
  */


  Channel.prototype.request = function(event, data, func, context) {
    var aGuid = guid(),
        payload = buildRequestPayload(event, data, aGuid);

    this.endpoint.postMessage(payload, '*');
    if ( context ) {
      func = bind(func, context);
    }
    this.callbacks[aGuid] = func;
  };


  Channel.prototype.respond = function(event, callback) {
    this.responders[event] = callback;
  };

  /* Helper Methods */

  function log() {
    // TODO: Add logging level
   // console.log(arguments);
  }

  function postMessageHandler(e) {
    // TODO: Auth/security layer needed
    // Break up funcs into separate handlers 
    var data = parseData(e.data || {});
    if ( data ) {
      if ( data.event ) {
        log('Received message event', data);
        if ( this.listeners.hasOwnProperty(data.event) ) {
          this.listeners[data.event].call(this, data.data);
        }
      }
      else if ( data.request ) {
        if ( this.responders.hasOwnProperty(data.request) ) {
          // Evaluate responder
          var response = this.responders[data.request].call(this, data.data);
          // Only send response if response returns something
          if ( response !== undefined ) {
            this.endpoint.postMessage(buildResponsePayload(data.guid, response), '*');
          }
        }
        else {
          //Respond with an error
        }
      }
      else if ( data.callback ) {
        if ( this.callbacks.hasOwnProperty(data.callback) ) {
          this.callbacks[data.callback].call(this, data.data);
        }
      }
    }
  }

  /* TODO:
  *  Consolidate payload funcs into one function 
  *  Add 'type' key with types 'emit', 'request', 'respond'
  */

  function buildPayload(eventName, data) {
    return encodeData({ 
      'event' : eventName,
      'data'  : data
    });
  }
  
  function buildRequestPayload(reqName, data, guid) {
    return encodeData({ 
      'request' : reqName,
      'data'    : data,
      'guid'    : guid
    });
  }

  function buildResponsePayload(guid, data) {
    return encodeData({ 
      'callback' : guid,
      'data'    : data
    });
  }


  function parseData(data) {
    if ( data.search(packetPrefix) != -1 ) {
      data = data.split(packetPrefix)[1];
      return decode(data);
    }
    else {
      return false;
    }
  }

  function encodeData(data) {
    return packetPrefix + encode(data);
  }

  function bind(func, context) {
    return function() {
      func.apply(context, arguments);
    }
  }

  function guid() {
    var S4 = function () {
      return Math.floor( Math.random() * 0x10000 ).toString(16);
    };
    return (
      S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4()
    );
  }

  exports.FrameIO = FrameIO;
  
})(window);

