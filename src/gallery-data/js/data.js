YUI().add("gallery-data-storage", function (Y) {
	var expando = "yui" + (new Date()).getTime(),
		uuid = 0;
	
	var Data = Y.DataStorage = {
		cache: {},
		
		expando: expando,
		
		// The following elements throw uncatchable exceptions if you
		// attempt to add expando properties to them.
		noData: {
			"embed": true,
			"object": true,
			"applet": true
		},
		
		data: function (elem, name, data) {
			if (elem instanceof Y.Node && elem.get("nodeName") && Data.noData[elem.get("nodeName").toLowerCase()]) {
				return;
			}
			
			var id = elem[Data.expando],
				cache = Data.cache,
				thisCache,
				isNode = elem instanceof Y.Node;
			
			// If we haven't initialized this element and we're trying to get data,
			// then there isn't any, so just return.
			if (!id && typeof name === "string" && data === undefined) {
				return;
			}
			
			// Get the data from the object directly
			if (!isNode) {
				cache = elem;
				id = Data.expando;
							
			// Compute a unique ID for the element
			} else if (!id) {
				elem[expando] = id = ++uuid;
			}
			
			// Avoid generating a new cache unless none exists and we want to manipulate it.
			if (typeof name === "object") {
				cache[id] = Y.aggregate({}, name);
			
			} else if (!cache[id]) {
				cache[id] = {};
			}
			
			thisCache = cache[id];
			
			// Prevent overriding the named cache with undefined values.
			if (data !== undefined) {
				thisCache[name] = data;
			}
			
			return typeof name === "string" ? thisCache[name] : thisCache;
		},
		
		removeData: function (elem, name) {
			if (elem.get("nodeName") && Data.noData[elem.get("nodeName").toLowerCase()]) {
				return;
			}
			
			var id = elem[Data.expando],
				cache = Data.cache,
				isNode = elem.get("nodeType"),
				thisCache = isNode? cache[id] : id;
			
			// If we want to remove a specific section of the element's data.
			if (name) {
				if (thisCache) {
					// Remove the section of cache data.
					delete thisCache[name];
					
					// If we've removed all the data, remove the element's cache.
					if (!Y.Object.size(thisCache))  {
						Data.removeData(elem);
					}
				}
			
			// Otherwise, we want to remove all of the element's data
			} else {
				delete elem[Data.expando];
				
				// Completely remove the data cache
				if (isNode) {
					delete cache[id];
				}
			}
		}
	};
	
	var NodeDataExt = function () {};
	
	NodeDataExt.prototype = {
		data: function(key, value) {
			if (typeof key === "undefined") {
				return Data.data(this);
			
			} else if (typeof key === "object") {
				Data.data(this, key);
				return this;
			}
			
			var parts = key.split(".");
			parts[1] = parts[1] ? "." + parts[1] : "";
			
			if (value === undefined) {
				var data = Data.data(this, key);
				
				return data === undefined && parts[1] ?
						this.data(parts[0]) :
						data;
			} else {
				Data.data(this, key, value);
				return this;
			}
		},
		
		removeData: function(key) {
			Data.removeData(this, key);
			return this;
		}
	};
	
	Y.augment(Y.Node, NodeDataExt);
	
	var NodeListDataExt = function () {};
	
	NodeListDataExt.prototype = {
		data: function(key, value) {
			if (typeof key === "undefined") {
				return Data.data(this.item(0));
			
			} else if (typeof key === "object") {
				this.each(function () {
					this.data(key);
				});
				return this;
			}
			
			if (value === undefined) {
				var data = Data.data(this.item(0), key);
				
				return data === undefined && parts[1] ?
						this.data(parts[0]) :
						data;
			} else {
				this.each(function () {
					this.data(key, value);
				});
				return this;
			}
		},
		
		removeData: function(key) {
			this.each(function () {
				this.removeData(key);
			});
			return this;
		}
	};
	
	Y.augment(Y.NodeList, NodeListDataExt);
	
}, "3.0.0" , { requires : ["node"] });