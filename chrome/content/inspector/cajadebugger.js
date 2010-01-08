// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Implements debugging tools and support for Caja-generated
 * code.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {
  if (clInspector.wrongVersion) { return; }

  clInspector.MainModule.registerInline({
    supportsCajaDebugging: true,

    registerCajaModule : function(context, module) {
      // Use the stack trace to determine the calling script
      // file that is registering this module.
      /** NOTE: Currently broken in Firebug; the stack trace is
          incorrect, so we use an exception instead.
          var stackTrace = getCurrentStackTrace(context);
          var frames = stackTrace.frames;

      for (var i = 0; i < frames.length; ++i) {
        var scriptHref = frames[i].href;

        if (scriptHref.indexOf(".co.js") > 0) {
          containerHref = scriptHref;
          break;
        }
      }
      **/

      var containerHref = null;
      var stackTrace = null;

      try {
        throw Error("foo");
      } catch (e) {
        stackTrace = e.stack.split('\n');
      }

      var containerHref = null;

      // The Firefox stack trace will consist of lines of the form:
      // functionName@filePath:lineNumber.
      // We need to find the file path of the Caja module.
      for (var i = 0; i < stackTrace.length; ++i) {
        var line = stackTrace[i];
        if (line[0] == '@') {
          // Find the line with the Caja module file path on it.
          // Caja modules end in .out.js.
          if (line.indexOf('.out.js') > 0) {
            var numberIndex = line.lastIndexOf(':');
            containerHref = line.substr(1, numberIndex - 1);
          }
        }
      }

      if (!containerHref) {
        return;
      }

      clInspector.CajaDebugger.register(context, module, containerHref);
    }
  });
}});
