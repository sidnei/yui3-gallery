	/**
	 * gallery-io-poller - A utility to smartly poll (via XHR requests) a resource on the server.
	 * http://925html.com/code/smart-polling/
	 * 
	 * Oddnut Software
	 * Copyright (c) 2009 Eric Ferraiuolo - http://eric.ferraiuolo.name
	 * YUI BSD License - http://developer.yahoo.com/yui/license.html
	 */
	
	/**
	 * Create a poller to continually ask a server if a resource has been modified.
	 * 
	 * @module poller
	 * @requires io-base, base
	 */
	
	var Poller,
		POLLER = 'poller',
		
		INTERVAL = 'interval',
		URI = 'uri',
		IO_CONFIG = 'ioConfig',
		POLLING = 'polling',
		
		IF_NONE_MATCH = 'If-None-Match',
		If_MODIFIED_SINCE = 'If-Modified-Since',
		
		E_MODIFIED = 'io:modified',
		
		isString = Y.Lang.isString,
		isNumber = Y.Lang.isNumber,
		isObject = Y.Lang.isObject;
	
	/**
	 * Create a polling task to continually check the server at the specified interval for updates of a resource at a URI.
	 * The poller will use conditional GET requests and notify the client via Events when the resource has changed.
	 * 
	 * @class Poller
	 * @extends Base
	 * @param {Object} config Configuration Object
	 * @constructor
	 */
	Poller = function (config) {
		
		Poller.superclass.constructor.apply( this, arguments );
	};
	
	Y.mix( Poller, {
		
		/**
		 * The identity of the component.
		 * 
		 * @property Poller.NAME
		 * @type String
		 * @static
		 */
		NAME : POLLER,
		
		/**
		 * Static property used to define the default attribute configuration of
		 * the component.
		 *
		 * @property Poller.ATTRS
		 * @type Object
		 * @static
		 */
		ATTRS : {
			
			/**
			 * The time in milliseconds for which the component should send a request to the server.
			 * 
			 * @attribute interval
			 * @type Number
			 */
			interval : {
				validator : isNumber
			},
			
			/**
			 * The URI of the resource which the component will check for modifications.
			 * 
			 * @attribute uri
			 * @type String
			 */
			uri : {
				validator : isString,
				writeOnce : true
			},
			
			/**
			 * The configuration sent along with each IO XHR request.
			 * 
			 * @attribute ioConfig
			 * @type Object
			 */
			ioConfig : {
				validator : isObject,
				writeOnce : true
			},
			
			/**
			 * A read-only attribute the client can check to see if the component is actively polling the server.
			 * 
			 * @attribute polling
			 * @type Boolean
			 * @default false
			 * @final
			 */
			polling : {
				value : false,
				readOnly : true
			}
			
		}
		
	});
	
	Y.extend( Poller, Y.Base, {
		
		/**
		 * Reference to the timer object that's polling the server.
		 * 
		 * @property _timer
		 * @type Y.later
		 * @protected
		 */
		_timer : null,
		
		/**
		 * Time of the last request was sent.
		 * 
		 * @property _txTime
		 * @type Number
		 * @protected
		 */
		_txTime : null,
		
		/**
		 * active IO transaction Object
		 * 
		 * @property _activeTx
		 * @type Object
		 * @protected
		 */
		_activeTx : null,
		
		/**
		 * Last-Modified date of the resource that the server returned, used to determine if the resource has changed.
		 * 
		 * @property _modifiedDate
		 * @type String
		 * @protected
		 */
		_modifiedDate : null,
		
		/**
		 * Etag of the resource returned by the server, used to determine if the resource has changed.
		 * 
		 * @property _etag
		 * @type String
		 * @protected
		 */
		_etag : null,
		
		/**
		 * Construction of the component linking up and publishing event during initialization.
		 * 
		 * @method initializer
		 * @param {Object} config Configuration Object
		 * @protected
		 */
		initializer : function (config) {
			
			/**
			 * Signals that the resource the component is pulling the server for has been modified.
			 * This is the interesting event for the client to subscribe to.
			 * The subscriber could, for example, update the UI in response to this event, poller:modified.
			 * 
			 * @event io:modified
			 * @param {Number} txId Y.io Transaction ID
			 * @param {Object} r Y.io Response Object
			 * @param {MIXED} args Arguments passed to response handler
			 */
			
			this._timer = null;
			this._txTime = null;
			this._activeTx = null;
			this._modifiedDate = null;
			this._etag = null;
		},
		
		/**
		 * Destruction of the component. Stops polling and removes event internal listeners.
		 * 
		 * @method destructor
		 * @protected
		 */
		destructor : function () {
			
			this.stop();
			this._modifiedDate = null;
			this._etag = null;
		},
		
		/**
		 * Starts the polling task, the poller:start event is fired as a result of calling this method.
		 * A request will be sent to the server right at the time of calling this method;
		 * continued by sending subsequent requests at the set interval.
		 * If the pause method has been called, calling start will clear the pause.
		 * 
		 * @method start
		 */
		start : function () {
			
			if ( ! this.get(POLLING)) {
				this._sendRequest();
				this._set(POLLING, true);
			}
		},
		
		/**
		 * Stops the polling task, the poller:stop event is fired.
		 * If the paused method has been called, calling start will clear the pause.
		 * 
		 * @method stop
		 */
		stop : function () {
			
			if (this._activeTx) {
				this._activeTx.abort();
				this._activeTx = null;
			}
			
			if (this._timer) {
				this._timer.cancel();
				this._timer = null;
			}
			
			this._txTime = null;
			
			this._set(POLLING, false);
		},
		
		/**
		 * Sends the XHR request to the server at the given URI (resource).
		 * This is method is call at the set interval while polling.
		 * 
		 * @method sendRequest
		 * @protected
		 */
		_sendRequest : function () {
			
			var ioConfig = this.get(IO_CONFIG),
				headers = {},
				config;
				
			if (this._etag) {
				headers[IF_NONE_MATCH] = this._etag;
			}
			if (this._modifiedDate) {
				headers[If_MODIFIED_SINCE] = this._modifiedDate;
			}
			
			config = Y.merge(ioConfig, {
				
				headers	: headers,
				context	: this,
				on		: Y.merge(ioConfig, {
					
					start		: this._defStartHandler,
					complete	: this._defCompleteHandler,
					success		: this._defSuccessHandler,
					modified	: this._defModifiedHandler
					
				})
				
			});
			
			this._activeTx = Y.io(this.get(URI), config);
		},
		
		/**
		 * Sets the txTime and calls the config's on.start handler.
		 * 
		 * @method _defStartHandler
		 * @param {Number} txId Y.io Transaction ID
		 * @param {MIXED} args Arguments passed to handlers
		 * @protected
		 */
		_defStartHandler : function (txId, args) {
			
			var config = this.get(IO_CONFIG);
			
			this._txTime = new Date().getTime();
			
			if (config && config.on && config.on.start) {
				config.on.start.apply(config.context || Y, arguments);
			}
		},
		
		/**
		 * Schedules the next transaction and calls the config's on.complete handler.
		 * 
		 * @method _defCompleteHandler
		 * @param {Number} txId Y.io Transaction ID
		 * @param {Object} r Y.io Response Object
		 * @param {MIXED} args Arguments passed to handlers
		 * @protected
		 */
		_defCompleteHandler : function (txId, r, args) {
			
			var config = this.get(IO_CONFIG),
				deltaT = this._txTime ? (new Date()).getTime() - this._txTime : 0;
			
			this._timer = Y.later(Math.max(this.get(INTERVAL) - deltaT, 0), this, this._sendRequest);
			
			if (config && config.on && config.on.complete) {
				config.on.complete.apply(config.context || Y, arguments);
			}
		},
		
		/**
		 * Chains to the modified callback and calls the config's on.success handler.
		 * 
		 * @method _defSuccessHandler
		 * @param {Number} txId Y.io Transaction ID
		 * @param {Object} r Y.io Response Object
		 * @param {MIXED} args Arguments passed to handlers
		 * @protected
		 */
		_defSuccessHandler : function (txId, r, args) {
			
			var config = this.get(IO_CONFIG);
			
			if (config && config.on && config.on.success) {
				config.on.success.apply(config.context || Y, arguments);
			}
			
			this._defModifiedHandler.apply(this, arguments);
		},
		
		/**
		 * Caches Etag and Last-Modified sent back from the server and calls the config's on.modified handler.
		 * 
		 * @method _defModifiedHandler
		 * @param {Number} txId Y.io Transaction ID
		 * @param {Object} r Y.io Response Object
		 * @param {MIXED} args Arguments passed to handlers
		 * @protected
		 */
		_defModifiedHandler : function (txId, r, args) {
			
			var config = this.get(IO_CONFIG);
			
			this._etag = r.getResponseHeader('Etag');
			this._modifiedDate = r.getResponseHeader('Last-Modified');
			
			Y.fire(E_MODIFIED, txId, r);
			
			if (config && config.on && config.on.modified) {
				config.on.modified.apply(config.context || Y, arguments);
			}
		}
		
	});
	
	Y.mix(Y.io, {
		
		poll: function (interval, uri, config) {
			return new Poller({
				interval	: interval,
				uri			: uri,
				ioConfig	: config
			});
		}
		
	}, true);
	