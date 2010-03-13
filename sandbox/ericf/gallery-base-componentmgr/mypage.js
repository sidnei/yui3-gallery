YUI.add('mypage', function(Y){

	function MyPage (config) {
		MyPage.superclass.constructor.apply(this, arguments);
	}
	
	Y.extend(MyPage, Y.Base, {
	
		components : {
			
			myOverlay : {
				requires	: ['overlay', 'gallery-overlay-modal'],
				initializer : function(){
					return (new Y.Overlay({
						width : '200px',
						height : '150px',
						zInex : 100,
						centered : true,
						visible: false,
						bodyContent: '<p>My Overlay</p>',
						render : true,
						plugins : [{ fn: Y.Plugin.OverlayModal }],
						on : {
							click : function(e){ e.target.hide(); }
						}
					}));
				}
			},
			
			mySlider : {
				requires	: ['slider'],
				initializer	: '_initMySlider' 
			}
			
		},
		
		initializer : function (config) {
			
			Y.one('#foo').on('click', function(e){
			
				this.getComponent('mySlider', function(mySlider){
				
					// mySlider component had it's dependencies lazily loaded.
					// mySlider component was lazily initialized.
					// the instance returned by the initializer is cached,
					// repeated calls just quickly return the instance to the callback.
					
					mySlider.set('value', 400);
					
				});
				
			}, this);
			
			Y.one('#bar').on('click', function(e){
			
				this.getComponent('myOverlay', 'mySlider', function(myOverlay, mySlider){
					
					// if mySlider isn't already initialized, then it will be by now.
					
					myOverlay.show();
					mySlider.set('value', 200);
					
				});
			
			}, this);
			
			this.on('initComponents', function(e){
			
				if (Y.one('#foo')) {
					e.components.push('myOverlay');
					// or: e.components.push(this.components.myOverlay);
				}
				
			});
		},
		
		_initMySlider : function () {
		
			return (new Y.Slider({
				min: 0,
				max: 500,
				length: 500,
				render : true
			}));
		}
	
	}, {
	
		NAME : 'myPage'
	
	});
	
	Y.MyPage = Y.Base.mix(MyPage, [Y.BaseComponentMgr]);

}, '1', { requires: ['base', 'node', 'gallery-base-componentmgr'], optional: ['overlay', 'slider', 'gallery-overlay-modal'] });
