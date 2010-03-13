YUI.add('gallery-base-componentmgr', function(Y) {

	/*!
	 * Base Component Manager
	 * 
	 * Oddnut Software
	 * Copyright (c) 2010 Eric Ferraiuolo - http://eric.ferraiuolo.name
	 * YUI BSD License - http://developer.yahoo.com/yui/license.html
	 */
	
	var ComponentMgr,
		
		COMPONENTS = 'components',
		
		E_INIT_COMPONENTS = 'initComponents',
		
		L = Y.Lang,
		isString = L.isString,
		isFunction = L.isFunction,
		noop = function(){};
		
	// *** Constructor *** //
	
	ComponentMgr = function (config) {
		
		this.publish(E_INIT_COMPONENTS, {
			defaultFn	: this._defInitComponentsFn,
			fireOnce	: true
		});
			
		this.after('init', function(e){
			this.fire(E_INIT_COMPONENTS, { components: [] });
		});
	};
	
	// *** Static *** //
	
	// *** Prototype *** //
	
	ComponentMgr.prototype = {
		
		// *** Instance Members *** //
		
		// *** Public Methods *** //
		
		getComponent : function () {
			
			var args = Y.Array(arguments, 0, true),
				components = args.slice(0, -1),
				callback = isFunction(args[args.length-1]) ? args[args.length-1] : noop,
				instances = [],
				requires;
			
			if (components.length < 1) {
				callback.call(this);
				return;
			}
			
			requires = this._getRequires(components);
			
			if (requires.length > 0) {
				
				Y.use.apply(Y, requires.concat(Y.bind(function(Y){
					Y.Array.each(components, function(c){
						instances.push(this._initComponent(c));
					}, this);
					callback.apply(this, instances);
				}, this)));
				
			} else {
				
				Y.Array.each(components, function(c){
					c = this._getComponent(c);
					instances.push(c ? c.instance || null : null);
				}, this);
				callback.apply(this, instances);
				
			}
		},
		
		// *** Private Methods *** //
		
		_getComponent : function (c) {
			
			var components = this[COMPONENTS];
			return ( isString(c) && Y.Object.hasKey(components, c) ? components[c] : Y.Object.hasValue(c) ? c : null );
		},
		
		_getRequires : function (components) {
			
			var requires = [];
			
			Y.Array.each(components, function(c){
				c = this._getComponent(c) || {};
				requires = requires.concat(c.requires || []);
			}, this);
			
			return Y.Array.unique(requires);
		},
		
		_defInitComponentsFn : function (e) {
			
			var components = e.components,
				requires = this._getRequires(components);
				
			Y.use.apply(Y, requires.concat(Y.bind(function(Y){
				Y.Array.each(components, this._initComponent, this);
			}, this)));
		},
		
		_initComponent : function (c) {
			
			c = this._getComponent(c);
			if ( ! c) { return null; }
			
			if ( ! c.instance) {
				var initFn = isFunction(c.initializer) ? c.initializer :
						isString(c.initializer) && isFunction(this[c.initializer]) ? this[c.initializer] : noop;
				try { c.instance = initFn.call(this); } catch(e){}
			}
			
			return c.instance || null;
		}
		
	};
	
	Y.BaseComponentMgr = ComponentMgr;


}, '@VERSION@' ,{requires:['collection']});
