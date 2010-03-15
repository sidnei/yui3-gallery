YUI().add("gallery-effects", function (Y) {

	var L = Y.Lang;
	
	/**** BEGIN EXTENDING THE NODE CLASS ****/
	
	// Add a few helper methods to the Node class that hopefully will be added
	// in a future release of the Node class.  They simplify showing/hiding a given node
	// by manipulating its "display" style.
	
	Y.mix(
		Node.prototype, {
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
			displayed: function() {
				return this.getStyle("display") != "none";
			},
			
			/**
		     * Toggle the display of an element.
		     *
		     * @method toggle
		     * @chainable
		     */
			toggle: function() {
				this[this.displayed() ? "hide" : "show"]();
				return this;
			}
		}
	);

	/**** END EXTENDING THE NODE CLASS ****/
	
	Y.Effects = {};
	
	Y.Effects.Base = function (config) {
		Y.Effects.Base.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Y.Effects.Base, Y.Anim, {
		
	});
	
	Y.Effects.Opacity = function (config) {
		Y.Effects.Opacity.superclass.constructor.apply(this, arguments);
	};
	
	Y.extend(Y.Effects.Opacity, Y.Effects.Base, {
		initializer: function (config) {
			var node = this.get("node");
			// Make this work on IE on elements without "layout"
			if (Y.UA.ie && Y.Node.getDomNode(node).currentStyle.hasLayout) {
				node.setStyle("zoom", 1);
			}
			
			this.setAttrs({
				from: { opacity: node.getStyle("opacity") || 0.0 },
				to: {opacity: 1.0 }
			});
			
			this.run();
		}
	});
	
	/*	Base: function (node, configs) {
			var currentConfig = configs.shift(),
				anim = (new Y.Anim(currentConfig)).set("node", node),
			
				onEnd = function () {
					// If we don't have any more animations to run, then stop.
					if (!configs.length) {
						return;
					}
					
					var nestedCurrentConfig = configs.shift();
					
					this.setAttrs(nestedCurrentConfig);
					if (nestedCurrentConfig.beforeStart) {
						nestedCurrentConfig.beforeStart(node);
					}

					this.unsubscribe("end");
					if (nestedCurrentConfig.afterEnd) {
						this.on("end", nestedCurrentConfig.afterEnd);
					}
					this.on("end", onEnd);
					
					this.run();
				};
			
			if (currentConfig.afterEnd) {
				anim.on("end", currentConfig.afterEnd);
			}

			if (configs.length) {
				anim.on("end", onEnd);
			}			
			
			if (currentConfig.beforeStart) {
				currentConfig.beforeStart(node);
			}
			
			return anim;
		}
	};
	
	var Base = Y.Effects.Base;
	
	Y.Effects.Appear = function (node, config) {
		var startOpacity = node.getStyle("display") === "none" ? 0 : node.getStyle("opacity") || 0;

		return Base(node, [Y.merge(config, {
			beforeStart: function(node) {
				node.setStyle("opacity", startOpacity).show();
			},
			from: { opacity: startOpacity },
			to: { opacity: 1 }
		})]);
	};
	
	Y.Effects.SlideDown = function (node, config) { };*/

}, "3.0.0" , { requires : ["node", "anim"] });