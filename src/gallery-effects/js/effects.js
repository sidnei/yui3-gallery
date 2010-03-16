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
	
	GlobalQueue = AnimQueues.get("global");
	
	/**** BEGIN EXTENDING THE NODE CLASS ****/
	
	// Add a few helper methods to the Node class that hopefully will be added
	// in a future release of the Node class.  They simplify showing/hiding a given node
	// by manipulating its "display" style.
	
	Y.mix(Y.Node.prototype, {
		/**
	     * Display a node.
	     *
	     * @method show
	     * @chainable
	     */
		show: function () {
			this.setStyle("display", "");
			return this;
		},
		
		/**
	     * Hide a node.
	     *
	     * @method hide
	     * @chainable
	     */
		hide: function () {
			this.setStyle("display", "none");
			return this;
		},
		
		/**
	     * Check is a node is being shown. Specifically not called "visible"
	     * so as not to confuse it with the visibility property.
	     *
	     * @method displayed
	     * @return boolean
	     */
		displayed: function () {
			return this.getStyle("display") != "none";
		},
		
		/**
	     * Toggle the display of an element.
	     *
	     * @method toggle
	     * @chainable
	     */
		toggle: function () {
			this[this.displayed() ? "hide" : "show"]();
			return this;
		},
		
		animate: function (config) {
			var queue = AnimQueues.get(config.scope || "global");
			
			config.node = this;
			
			queue.add({
				fn: function () {
					if (config.beforeStartFn) config.beforeStartFn.call(config.node);
console.log(config);
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
				dims;
				// originalStyle = { },
				// restoreAfterFinish = config.restoreAfterFinish || false
				
		    /*Y.Array.each(["top", "left", "width", "height", "fontSize"], Y.bind(function(k) {
				originalStyle[k] = this.getStyle(k);
		    }, this));*/
			
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
					if (this.options.scaleY) {
						from.top = -fromTop + "px";
						to.top = -toTop + "px";
					}
					
					if (this.options.scaleX) {
						from.left = -fromLeft + "px";
						to.left = -toLeft + "px";
					}
				}
			}
			
			return this.animate(Y.merge(config, { node: this, to: to, from: from }));
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
			
			return this.opacity(Y.merge(config, { from: startOpacity, beforeStartFn: function () { this.setStyle("opacity", startOpacity).show(); } }));
		}
	});

}, "3.0.0" , { requires : ["node", "anim", "async-queue"] });