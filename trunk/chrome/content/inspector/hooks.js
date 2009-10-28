// Copyright Google 2008 Inc. All Rights Reserved.

/**
 * @fileoverview Definition of all "monkey" hooks into the Firebug
 * extension.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  const jsdIStackFrame = Ci.jsdIStackFrame;
  const panelStatus = $("fbPanelStatus");

  //////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////
  //                                                              //
  // The following code is a bunch of hacks to get around the     //
  // fact that Firebug does not allow one to easily extend        //
  // or override *existing* modules, representations, and panels. //
  //                                                              //
  //////////////////////////////////////////////////////////////////

  clInspector.Hooks = {};

  // AUGMENT: SourceBoxPanel ///////////////////////////////////////////

  clInspector.Helpers.hookFunction(
      Firebug.SourceBoxPanel, 'createSourceBox',
        function() {
          var box = arguments.callee.$__Previous.apply(this, arguments);
          box.panel = this;
          box.context = this.context;
          return box;
      });

  // AUGMENT: StackPanel ///////////////////////////////////////////

  /**
   * Take the given stack panel and override its
   * showStackFrame method to show a *proper* representation
   * of the current stack, as well as add some options.
   *
   * @param {Object} context The parent context of the stack panel
   *   being fixed.
   * @param {Firebug.Panel} panel The panel being fixed.
   */
  clInspector.Hooks.fixStackPanel = function(context, panel) {
    if (panel.__FIXED) {
      return;
    }

    panel.__FIXED = true;

    clInspector.Helpers.augmentClass(panel, {
      /**
       * Copies the current stack trace displayed in this
       * panel to the clipboard.
       */
      copyStackFrame: function() {
        var string = '';

        var lastFile = null;

        this.iterateStack(function(stackFrame, frameInfo) {
          if (frameInfo.sourceFile != lastFile) {
            string += 'In file: ' + frameInfo.sourceHref + '\n';
          }

          string += '    ';
          string += frameInfo.description;
          string += ' | Line ' + frameInfo.sourceLine;

          if (frameInfo.realName) {
            string += ' | Original Name: ' + frameInfo.realName.name;
          }

          string += '\n';

          lastFile = frameInfo.sourceFile;
        });

        copyToClipboard(string);
      },

      /**
       * Iterates over the stack currently being displayed in this panel and
       * calls the handler on each frame found in the form of
       * handler(frame, frameInfo);
       *
       * @param {Function} handler The handler method to run for each stack
       *   frame.
       */
      iterateStack: function(handler) {
        clInspector.Helpers.iterateStack(this.context,
            panel.currentStackFrame, handler);
      },

      /**
       * Visits the stack frame.
       * @param {jsdIStackFrame} frame the stack frame to visit.
       */
      visitStackFrame: function(frame) {
        this.context.getPanel("script").showStackFrame(frame);
      },

      /**
       * Overridden showStackFrame to show a better stack.
       */
      showStackFrame: function(frame) {
        var that = this;

        clearNode(this.panelNode);

        if (frame) {
          FBL.setClass(this.panelNode, "objectBox-stackTrace");

          var doc = this.panelNode.ownerDocument;
          var lastFile = null;

          clInspector.Layouts.StackCopyButton.button.append(
            { panel: this }, this.panelNode, this);

          panel.currentStackFrame = frame;

          // Draw the stack.
          panel.iterateStack(function(stackFrame, frameInfo) {

            var div = doc.createElement("div");
            div.style.paddingLeft = "10px";

            if (lastFile != frameInfo.sourceFile) {
              // Output the source file for the current stack frame.
              clInspector.Layouts.FileSeperator.div.append(
                  {frameInfo: frameInfo}, that.panelNode, null);
              lastFile = frameInfo.sourceFile;
            }

            if (frameInfo.realName) {
              // Output the real name for the current stack frame's
              // function.
              clInspector.Layouts.StackFrame.frame.append(
                  {label: label, frameInfo: frameInfo}, div, null);
            } else {
              div.textContent = frameInfo.description;
            }

            FBL.setClass(div, "objectLink");
            FBL.setClass(div, "objectLink-stackFrame");

            div.addEventListener("click", function(event) {
              that.visitStackFrame(stackFrame);
            }, false);

            that.panelNode.appendChild(div);
          });
        }
      }
    });
  };


  // AUGMENT: ScriptPanel ///////////////////////////////////////////

  /**
   * Take the given script panel and override its populateInfoTip method to
   * append the real name as well as a few other methods to add the
   * "Show Original Source" menu item.
   *
   * @param {Object} context The parent context of the script panel
   *   being fixed.
   * @param {Firebug.Panel} panel The panel being fixed.
   */
  clInspector.Hooks.fixScriptPanel = function(context, panel) {
    if (panel.__FIXED) {
      return;
    }

    panel.__FIXED = true;

    clInspector.Helpers.addStylesheetToPanel(panel,
        "chrome://inspector/content/scriptpanel.css");

    clInspector.Helpers.augmentClass(panel, {

      /**
       * Updates the "format source code" preference.
       */
      updateFormatPref_: function() {
        clInspector.Helpers.setPref("formatSourceCode",
            !clInspector.Helpers.getPref("formatSourceCode"));
      },

      /**
       * Updates the "handle JS unit assertions" preference.
       */
      updateJSUnitPref_: function() {
        clInspector.Helpers.setPref("handleJSUnit",
            !clInspector.Helpers.getPref("handleJSUnit"));
      },

      /**
       * Updates the "dynamic replacement/inline renaming" preference.
       */
      updateReplacementPref_: function() {
        clInspector.Helpers.setPref("dynamicReplacement",
            !clInspector.Helpers.getPref("dynamicReplacement"));
      },


      /**
       * Overrides the highlightExecutionLine method to provide for
       * JSUnit assertion failure highlighting.
       */
      highlightExecutionLine: function(sourceBox) {
        arguments.callee.$__Previous.apply(this, arguments);

        var lineNode = sourceBox.getLineNode(this.executionLineNo);

        if (lineNode) {
          if (context[clInspector.Context.HIGHLIGHT_JSUNIT_ASSERT]) {
            context[clInspector.Context.HIGHLIGHT_JSUNIT_ASSERT] = false;

            lineNode.style.background = '#FF9999';
            lineNode.setAttribute("exeLine", "false");
          }
        }
      },


      /**
       * Overrides the getOptionsMenuItems method to add the various new options
       * for clInspector into the Options menu.
       */
      getOptionsMenuItems: function() {
        var otherOptions = arguments.callee.$__Previous.apply(this, arguments);

        var options = [];

        for (var i = 0; i < otherOptions.length; ++i) {
          options.push(otherOptions[i]);
        }

        // TODO(jschorr): Uncomment once Firebug fixes their script
        // panel display.

        /*
        options.push(
            clInspector.Helpers.createOptionMenu(
                "Format Source Code", "formatSourceCode",
                this.updateFormatPref_));

        options.push(
            clInspector.Helpers.createOptionMenu(
                "Inline Renaming", "dynamicReplacement",
                this.updateReplacementPref_));
        */

        options.push(
            clInspector.Helpers.createOptionMenu(
                "Handle JSUnit failures", "handleJSUnit",
                this.updateJSUnitPref_));
        return options;
      },

      /**
       * Overrides showStackFrame to handle JSUnit assertion
       * display.
       */
      showStackFrame: function(frame) {
        if (context[clInspector.Context.SHOW_JSUNIT_ASSERT]) {
          context[clInspector.Context.SHOW_JSUNIT_ASSERT] = false;

          var frameSet = false;

          clInspector.Helpers.iterateStack(context, frame,
                function(stackFrame, frameInfo) {

              if (frameSet) {
                return;
              }

              if (frameInfo.sourceHref.indexOf('testing/asserts.js') < 0) {
                // We are now inside the test. Choose the current frame.
                frame = stackFrame;
                frameSet = true;
              }
            });

          // If we found the frame for the test, call the script panel
          // with that frame instead of the current one.
          if (frameSet) {
            return arguments.callee.$__Previous.call(this, frame);
          }
        }

        return arguments.callee.$__Previous.apply(this, arguments);
      },

      /**
       * Overrides the getContextMenuItems method to add the
       * "Show Original Source" item when applicable.
       */
      getContextMenuItems: function(fn, target) {
        var menuOptions = arguments.callee.$__Previous.apply(this, arguments);

        if (!menuOptions) {
          return;
        }

        var sourceRow = getAncestorByClass(target, "sourceRow");
        var sourceLine = getChildByClass(sourceRow, "sourceLine");
        var lineNo = parseInt(sourceLine.textContent);

        var selection = this.document.defaultView.getSelection();

        if (selection) {
          var anchorOffset = selection.anchorOffset;
          var charOffset = 0;

          if (target.hasAttribute('characterOffset')) {
            charOffset = parseInt(target.getAttribute('characterOffset'));
          }

          var offset = charOffset + anchorOffset;

          var sourceFile = this.selectedSourceBox.repObject;
          var sourceHref = sourceFile.href;

          // Check the source mappers.
          var mappers = clInspector.MainModule.getDebuggers();

          for (var i = 0; i < mappers.length; ++i) {
            var mapper = mappers[i];

            if (mapper.canMap(context, sourceHref, lineNo)) {
              menuOptions.push("-");
              menuOptions.push({
                               label: "Show Original Source",
                               nol10n: true,
                               command: bindFixed(mapper.showMappedSource,
                                                  mapper, context,
                                                  sourceHref, lineNo,
                                                  offset)
                               });

              break;
            }
          }
        }

        return menuOptions;
      }
    });
  };

  // HOOK: Firebug.getRep ////////////////////////////////////////

  /**
   * Overrides the getRep method to allow our StackFrame representation
   * to be used in place of the bog-standard Firebug one.
   */
  clInspector.Helpers.hookFunction(Firebug, 'getRep', function(obj) {
    if (obj instanceof jsdIStackFrame) {
      return clInspector.Reps.JsdStackFrameRep;
    }

    return arguments.callee.$__Previous.apply(this, arguments);
  });

  // HOOK: Firebug.Debugger.startDebugging //////////////////////

  /**
   * Override the startDebugging method as a way to check if the
   * script panel has been modified properly.
   */
  clInspector.Helpers.hookFunction(Firebug.Debugger, 'startDebugging',

  function(context) {
    var panel = context.chrome.selectPanel("script");
    clInspector.Hooks.fixScriptPanel(context, panel);

    var stackPanel = context.chrome.selectPanel("callstack");
    clInspector.Hooks.fixStackPanel(context, stackPanel);

    return arguments.callee.$__Previous.apply(this, arguments);
  });


  ////////////////////////////////////////////////////////////////
  // "FireRainbow" Hooks
  ////////////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////////////////
  //                                                                //
  // "FireRainbow" is a Firebug extension will adds syntax colors   //
  // to source files in Firebug. Rather than reimplementing it      //
  // completely, Inspector can override it to support more complex  //
  // forms of syntax formatting, including the coloring. Note       //
  // this extension is not required to use Inspector, so we have a  //
  // check for FireRainbow's installation before we perform these   //
  // hooks.                                                         //
  //                                                                //
  ////////////////////////////////////////////////////////////////////

  // TODO(jschorr): Remove this once Firebug has fixed
  // their script panel view.
  if (false && clInspector.Helpers.getRainbow()) {
    var rainbow = clInspector.Helpers.getRainbow();

    // Disable the resumeDaemon and showPanel methods. clInspector
    // handles these calls itself for its own formatting system.
    rainbow.showPanel = function() {};
    rainbow.resumeDaemon = function() {};
    rainbow.startDaemon = function() {};
  }

  ////////////////////////////////////////////////////////////////
  // Officially Sanctioned Proper Way to Extend Firebug         //
  ////////////////////////////////////////////////////////////////

  clInspector.Hooks.setupSourceBoxHook = function(sourceBox) {

    sourceBox.inspectorPatched = true;
    sourceBox.formattedLines = {};
    sourceBox.lineState = {};

    var parserInfo = clInspector.Helpers.selectParser(sourceBox.lines);
    sourceBox.parserBase = parserInfo[0];
    sourceBox.isScript = parserInfo[1];

    var cLine = '';
    var stream = stringStream({
      next: function() {
        if (!cLine) {
          throw StopIteration;
        }

        var c = cLine;
        cLine = null;
        return c;
      }
    });

    stream.reinit = function(code) {
      cLine = code;
    };

    sourceBox.stream = stream;
    sourceBox.parser = sourceBox.parserBase.make(sourceBox.stream);

    clInspector.Helpers.hookFunction(sourceBox, 'getLineAsHTML',
        function(lineNo) {

      // If formatting is turned off, simply return the unformatted
      // line.
      if (!clInspector.Helpers.getPref("formatSourceCode")) {
        return  arguments.callee.$__Previous.apply(this, arguments);
      }

      // If we have the line already cached, load it up.
      if (sourceBox.formattedLines[lineNo]) {
        return sourceBox.formattedLines[lineNo];
      }

      // if we get here, we need to format this line and
      // all the other lines in the source box.
      var lines = sourceBox.lines;

      // Format the line.
      var state = sourceBox.lineState[lineNo];

      if (!state) {
        state = { indentation: 0 };
      }

      var nState = {
        indentation: state.indentation
      };

      var context = sourceBox.context || {};

      var line = lines[lineNo];
      var formatted = clInspector.Helpers.getRainbowSourceLineRange(
          context, sourceBox, nState, line, lineNo + 1, 3);

      sourceBox.formattedLines[lineNo] = formatted;
      sourceBox.lineState[lineNo + 1] = nState;

      // Return the source line value.
      return sourceBox.formattedLines[lineNo];
    });
  };

  // TODO(jschorr): Remove this once Firebug has fixed
  // their script panel view.
//   if (clInspector.Helpers.getRainbow()) {
//     clInspector.ClosureInspectorExtension = extend(Firebug.Extension, {
//       onApplyDecorator: function(sourceBox) {

//         // If the source box is already patched, no more
//         // work to do.
//         if (sourceBox.inspectorPatched) {
//           return;
//         }

//         clInspector.Hooks.setupSourceBoxHook(sourceBox);
//       }
//     });

//     Firebug.FireRainbowExtension.onApplyDecorator = function() { };

//     Firebug.registerExtension(clInspector.ClosureInspectorExtension);
//   }

}});
