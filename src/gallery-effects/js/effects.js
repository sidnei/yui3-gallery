YUI().add("gallery-effects", function (Y) {

	var L = Y.Lang,
	
	AnimQueues = {
		instances: {},
		
		get: function (key) {
			if (!L.isString(key)) return key;
			
			if (!this.instances[key]) {
				this.instances[key] = new Y.AsyncQueue();
			}
			
			return this.instances[key];
		}
	};
	
	GlobalQueue = AnimQueues.get("global"),

	// Helper method to handle the fact that getting the region of a display:none element won't work.	
	getHeightAndWidthRegardlessOfDisplay = function (node) {
		if (node.getStyle("display") !== "none") {
			return [node.get("clientWidth"), node.get("clientHeight")];
		}
		
		var originalVisibility = node.getStyle("visibility"),
			originalPosition = node.getStyle("position"),
			originalDisplay = node.getStyle("display"),
			hw;
		
		node.setStyles({
			visibility: "hidden",
			position: "absolute",
			display: "block"
		});
		xxx = node;
		hw = [node.get("clientWidth"), node.get("clientHeight")];
		
		node.setStyles({
			visibility: originalVisibility,
			position: originalPosition,
			display: originalDisplay
		});
		
		return hw;
	},
	
	_makeClipping = function (node) {
		if (node._overflow) return node;
		
		node._oveflow = node.getStyle("overflow") || "auto";
		
		if (node._overflow !== "hidden") {
			node.setStyle("overflow", "hidden");
		}
	},
	
	_undoClipping = function (node) {
		if (!node._overflow) return node;
		
		node.setStyle("overflow", node._overflow === "auto" ? "" : node._overflow);
		node._overflow = null;
		
		return node;
	};
	
	
	
	
	
	
	Y.mix(Y.DOM, {
		show: function (node) {
			Y.DOM.setStyle(node, "display", "");
		},
		
		hide: function (node) {
			Y.DOM.setStyle(node, "display", "none");
		},
		
		displayed: function (node) {
			return Y.DOM.getStyle(node, "display") !== "none";
		},
		
		toggle: function (node) {
			Y.DOM[Y.DOM.displayed(node) ? "hide" : "show"](node);
		}
	});
	
	Y.Node.importMethod(Y.DOM, [
		/**
	     * Display a node.
	     *
	     * @method show
	     * @chainable
	     */
		"show",
		
		/**
	     * Hide a node.
	     *
	     * @method hide
	     * @chainable
	     */
		"hide",
		
		/**
	     * Check is a node is being shown. Specifically not called "visible"
	     * so as not to confuse it with the visibility property.
	     *
	     * @method displayed
	     * @return boolean
	     */
		"displayed",
		
		/**
	     * Toggle the display of an element.
	     *
	     * @method toggle
	     * @chainable
	     */
		"toggle"
	]);
	
	var Effects = {};
	
	/***
	 * 
	 * @class Y.Effects.Base
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Base = function (config) {
		Effects.Base.superclass.constructor.apply(this, arguments);
	};
	
	Effects.Base.NAME = "base";
	
	Effects.Base.ATTRS = {
		scope: {
			value: "global",
			validator: L.isString
		},
		
		wait: {
			value: true,
			validator: L.isBoolean
		},
		
		queue: {
			value: true,
			validator: L.isBoolean
		},
		
		anim: {
			validator: function (v) {
				return L.isArray(v) || v instanceof Y.Anim;
			}
		},
		
		node: {
			writeOnce: true,
			validator: function (v) {
				return v instanceof Y.Node;
			}
		},
		
		config: {
			validator: L.isObject
		}
	};
	
	Y.extend(Effects.Base, Y.Base, {
		initializer: function (config) {
		
			this.set("config", config);
			this.set("node", Y.one(config.node));
			
			this.publish("beforeSetup", { defaultFn: this._defaultBeforeSetupFn });
			this.publish("afterSetup", { defaultFn: this._defaultAfterSetupFn });
			this.publish("beforeStart", { defaultFn: this._defaultBeforeStartFn });
			this.publish("end", { defaultFn: this._defaultEndFn });
		
		
			// Put it in the queue if we're supposed to.
			if (this.get("queue")) {
				this.addToQueue();
			}
		},
		
		setup: function () {},
		
		addToQueue: function () {
			var queue = this._getQueue();
				
			queue.add({
				fn: this.run,
				context: this,
				autoContinue: !this.get("wait")
			});
			
			if (!queue.isRunning()) {
				queue.run();
			}
		},
		
		run: function () {
			
			this.fire("beforeSetup");
			this.setup();
			this.fire("afterSetup");
			
			this.fire("beforeStart");
			
			var anim = this.get("anim");
			
			if (L.isArray(anim)) {
				anim[anim.length - 1].on("end", function () { this.fire("end"); }, this);
				
				Y.Array.each(anim, function (a) { a.run(); });
			} else {
				anim.on("end", function () { this.fire("end"); }, this);
				anim.run();
			}
		},
		
		_getQueue: function () {
			return AnimQueues.get(this.get("scope"));
		},
		
		_defaultBeforeSetupFn: function () {},

		_defaultAfterSetupFn: function () {},

		_defaultBeforeStartFn: function () {},
		
		_defaultEndFn : function () {}
	});
	
	/***
	 * 
	 * @class Y.Effects.Parallel
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Parallel = function (config) {
		Effects.Parallel.superclass.constructor.apply(this, arguments);
	};
	
	Effects.Parallel.NAME = "parallel";
	
	Effects.Parallel.ATTRS = {
		effects: {
			value: [],
			validator: L.isArray
		}
	};
	
	Y.extend(Effects.Parallel, Effects.Base, {
		
		run: function () {
			this.fire("beforeStart");
			
			var effects = this.get("effects"),
				config = this.get("config"),
				node = this.get("node");
			
			
			// Don't need this anymore.
			delete config.effects;

			if (effects.length) {
				effects[effects.length - 1].on("end", function () { this.fire("end"); }, this);
				
				Y.Array.each(effects, function (effect) {
					effect.set("node", node);
					effect.set("config", Y.merge(effect.get("config"), config));
					effect.run();
				});
			} else {
				this.fire("end");
			}
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Opacity
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Opacity = function (config) {
		Effects.Opacity.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Effects.Opacity, Effects.Base, {
		
		_defaultBeforeStartFn: function () {
			var config = this.get("config"),
				node = this.get("node");
				
				config.from = {
					opacity: config.from !== undefined ? config.from : node.getStyle("opacity") || 0.0
				};

				config.to = {
					opacity: config.to !== undefined ? config.to : 1.0
				}

			this.set("anim", new Y.Anim(config));
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Move
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Move = function (config) {
		Effects.Move.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Effects.Move, Effects.Base, {
		
		_defaultBeforeStartFn: function(){
			var config = this.get("config");
			
			config.to = {
				xy: [config.x, config.y]
			};
			
			this.set("anim", new Y.Anim(config));
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Morph
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Morph = function (config) {
		Effects.Morph.superclass.constructor.apply(this, arguments);
	};
	
	Effects.Morph.NAME = "morph";
	
	Y.extend(Effects.Morph, Effects.Base, {

		_defaultBeforeStartFn: function () {
			this.set("anim", new Y.Anim(this.get("config")));
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Scale
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Scale = function (config) {
		Effects.Scale.superclass.constructor.apply(this, arguments);
		
		this.on("end", function () {
			if (this.get("restoreAfterFinish")) this.get("node").setStyles(this._originalStyle);
		});
	};
	
	Effects.Scale.NAME = "scale";
	
	Effects.Scale.ATTRS = {
		scaleX: {
			value: true,
			validator: L.isBoolean
		},
		
		scaleY: {
			value: true,
			validator: L.isBoolean
		},
		
		scaleContent: {
			value: true,
			validator: L.isBoolean
		},
		
		scaleFromCenter: {
			value: false,
			validator: L.isBoolean
		},
		
		scaleMode: {
			value: "box" // 'box' or 'contents' or { } with provided values
		},
		
		scaleFrom: {
			value: 100.0,
			validator: L.isNumber
		},
		
		scaleTo: {
			value: 200.0,
			validator: L.isNumber
		},
		
		restoreAfterFinish: {
			value: false,
			validator: L.isBoolean
		}
	};
	
	Y.extend(Effects.Scale, Effects.Base, {

		_originalStyle: {},

		_defaultBeforeStartFn: function () {
			
			var config = this.get("config"),
		    	node = this.get("node"),
				
				scaleX = this.get("scaleX"),
				scaleY = this.get("scaleY"),
				scaleContent = this.get("scaleContent"),
				scaleFromCenter = this.get("scaleFromCenter"),
				scaleMode = this.get("scaleMode"),
				scaleFrom = this.get("scaleFrom"),
				scaleTo = this.get("scaleTo"),
				restoreAfterFinish = this.get("restoreAfterFinish"),
				
				elementPositioning = node.getStyle("position"),
				originalXY = node.getXY(),
				fontSize = node.getStyle("fontSize") || "100%",
				fontSizeType,
				dims;
					
		    Y.Array.each(["top", "left", "width", "height", "fontSize"], Y.bind(function(k) {
				this._originalStyle[k] = node.getStyle(k);
		    }, this));
				
			Y.Array.each(["em", "px", "%", "pt"], function(type) {
				if (fontSize.toString().indexOf(type) > 0) {
					fontSize = parseFloat(fontSize);
					fontSizeType = type;
				}
			});
				
			if (scaleMode === "box") {
				dims = [node.get("offsetHeight"), node.get("offsetWidth")];
			
			} else if (/^content/.test(scaleMode)) {
				dims = [node.get("scrollHeight"), node.get("scrollWidth")];
			
			} else {
				dims = [scaleMode.originalHeight, scaleMode.originalWidth];
			}
	
			// Build out the to and from objects that we're going to pass to the animate utility.
			var to = {}, from = {},
				toScaleFraction = scaleTo/100.0,
				fromScaleFraction = scaleFrom/100.0,
				fromWidth = dims[0] * fromScaleFraction,
				fromHeight = dims[1] * fromScaleFraction,
				toWidth = dims[0] * toScaleFraction,
				toHeight = dims[1] * toScaleFraction;
			
			if (scaleContent && fontSize) {
				from.fontSize = fontSize * fromScaleFraction + fontSizeType;
				to.fontSize = fontSize * toScaleFraction + fontSizeType;
			}
			
			if (scaleX) {
				from.width = fromWidth + "px";
				to.width = toWidth + "px";
			}
			
			if (scaleY) {
				from.height = fromHeight + "px";
				to.height = toHeight + "px";
			}
			
			if (scaleFromCenter) {
				var fromTop = (fromHeight - dims[0]) / 2,
					fromLeft = (fromWidth - dims[1]) / 2,
					toTop = (toHeight - dims[0]) / 2,
					toLeft = (toWidth - dims[1]) / 2;
			    
				if (elementPositioning === "absolute") {
					if (scaleY) {
						from.top = (originalXY[1] - fromTop) + "px";
						to.top = (originalXY[1] - toTop) + "px";
					}
					
					if (scaleX) {
						from.left = (originalXY[0] - fromLeft) + "px";
						to.left = (originalXY[0] - toLeft) + "px";
			    	}
				} else {
					if (scaleY) {
						from.top = -fromTop + "px";
						to.top = -toTop + "px";
					}
					
					if (scaleX) {
						from.left = -fromLeft + "px";
						to.left = -toLeft + "px";
					}
				}
			}
			
			config.to = to;
			config.from = from;
			
			this.set("anim", new Y.Anim(config));
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Highlight
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Highlight = function (config) {

		if (Y.one(config.node).getStyle("display") === "none") {
			return;
		}
		
		Effects.Highlight.superclass.constructor.apply(this, arguments);
	};
	
	Effects.Highlight.NAME = "highlight";
	
	Effects.Highlight.ATTRS = {
		startcolor: {
			value: "#ff9",
			validator: L.isString
		},
		
		endcolor: {
			value: "#fff",
			validator: L.isString
		},
		
		restorecolor: {
			valueFn: function () {
				this.get("node").getStyle("backgroundColor");
			},
			validator: L.isString
		}
	};
	
	Y.extend(Effects.Highlight, Effects.Base, {

		_previousBackgroundImage: "",	

		_defaultBeforeStartFn: function () {
			var config = Y.merge({
					iterations: 1,
					direction: "alternate"
				}, this.get("config")),
				node = this.get("node");
			
			this._previousBackgroundImage = node.getStyle("backgroundImage");
		
			config.from = { backgroundColor: this.get("startcolor") },
			config.to = { backgroundColor: this.get("endcolor") };
			
			node.setStyle("backgroundImage", "none");
			
			this.set("anim", new Y.Anim(config));
		},
		
		_defaultEndFn: function () {
			this.get("node").setStyles({
				backgroundImage: this._previousBackgroundImage,
				backgroundColor: this.get("restoreColor")
			});
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Puff
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Puff = function (config) {
		
		config.effects = [
			new Effects.Scale({ queue: false, scaleTo: 200, scaleFromCenter: true, scaleContent: true, restoreAfterFinish: true }),
			new Effects.Opacity({ queue: false, to: 0.0 })
		];
		
		config = Y.merge({
			duration: 1.0
		}, config);
		
		Effects.Puff.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Effects.Puff, Effects.Parallel, {
		
		_oldStyle: {},
		
		_defaultBeforeStartFn: function () {
			var node = this.get("node");
			
			this._oldStyles = {
			    opacity: node.getStyle("opacity"),
			    position: node.getStyle("position"),
			    top: node.getStyle("top"),
			    left: node.getStyle("left"),
			    width: node.getStyle("width"),
			    height: node.getStyle("height")
			};
			
		    if (node.getStyle("position") !== "absolute") {
				var xy = node.getXY();

				node.setStyles({
					position: "absolute",
					top: xy[1] + "px",
					left: xy[0] + "px",
					width: node.get("clientWidth") + "px",
					height: node.get("clientHeight") + "px"
				});
			}
		},
		
		_defaultEndFn: function () {
			this.get("node").hide().setStyles(this._oldStyles);
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Appear
	 * @param config {Object} has of configuration name/value pairs
	 */  	
	Effects.Appear = function (config) {
		var node = Y.one(config.node),
			startOpacity = !node.displayed() ? 0.0 : node.getStyle("opacity") || 0.0;
		
		config.effects = [
			new Y.Effects.Opacity({ queue: false, from: startOpacity, to: 1.0 })
		];
		
		Effects.Appear.superclass.constructor.apply(this, arguments);
		
		this._startOpacity = startOpacity;
	};
	
	Y.extend(Effects.Appear, Effects.Parallel, {
		
		_startOpacity: 0.0,
		
		_defaultBeforeStartFn: function () {
			this.get("node").setStyle("opacity", this._startOpacity).show();			
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Fade
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Fade = function (config) {
		var oldOpacity = Y.one(config.node).getStyle("opacity");

		config.effects = [
			new Y.Effects.Opacity({ queue: false, from: oldOpacity || 1.0, to: 0.0 })
		];
		
		Effects.Fade.superclass.constructor.apply(this, arguments);
		
		this._oldOpacity = oldOpacity;
	};
	
	Y.extend(Effects.Fade, Effects.Parallel, {
		
		_oldOpacity: 1.0,
		
		_defaultEndFn: function () {
			this.get("node").hide().setStyle("opacity", this._oldOpacity);			
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.BlindUp
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.BlindUp = function (config) {
		config.effects = [
			new Y.Effects.Scale({ queue:false, scaleTo: 0, scaleX: false, restoreAfterFinish: true })
		];
		
		Effects.BlindUp.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Effects.BlindUp, Effects.Parallel, {
		
		_defaultEndFn: function () {
			_undoClipping(this.get("node").hide());
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.BlindDown
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.BlindDown = function (config) {
		var hw = getHeightAndWidthRegardlessOfDisplay(Y.one(config.node));
		
		config.effects = [
			new Y.Effects.Scale(Y.merge({
				queue:false,
				scaleTo: 100,
				scaleContent: false,
				scaleX: false,
				scaleFrom: 0,
				scaleMode: { originalHeight: hw[1], originalWidth: hw[0] },
				restoreAfterFinish: true
			}))
		];
		
		Effects.BlindDown.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Effects.BlindDown, Effects.Parallel, {
		
		_defaultBeforeStartFn: function () {
			_makeClipping(this.get("node"));
			this.get("node").setStyle("height", "0px").show();
		},
		
		_defaultEndFn: function () {
			_undoClipping(this.get("node"));
		}
	});
	
	Y.Effects = Effects;
	
	return;
	
	/*********************************
	 * ADD METHODS TO THE NODE CLASS
	 *********************************/
	
	var ExtObj = {},
		effects = "move scale highlight appear fade puff blindUp blindDown".split(" ");
	
	Y.Array.each(effects, function (effect) {
		ExtObj[effect] = function (node, config) {
			config = Y.merge({ node: Y.get(node) }, config || {});
			
			var anim = new Y.Effects[effect.charAt(0).toUpperCase() + effect.substring(1)](config);
			anim.run();
		};
	});
	
	Y.Node.importMethod(ExtObj, effects);

}, "3.0.0" , { requires : ["node", "anim", "async-queue"] });