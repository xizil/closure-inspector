// Copyright Google 2008 Inc. All Rights Reserved.

/**
 * @fileoverview Representations for Closure Inspector objects.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  clInspector.Reps = {};

  /**
   * Override the representation of the stack frame to
   * display the real name.
   */
  clInspector.Reps.JsdStackFrameRep = domplate(Firebug.Rep, {
      inspectable: false,

      supportsObject: function(object) {
        return object instanceof jsdIStackFrame && object.isValid;
      },

      getTitle: function(frame, context) {
        var nameInfo = clInspector.Helpers.getFrameInfo(frame, context);

        if (!nameInfo) {
          return "(invalid frame)";
        }

        if (nameInfo.realName) {
          return "*" + nameInfo.description;
        }

        return nameInfo.description;
      },

      getTooltip: function(frame, context) {
        var nameInfo = clInspector.Helpers.getFrameInfo(frame, context);

        if (!nameInfo) {
          return "(invalid frame)";
        }

        var sourceInfo =
            FBL.getSourceFileAndLineByScript(context, frame.script, frame);

        if (sourceInfo) {
          var info =
              $STRF("Line", [sourceInfo.sourceFile.href, sourceInfo.lineNo]);

          if (nameInfo.realName) {
            info += " | " + "Original Name: " + nameInfo.realName.name;
          }

            return info;
        }
      },

      getContextMenuItems: function(frame, target, context) {
        var fn = frame.script.functionObject.getWrappedValue();
        return FirebugReps.Func.getContextMenuItems(fn, target, context,
                                                    frame.script);
      }
    });


  ////////////////////////////////////////////////////////////////

  /**
   * Registration
   */
  Firebug.registerRep(clInspector.Reps.JsdStackFrameRep);

}});
