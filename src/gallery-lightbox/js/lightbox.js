YUI().add("gallery-lightbox", function (Y) {
	
	var L = Y.Lang;

	var LB = function (config) {
		LB.superclass.constructor.apply(this, arguments);
	};
	
	LB.NAME = "lightbox";
	
	LB.ATTRS = {
		selector: {
			value: "a[rel^=lightbox]",
			validator: L.isString
		},
		
		borderWidth: {
			value: 10,
			validator: L.isNumber
		},
		
		overlayDuration: {
			value: 0.2,
			validator: L.isNumber
		},
		
		overlayOpacity: {
			value: 0.8,
			validator: L.isNumber
		},
		
		resizeDuration: {
			value: 0.5,
			validator: L.isNumber
		},
		
		anim: {
			value: !L.isUndefined(Y.Anim),
			validator: L.isBoolean
		},
		
		imageArray: {
			validator: L.isArray
		},
		
		activeImage: {
			validator: L.isNumber
		},
		
		strings: {
			value : {
				labelImage: "Image",
				labelOf: "of"
			}
		}
	};
	
	Y.extend(LB, Y.Base, {
		initializer: function (config) {
			// Code inserts html at the bottom of the page that looks similar to this:
	        //
	        //  <div id="overlay"></div>
	        //  <div id="lightbox">
	        //      <div id="outerImageContainer">
	        //          <div id="imageContainer">
	        //              <div id="lightboxContent"></div>
	        //              <img id="lightboxImage">
	        //              <div style="" id="hoverNav">
	        //                  <a href="#" id="prevLink"></a>
	        //                  <a href="#" id="nextLink"></a>
	        //              </div>
	        //              <div id="loading"></div>
	        //          </div>
	        //      </div>
	        //      <div id="imageDataContainer">
	        //          <div id="imageData">
	        //              <div id="imageDetails">
	        //                  <span id="caption"></span>
	        //                  <span id="numberDisplay"></span>
	        //              </div>
	        //              <div id="bottomNav">
	        //                  <a href="#" id="bottomNavClose"></a>
	        //              </div>
	        //          </div>
	        //      </div>
	        //  </div>

	        var objBody = Y.one(document.body);

			objBody.append(Y.Node.create('<div id="overlay"></div>'));
		
	        objBody.append(Y.Node.create('<div id="lightbox"></div>')
				.append(Y.Node.create('<div id="outerImageContainer"></div>')
					.append(Y.Node.create('<div id="imageContainer"></div>')
						.append(Y.Node.create('<div id="lightboxContent" />'))
						.append(Y.Node.create('<img id="lightboxImage" />'))
						.append(Y.Node.create('<div id="hoverNav"></div>')
							.append(Y.Node.create('<a id="prevLink" href="#"></a>'))
							.append(Y.Node.create('<a id="nextLink" href="#"></a>'))
						)
						.append(Y.Node.create('<div id="loading"></div>'))
					)
				)
				.append(Y.Node.create('<div id="imageDataContainer"></div>')
					.append(Y.Node.create('<div id="imageData"></div>')
						.append(Y.Node.create('<div id="imageDetails"></div>')
							.append(Y.Node.create('<span id="caption"></span>'))
							.append(Y.Node.create('<span id="numberDisplay"></span>'))
						)
						.append(Y.Node.create('<div id="bottomNav"></div>')
							.append(Y.Node.create('<a id="bottomNavClose" href="#"></a>'))
						)
					)
				)
			);
			
			this._bindStartListener();
			
			Y.one("#overlay").hide().on("click", function () { this.end(); }, this);
			Y.one("#lightbox").hide().on("click", function (evt) {
				if (evt.currentTarget.get("id") === "lightbox") {
					this.end();
				}
			}, this);
			
			var size = (this.get("anim") ? 250 : 1) + "px";
			
			Y.one("#outerImageContainer").setStyles({ width: size, height: size });
			Y.one("#prevLink").on("click", function (evt) { evt.halt(); this._changeImage(this.get("activeImage") - 1); }, this);
			Y.one("#nextLink").on("click", function (evt) { evt.halt(); this._changeImage(this.get("activeImage") + 1); }, this);
			Y.one("#bottomNavClose").on("click", function (evt) { evt.halt(); this.end(); }, this);
			
			L.later(0, this, function () {
				var ids = "overlay lightbox outerImageContainer imageContainer lightboxImage hoverNav prevLink nextLink loading " + 
                "imageDataContainer imageData imageDetails caption numberDisplay bottomNav bottomNavClose";
            	
				Y.Array.each(ids.split(" "), function (element, index, array) {
					this.addAttr(element, { value: Y.one("#" + element) });
				}, this);
			});
		},
		
		/**
	     * Display overlay and lightbox.  If image is part of a set, add siblings to imageArray.
	     *
	     * @method start
	     * @param selectedLink {Node} The selected anchor node
	     */
		start: function (selectedLink) {
			Y.all("select, object, embed").each(function() {
				this.setStyle("visibility", "hidden");
			});
			
			// Stretch overlap to fill page and fade in
			var overlay = this.get("overlay").setStyles({ height: Y.DOM.docHeight() + "px", width: Y.DOM.docWidth() + "px" }).show();
			if (this.get("anim")) {
				var anim = new Y.Anim({
					node: overlay,
					from: { opacity: 0 },
					to: { opacity: this.get("overlayOpacity") },
					duration: this.get("overlapDuration")
				});
				anim.run();
			} else {
				overlay.setStyle("opacity", this.get("overlayOpacity"));
			}
			
			var imageArray = [],
				imageNum = 0;
			
			if (selectedLink.get("rel") === "lightbox") {
				// If image is NOT part of a set, add single image to imageArray
				imageArray.push([selectedLink.get("href"), selectedLink.get("title")]);
			} else {
				// If image is part of a set...
				Y.all(selectedLink.get("tagName") + '[href][rel="' + selectedLink.get("rel") + '"]').each(function () {
					imageArray.push([this.get("href"), this.get("title")]);
				});
				
				while (imageArray[imageNum][0] !== selectedLink.get("href")) { imageNum++; }
			}
			
			this.set("imageArray", imageArray);
			
			var lightboxTop = Y.DOM.docScrollY() + (Y.DOM.winHeight() / 10),
				lightboxLeft = Y.DOM.docScrollX();
			this.get("lightbox").setStyles({ display: "", top: lightboxTop + "px", left: lightboxLeft + "px" });
			
			this._changeImage(imageNum);
		},
		
		end: function () {
			this._disableKeyboardNav();
			this.get("lightbox").hide();
			
			var overlay = this.get("overlay");
			
			if (this.get("anim")) {
				var anim = new Y.Anim({
					node: overlay,
					from: { opacity: this.get("overlayOpacity") },
					to: { opacity: 0 },
					duration: this.get("overlapDuration")
				});
				anim.on("end", function () { overlay.hide(); });
				anim.run();
			} else {
				overlay.setStyles({ opacity: 0 }).hide();
			}
			
			Y.all("select, object, embed").each(function() {
				this.setStyle("visibility", "visible");
			});
		},
		
		_bindStartListener: function () {
			Y.delegate("click", Y.bind(function (evt) {
				evt.halt();
				this.start(evt.currentTarget);
			}, this), document.body, this.get("selector"));
		},
		
		_changeImage: function (imageNum) {
			this.set("activeImage", imageNum);
			
			// Hide elements during transition
			if (this.get("anim")) {
				this.get("loading").show();
			}
			this.get("lightboxImage").hide();
			this.get("hoverNav").hide();
			this.get("prevLink").hide();
			this.get("nextLink").hide();
			
			// Hack: Opera9 doesn't support something in scriptaculous opacity and appear fx
			// Do I need this?
			this.get("imageDataContainer").setStyle("opacity", 0.0001);
			this.get("numberDisplay").hide();
			
			var imagePreloader = new Image();
			
			// Once image is preloaded, resize image container
			imagePreloader.onload = Y.bind(function () {
				this.get("lightboxImage").set("src", this.get("imageArray")[imageNum][0]);
				this._resizeImageContainer(imagePreloader.width, imagePreloader.height);
			}, this);
			imagePreloader.src = this.get("imageArray")[imageNum][0];
		},
		
		_resizeImageContainer: function (imgWidth, imgHeight) {
			// Get current width and height
			var outerImageContainer = this.get("outerImageContainer"),
				widthCurrent = outerImageContainer.get("offsetWidth"),
				heightCurrent = outerImageContainer.get("offsetHeight"),
			
			// Get new width and height
				widthNew = imgWidth + this.get("borderWidth") * 2,
				heightNew = imgHeight + this.get("borderWidth") * 2,
				
			// calculate size difference between new and old image
				wDiff = widthCurrent - widthNew,
				hDiff = heightCurrent - heightNew,
				
				afterResize = Y.bind(function () {
					this.get("prevLink").setStyles({ height: imgHeight + "px" });
					this.get("nextLink").setStyles({ height: imgHeight + "px" });
					this.get("imageDataContainer").setStyles({ width: widthNew + "px" });
					
					this._showImage();
				}, this);
			
			if (wDiff !== 0 || hDiff !== 0) {
				if (this.get("anim")) {
					var anim = Y.Effects.Base(outerImageContainer, [{
						from: { width: widthCurrent + "px" },
						to: { width: widthNew + "px" },
						duration: this.get("resizeDuration")
					}, {
						from: { height: heightCurrent + "px" },
						to: { height: heightNew + "px" },
						duration: this.get("resizeDuration"),
						afterEnd: afterResize
					}]);
					anim.run();
				} else {
					outerImageContainer.setStyles({ width: widthNew, height: heightNew });
					L.later(0, this, afterResize);
				}
			} else {
				// If new and old image are the same size, and no scaling is necessary,
				// do a quick pause to prevent image flicker.
				L.later(100, this, afterResize);
			}
		},
		
		_showImage: function () {
			this.get("loading").hide();
			
			var anim = Y.Effects.Appear(this.get("lightboxImage"), {
				afterEnd: Y.bind(this._updateDetails, this)
			});
			anim.run();
			
			this._preloadNeighborImages();
		},
		
		_updateDetails: function () {
			
			var imageArray = this.get("imageArray"),
				activeImage = this.get("activeImage"),
				caption = imageArray[activeImage][1];
			
			// If caption is not null
			if (caption !== "") {
				this.get("caption").setContent(caption).show();
			}
			
			// If image is part of a set display "Image x of x"
			if (imageArray.length > 1) {
				this.get("numberDisplay").setContent(this.get("strings.labelImage") + " " + (activeImage + 1) + " " + this.get("strings.labelOf") + "  " + imageArray.length).show();
			}
			
			var anim = Y.Effects.Appear(this.get("imageDataContainer"), {
				duration: this.get("resizeDuration"),
				afterEnd: Y.bind(function () {
					// Update overlay size and update nav
					this.get("overlay").setStyle("height", Y.DOM.docHeight() + "px");
					this._updateNav();
				}, this)
			});
			anim.run();
		},
		
		_updateNav: function () {
			this.get("hoverNav").show();
			
			// If not first image in set, display previous image button
			if (this.get("activeImage") > 0) {
				this.get("prevLink").show();
			}
			
			// If not first image in set, display previous image button
			if (this.get("activeImage") < (this.get("imageArray").length - 1)) {
				this.get("nextLink").show();
			}
			
			this._enableKeyboardNav();
		},
		
		_enableKeyboardNav: function () {
			Y.get(document.body).on("keydown", this._keyboardAction, this);
		},
		
		_disableKeyboardNav: function () {
			Y.get(document.body).unsubscribe("keydown", this._keyboardAction);
		},
		
		_keyboardAction: function (evt) {
			var keyCode = evt.keyCode,
				escapeKey = 27,
				key = String.fromCharCode(keyCode).toLowerCase();
			
			if (key.match(/x|o|c/) || (keyCode === escapeKey)) { // close lightbox
				this.end();
			} else if ((key === 'p') || (keyCode === 37)) { // Display the previous image
				if (this.get("activeImage") !== 0) {
					this._disableKeyboardNav();
					this._changeImage(this.get("activeImage") - 1);
				}
			} else if ((key === 'n') || (keyCode === 39)) { // Display the next image
				if (this.get("activeImage") !== (this.get("imageArray").length - 1)) {
					this._disableKeyboardNav();
					this._changeImage(this.get("activeImage") + 1);
				}
			}
		},
		
		_preloadNeighborImages: function () {
			var preloadNextImage, preloadPrevImage;
			
			if (this.get("imageArray").length > this.get("activeImage") + 1) {
				preloadNextImage = new Image();
				preloadNextImage.src = this.get("imageArray")[this.get("activeImage") + 1][0];
			}
			
			if (this.get("activeImage") > 0) {
				preloadPrevImage = new Image();
				preloadPrevImage.src = this.get("imageArray")[this.get("activeImage") - 1][0];
			}
		}
	});
	
	// Don't expose as public.
	Y.Lightbox = {
		load: function() {
			var lightbox = new LB();
		}
	};
	
}, "3.0.0" , { requires : ["base", "node", "io-base", "gallery-effects"] });