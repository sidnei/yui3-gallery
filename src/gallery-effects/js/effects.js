YUI().add("gallery-effects", function (Y) {

	var L = Y.Lang;
	
	/**** BEGIN EXTENDING THE NODE CLASS ****/
	
	Y.mix(
		Y.Node.prototype, {
			show: function () {
				this.setStyle("display", "");
				return this;
			},
			
			hide: function () {
				this.setStyle("display", "none");
				return this;
			}
		}
	);

	/**** END EXTENDING THE NODE CLASS ****/
	
	Y.Effects = {
		Base: function (node, configs) {
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
	
	Y.Effects.SlideDown = function (node, config) { };

}, "3.0.0" , { requires : ["node", "anim"] });