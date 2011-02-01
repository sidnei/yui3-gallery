
// Create new YUI instance, and populate it with the required modules
YUI({
    combine: true,
    debug: true
}).use("gallery-base-componentmgr", "base", "test", "console", function(Y) {

    var console = new Y.Console({
        verbose : false,
        printTimeout: 0,
        newestOnTop : false})
      .render();

var suite = new Y.Test.Suite("base-componentmgr");

var ComponentManager = function ComponentManager(config) {
        ComponentManager.superclass.constructor.apply(this, arguments);
    };

Y.extend(ComponentManager, Y.Base, {});
Y.Base.mix(ComponentManager, [Y.BaseComponentMgr]);

suite.add(new Y.Test.Case({
    name: "ComponentManagerTest",

    testWBConstructor: function() {
        var mgr = new ComponentManager();
        Y.Assert.isInstanceOf(Y.State, mgr._components);
        Y.Assert.isInstanceOf(Y.CustomEvent, mgr.getEvent("initComponent"));
    }
}));

Y.Test.Runner.add(suite);
Y.Test.Runner.run();

});