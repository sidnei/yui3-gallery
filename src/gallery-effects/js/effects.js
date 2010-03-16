YUI().add("gallery-effects", function (Y) {

A = Y;

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
	
	_animAttrList = (function () {
		var list = [];
		for (attr in Y.Anim.ATTRS) list.push(attr);
		return list;
	})(),
	
	_parseAnimConfig = function (config) {
		return Y.mix({}, config, true, _animAttrList);
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
	 * @class Y.Effects.Animate
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Animate = function (config) {
		Effects.Animate.superclass.constructor.apply(this, arguments);
	};
	
	Y.mix(Effects.Animate, {
		NAME: "animate",
	
		ATTRS: {
			scope: {
				value: "global",
				validator: L.isString
			},
			
			wait: {
				value: false, 
				validator: L.isBoolean
			},
			
			node: {
				validator: function (v) {
					return v instanceof Y.Node;
				}
			}
		}
	});
	
	Y.extend(Effects.Animate, Y.Base, {
		initializer: function (config) {
			var queue = this._getQueue(),
				anim = new Y.Anim(config);
			
			this.set("node", config.node);
			this.set("anim", anim);
			
			this.publish("beforeStart", { defaultFn: this._defaultBeforeStartFn });
			this.publish("end", { defaultFn: this._defaultEndFn });
			
			queue.add({
				fn: this._execute,
				context: this,
				autoContinue: !this.get("wait")
			});
		},
		
		run: function () {
			var queue = this._getQueue();
			
			if (!queue.isRunning()) {
				queue.run();
			}
		},
		
		_execute: function () {
			var anim = this.get("anim");
			
			this.fire("beforeStart");

			anim.on("end", function(){ this.fire("end" ); }, this);

			anim.run();
		},
		
		_getQueue: function () {
			return AnimQueues.get(this.get("scope"));
		},
		
		_defaultEndFn : function (evt) {
			// If we told the queue to wait after finishing animation, then tell it continue
			// now that we're done.
			if (this.get("wait")) this._getQueue().run();
		}
	});
	
	/***
	 * 
	 * @class Y.Effects.Opacity
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Opacity = function (config) {
		
		var node = config.node;
		
		config.from = {
			opacity: config.from !== undefined ?
				config.from : node.getStyle("opacity") || 0.0
		};
		config.to = {
			opacity: config.to !== undefined ? config.to : 1.0
		};
		
		Effects.Opacity.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Effects.Opacity, Effects.Animate);
	
	/***
	 * 
	 * @class Y.Effects.Move
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Move = function (config) {

		config.to = { xy: [config.x, config.y] };
		
		Effects.Move.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Effects.Move, Effects.Animate);
	
	/***
	 * 
	 * @class Y.Effects.Scale
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Scale = function (config) {
		config = Y.merge({
			scaleX: true,
			scaleY: true,
			scaleContent: true,
			scaleFromCenter: false,
			scaleMode: "box", // 'box' or 'contents' or { } with provided values
			scaleFrom: 100.0,
			scaleTo: 200.0
		}, config || {});
		
	    var node = config.node,
			elementPositioning = node.getStyle("position"),
			originalXY = node.getXY(),
			fontSize = node.getStyle("fontSize") || "100%",
			fontSizeType,
			dims,
			originalStyle = { },
			restoreAfterFinish = config.restoreAfterFinish || false;
				
	    Y.Array.each(["top", "left", "width", "height", "fontSize"], function(k) {
			originalStyle[k] = node.getStyle(k);
	    });
			
		Y.Array.each(["em", "px", "%", "pt"], function(type) {
			if (fontSize.toString().indexOf(type) > 0) {
				fontSize = parseFloat(fontSize);
				fontSizeType = type;
			}
		});
			
		if (config.scaleMode === "box") {
			dims = [node.get("offsetHeight"), node.get("offsetWidth")];
		
		} else if (/^content/.test(config.scaleMode)) {
			dims = [node.get("scrollHeight"), node.get("scrollWidth")];
		
		} else {
			dims = [config.scaleMode.originalHeight, config.scaleMode.originalWidth];
		}

		// Build out the to and from objects that we're going to pass to the animate utility.
		var to = {}, from = {},
			toScaleFraction = config.scaleTo/100.0,
			fromScaleFraction = config.scaleFrom/100.0,
			fromWidth = dims[0] * fromScaleFraction,
			fromHeight = dims[1] * fromScaleFraction,
			toWidth = dims[0] * toScaleFraction,
			toHeight = dims[1] * toScaleFraction;
		
		if (config.scaleContent && fontSize) {
			from.fontSize = fontSize * fromScaleFraction + fontSizeType;
			to.fontSize = fontSize * toScaleFraction + fontSizeType;
		}
		
		if (config.scaleX) {
			from.width = fromWidth + "px";
			to.width = toWidth + "px";
		}
		
		if (config.scaleY) {
			from.height = fromHeight + "px";
			to.height = toHeight + "px";
		}
		
		if (config.scaleFromCenter) {
			var fromTop = (fromHeight - dims[0]) / 2,
				fromLeft = (fromWidth - dims[1]) / 2,
				toTop = (toHeight - dims[0]) / 2,
				toLeft = (toWidth - dims[1]) / 2;
		    
			if (elementPositioning === "absolute") {
				if (config.scaleY) {
					from.top = (originalXY[1] - fromTop) + "px";
					to.top = (originalXY[1] - toTop) + "px";
				}
				
				if (config.scaleX) {
					from.left = (originalXY[0] - fromLeft) + "px";
					to.left = (originalXY[0] - toLeft) + "px";
		    	}
			} else {
				if (config.scaleY) {
					from.top = -fromTop + "px";
					to.top = -toTop + "px";
				}
				
				if (config.scaleX) {
					from.left = -fromLeft + "px";
					to.left = -toLeft + "px";
				}
			}
		}
		
		config.to = to;
		config.from = from;

		Effects.Scale.superclass.constructor.apply(this, arguments);
		
		this.on("end", function () {
			if (restoreAfterFinish) this.get("node").setStyles(originalStyle);
		});
	};
	
	Y.extend(Effects.Scale, Effects.Animate);
	
	/***
	 * 
	 * @class Y.Effects.Highlight
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Highlight = function (config) {
		var node = config.node;
		
		config = Y.merge({
			startcolor: "#ff9",
			endcolor: "#fff",
			restorecolor: node.getStyle("backgroundColor"),
			iterations: 1,
			direction: "alternate"
		}, config || {});
			
		if (node.getStyle("display") === "none") {
			return;
		}
			
		var oldBackgroundImage = node.getStyle("backgroundImage");
		
		config.from = { backgroundColor: config.startcolor },
		config.to = { backgroundColor: config.endcolor };
		
		Effects.Highlight.superclass.constructor.apply(this, arguments);
		
		this.on("beforeStart", function () {
			this.get("node").setStyle("backgroundImage", "none");
		});
		
		this.on("end", function () {
			this.get("node").setStyles({
				backgroundImage: oldBackgroundImage,
				backgroundColor: config.restoreColor
			});
		});
	};
	
	Y.extend(Effects.Highlight, Effects.Animate);
	
	/***
	 * 
	 * @class Y.Effects.Appear
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Appear = function (config) {
		var node = config.node,
			startOpacity = !node.displayed() ? 0.0 : node.getStyle("opacity") || 0.0;;
		
		config = Y.merge({ from: startOpacity }, config || {});
		
		Effects.Appear.superclass.constructor.apply(this, arguments);
		
		this.on("beforeStart", function () {
			this.get("node").setStyle("opacity", startOpacity).show();
		});
	};
	
	Y.extend(Effects.Appear, Effects.Opacity);
	
	/***
	 * 
	 * @class Y.Effects.Fade
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Fade = function (config) {
		var startOpacity = config.node.getStyle("opacity");
			
		config = Y.merge({
			from: startOpacity || 1.0,
			to: 0.0
		}, config || {});
		
		Effects.Fade.superclass.constructor.apply(this, arguments);
		
		this.on("end", function () {
			if (startOpacity !== 0) return;
			
			this.get("node").hide().setStyle("opacity", startOpacity);
		});
	};
	
	Y.extend(Effects.Fade, Effects.Opacity);
	
	/***
	 * 
	 * @class Y.Effects.Puff
	 * @param config {Object} has of configuration name/value pairs
	 */
	Effects.Puff = function (config) {
		var node = config.node,
			oldStyle = {
				opacity: node.getStyle("opacity"),
			    position: node.getStyle("position"),
			    top:  node.getStyle("top"),
			    left: node.getStyle("left"),
			    width: node.getStyle("width"),
			    height: node.getStyle("height")
			};
			
			scale = new Effects.Scale(Y.merge({
				scaleFromCenter: true,
				scaleContent: true,
				restoreAfterFinish: true,
				duration: 1
			}, _parseAnimConfig(config)));
		
		scale.on("beforeStart", function () {
			var node = this.get("node");
			
			if (node.getStyle("position") === "absolute") return;
					
			var region = node.get("region");
			console.log(region);
			node.setStyles({
				position: "absolute",
				top: region.top + "px",
				left: region.left + "px",
				width: region.width + "px",
				height: region.height + "px"
			});
			console.log(node.getStyle("position"))
		});
		scale.run();

		config = Y.merge({
			to: 0.0,
			duration: 1
		}, _parseAnimConfig(config));
		
		Effects.Puff.superclass.constructor.apply(this, arguments);
		
		this.on("end", function () {
			//this.get("node").hide().setStyles(oldStyle);
		});
	};
	
	Y.extend(Effects.Puff, Effects.Opacity);
	
	Y.Effects = Effects;
	
	/*********************************
	 * ADD METHODS TO THE NODE CLASS
	 *********************************/
	
	var ExtObj = {},
		effects = "animate opacity move scale highlight appear fade puff".split(" ");
	
	Y.Array.each(effects, function (effect) {
		ExtObj[effect] = function (node, config) {
			config = Y.merge({ node: Y.get(node) }, config || {});
			
			var anim = new Y.Effects[effect.charAt(0).toUpperCase() + effect.substring(1)](config);
			anim.run();
		};
	});
	
	Y.Node.importMethod(ExtObj, effects);
	
	return;
	
	// Add a few helper methods to the Node class that hopefully will be added
	// in a future release of the Node class.  They simplify showing/hiding a given node
	// by manipulating its "display" style.
	
	Y.mix(Y.Node.prototype, {
		
		animate: function (config) {
			var queue = AnimQueues.get(config.scope || "global");
			
			config.node = this;
			
			queue.add({
				fn: function () {
					if (config.beforeStartFn) config.beforeStartFn.call(config.node);

					var anim = new Y.Anim(config);
					
					// Once we're done running, get the next item from the queue and continue.
					anim.on("end", queue.run, queue);
					if (config.endFn) anim.on("end", config.endFn, config.node);

					anim.run();
				},
				
				autoContinue: config.wait !== undefined ? !config.wait : true
			});
			
			if (!queue.isRunning()) {
				queue.run();
			}

			return this;
		},
		
		opacity: function (config) {
			config.from = { opacity: config.from !== undefined ? config.from : this.getStyle("opacity") || 0.0 };
			config.to = { opacity: config.to !== undefined ? config.to : 1.0 };
			
			return this.animate(config);
		},
		
		morph: function (config) {
			config.to = config.style;
			
			return this.animate(config);
		},
		
		move: function (config) {
			config.to = { xy: [config.x, config.y] };
			
			return this.animate(config);
		},
		
		scale: function(scalePercent, config) {
			config = Y.merge({
				scaleX: true,
				scaleY: true,
				scaleContent: true,
				scaleFromCenter: false,
				scaleMode: "box", // 'box' or 'contents' or { } with provided values
				scaleFrom: 100.0,
				scaleTo:   scalePercent
			}, config || { });
			
		    var elementPositioning = this.getStyle("position"),
				originalXY = this.getXY(),
				fontSize = this.getStyle("fontSize") || "100%",
				fontSizeType,
				dims,
				originalStyle = { },
				restoreAfterFinish = config.restoreAfterFinish || false;
				
		    Y.Array.each(["top", "left", "width", "height", "fontSize"], Y.bind(function(k) {
				originalStyle[k] = this.getStyle(k);
		    }, this));
			
			Y.Array.each(["em", "px", "%", "pt"], function(type) {
				if (fontSize.toString().indexOf(type) > 0) {
					fontSize = parseFloat(fontSize);
					fontSizeType = type;
				}
			});
			
			if (config.scaleMode === "box") {
				dims = [this.get("offsetHeight"), this.get("offsetWidth")];
			
			} else if (/^content/.test(config.scaleMode)) {
				dims = [this.get("scrollHeight"), this.get("scrollWidth")];
			
			} else {
				dims = [config.scaleMode.originalHeight, config.scaleMode.originalWidth];
			}

			// Build out the to and from objects that we're going to pass to the animate utility.
			var to = {}, from = {},
				toScaleFraction = config.scaleTo/100.0,
				fromScaleFraction = config.scaleFrom/100.0,
				fromWidth = dims[0] * fromScaleFraction,
				fromHeight = dims[1] * fromScaleFraction,
				toWidth = dims[0] * toScaleFraction,
				toHeight = dims[1] * toScaleFraction;
			
			if (config.scaleContent && fontSize) {
				from.fontSize = fontSize * fromScaleFraction + fontSizeType;
				to.fontSize = fontSize * toScaleFraction + fontSizeType;
			}
			
			if (config.scaleX) {
				from.width = fromWidth + "px";
				to.width = toWidth + "px";
			}
			
			if (config.scaleY) {
				from.height = fromHeight + "px";
				to.height = toHeight + "px";
			}
			
			if (config.scaleFromCenter) {
				var fromTop = (fromHeight - dims[0]) / 2,
					fromLeft = (fromWidth - dims[1]) / 2,
					toTop = (toHeight - dims[0]) / 2,
					toLeft = (toWidth - dims[1]) / 2;
			    
				if (elementPositioning === "absolute") {
					if (config.scaleY) {
						from.top = (originalXY[1] - fromTop) + "px";
						to.top = (originalXY[1] - toTop) + "px";
					}
					
					if (config.scaleX) {
						from.left = (originalXY[0] - fromLeft) + "px";
						to.left = (originalXY[0] - toLeft) + "px";
			    	}
				} else {
					if (config.scaleY) {
						from.top = -fromTop + "px";
						to.top = -toTop + "px";
					}
					
					if (config.scaleX) {
						from.left = -fromLeft + "px";
						to.left = -toLeft + "px";
					}
				}
			}
			
			// Handle the fact that we can have multiple callbacks.
			var previousEndFn = config.endFn;
			
			config.endFn = function () {
				if (restoreAfterFinish) this.setStyles(originalStyle);
				
				if (previousEndFn) previousEndFn.apply(this);
			}
			
			return this.animate(Y.merge({
				node: this,
				to: to,
				from: from
			}, config || {}));
		},
		
		highlight: function (config) {
		    config = Y.merge({
				startcolor: "#ff9",
				endcolor: "#fff",
				restorecolor: this.getStyle("backgroundColor")
			}, config || {});
			
			if (this.getStyle("display") === "none") {
				return this;
			}
			
			// var oldBackgroundImage = this.getStyle("backgroundImage");
			
			this.setStyle("backgroundImage", "none");
			
			var from = { backgroundColor: config.endcolor },
				to = { backgroundColor: config.startcolor };
			
			return this.animate(Y.merge(config, { from: from, to: to, wait: true }))
					.animate(Y.merge(config, { from: to, to: from }));
		},
		
		appear: function (config) {
			var startOpacity = !this.displayed() ? 0.0 : this.getStyle("opacity") || 0.0;
			
			return this.opacity(Y.merge({
				from: startOpacity,
				beforeStartFn: function () { this.setStyle("opacity", startOpacity).show(); }
			}, config || {}));
		},
		
		fade: function (config) {
			var startOpacity = this.getStyle("opacity");
			
			return this.opacity(Y.merge({
				from: startOpacity || 1.0,
				to: 0.0,
				endFn: function () {
					if (startOpacity !== 0) return;
					this.hide().setStyle("opacity", startOpacity);
				}
			}, config || {}));
		},
		
		puff: function (config) {
			var oldStyle = {
				opacity: this.getStyle("opacity"),
			    position: this.getStyle("position"),
			    top:  this.getStyle("top"),
			    left: this.getStyle("left"),
			    width: this.getStyle("width"),
			    height: this.getStyle("height")
			};
			
			return this
				.scale(200, Y.merge({
					beforeStartFn: function () {
						if (this.getStyle("position") === "absolute") return;
						
						var region = Y.DOM.region(Y.Node.getDOMNode(node)); //.get("region");
						this.setStyles({
							position: "absolute",
							top: region.top + "px",
							left: region.left + "px",
							width: region.width + "px",
							height: region.height + "px"
						});
					},
					scaleFromCenter: true,
					scaleContent: true,
					restoreAfterFinish: true,
					duration: 1
				}, config))
				
				.opacity(Y.merge({
					to: 0.0,
					duration: 1,
					endFn : function () {
						this.hide().setStyles(oldStyle);
					}
				}, config));
		},
		
		blindUp: function (config) {
			this._makeClipping();
			
			return this.scale(0, Y.merge({
				scaleX: false,
				restoreAfterFinish: true,
				endFn: function() { this.hide()._undoClipping(); }
			}, config));
		},
		
		blindDown: function (config) {
			var hw = getHeightAndWidthRegardlessOfDisplay(this);

			return this.scale(100, Y.merge({
				scaleContent: false,
				scaleX: false,
				scaleFrom: 0,
				scaleMode: { originalHeight: hw[1], originalWidth: hw[0] },
				restoreAfterFinish: true,
				beforeStartFn: function () { this._makeClipping().setStyle("height", "0px").show(); },
				endFn: function() { this._undoClipping(); }
			}, config));
		},
		
		_makeClipping: function () {
			if (this._overflow) return this;
			
			this._oveflow = this.getStyle("overflow") || "auto";
			
			if (this._overflow !== "hidden") {
				this.setStyle("overflow", "hidden");
			}
			
			return this;
		},
		
		_undoClipping: function () {
			if (!this._overflow) return this;
			
			this.setStyle("overflow", this._overflow === "auto" ? "" : this._overflow);
			element._overflow = null;
			
			return this;
		}
	});

}, "3.0.0" , { requires : ["node", "anim", "async-queue"] });