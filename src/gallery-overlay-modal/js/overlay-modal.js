	/**
	 * Overlay Modal Plugin
	 * 
	 * Oddnut Software
	 * Copyright (c) 2009 Eric Ferraiuolo - http://eric.ferraiuolo.name
	 * YUI BSD License - http://developer.yahoo.com/yui/license.html
	 */
	
	var OverlayModal,
		OVERLAY_MODAL = 'overlayModal',
		MODAL = 'modal',
		
		getCN = Y.ClassNameManager.getClassName;
		
	// *** Constructor *** //
	
	OverlayModal = function (config) {
		
		Modal.superclass.constructor.apply(this, arguments);
	};
	
	// *** Static *** //
	
	Y.mix(Modal, {
		
		NAME : OVERLAY_MODAL,
		
		NS : MODAL,
		
		ATTRS : {
			
			
			
		}
		
	});
	
	// *** Prototype *** //
	
	Y.extend(Modal, Y.Plugin.Base, {
		
		// *** Lifecycle Methods *** //
		
		initializer : function (config) {},
		
		destructor : function () {}
		
	});
	
	Y.namespace('Plugin').OverlayModal = OverlayModal;
