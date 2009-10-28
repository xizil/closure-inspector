// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview JS Unit support for Closure Library.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  clInspector.MainModule.registerInline({
    supportsJSUnit: true,

    jsUnitFailure : function(context, comment, opt_message) {
      if (!clInspector.Helpers.getPref("handleJSUnit")) {
        return;
      }

      // Mark the context as being under a JSUnit assertion. This
      // will ensure that the proper stack frame is shown in the
      // script and stack panels by the code in hooks.js.
      context[clInspector.Context.SHOW_JSUNIT_ASSERT] = true;
      context[clInspector.Context.HIGHLIGHT_JSUNIT_ASSERT] = true;

      if (Firebug.Debugger.isEnabled(context)) {
        // Halt the debugger at the current point.
        Firebug.Debugger.suspend(context);
      }
    },

    showLine : function(context, filePath, line) {
      if (!filePath) {
        return;
      }

      clInspector.Helpers.showSourceLine(context, filePath, line);
    }
  });

}});
