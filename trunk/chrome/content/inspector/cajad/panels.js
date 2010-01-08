// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Implements the various panels used by the Caja Debugger.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  clInspector.CajaDebugger.MainPanel = function() {};

  /**
   * Whether the Caja panel has been registered.
   */
  clInspector.CajaDebugger.MainPanel.isRegistered = false;

  clInspector.CajaDebugger.MainPanel.prototype =
      extend(Firebug.SourceBoxPanel, {

    // --------------------------------------------------
    // extends Panel

    name: "caja-source",
    searchable: true,
    title: "Caja Source",

    initialize: function() {
      Firebug.SourceBoxPanel.initialize.apply(this, arguments);

      this.initializeSourceBoxes();
    },

    /** @inheritDoc */
    getDecorator: function(sourceBox) {
      if (!this.decorator)
        this.decorator = bind(this.decorateCajita, this, sourceBox);
      return this.decorator;
    },

    /**
     * Decorator method called by the sourcebox when it refreshes. Used to
     * ensure breakpoints are displayed.
     */
    decorateCajita: function(sourceBox) {
      this.showBreakpoints(sourceBox);
    },

    /**
     * Shows the breakpoints for all lines in the given source box.
     */
    showBreakpoints: function(sourceBox) {
      var sourceFile = sourceBox.repObject;
      var module = sourceFile.module;
      var definingScript = module.getDefiningScriptURL();

      // Remove all breakpoints.
      for (var i = sourceBox.firstViewableLine;
           i <= sourceBox.lastViewableLine; ++i) {
        var lineNode = sourceBox.getLineNode(i);

        if (lineNode) {
          lineNode.setAttribute("breakpoint", "false");
          lineNode.setAttribute("disabledBreakpoint", "false");
          lineNode.setAttribute("condition", "false");
        }
      }

      var callHandler = function(url, line, props, script) {
        // Find the associated line in the original source.
        var sourceMap =
          module.getCajaContext().findSourceMapForScript(definingScript);
        var mappings = sourceMap.getSourceMappingsForLine(line);

        if (!mappings) {
          return;
        }

        // For each of the mappings for the line, add a breakpoint
        // if necessary.
        for (var i = 0; i < mappings.length; ++i) {
          var mapping = sourceMap.getSourceMapping(line, i + 1);

          if (mapping) {
            var originalLine = mapping[1];

            var scriptRow = sourceBox.getLineNode(originalLine);
            if (scriptRow) {
              scriptRow.setAttribute("breakpoint", "true");
              if (props && props.disabled)
                scriptRow.setAttribute("disabledBreakpoint", "true");
              if (props && props.condition)
                scriptRow.setAttribute("condition", "true");
            }
          }
        }
      };

      // Add the breakpoints that exist.
      fbs.enumerateBreakpoints(definingScript, {
        call: callHandler
      });
    },

    getScriptFileByHref: function(url) {
      return this.context.sourceFileMap[url];
    },

    /**
     * Toggles a the prescence of a breakpoint on the given line.
     * @param {number} lineNo The line number.
     */
    toggleBreakpoint: function(lineNo) {
      var sourceFile = this.selectedSourceBox.repObject;

      if (!sourceFile) {
        return;
      }

      var generatedLines = sourceFile.getGeneratedLines(lineNo);
      var lineNode = this.selectedSourceBox.getLineNode(lineNo);

      for (var i = 0; i < generatedLines.length; ++i) {
        var line = generatedLines[i];

        if (lineNode.getAttribute("breakpoint") == "true") {
          fbs.clearBreakpoint(line.scriptHref, line.lineNo);
        } else {
          // Find the associated source file.
          var generatedSourceFile = this.getScriptFileByHref(line.scriptHref);

          // Set the breakpoint.
          fbs.setBreakpoint(generatedSourceFile, line.lineNo, null,
                            Firebug.Debugger);
        }
      }

      // Refresh the decorator.
      this.showBreakpoints(this.selectedSourceBox);
    },

    /** @inheritDoc */
    getContextMenuItems: function(fn, target) {
      return [];
    },

    /** @inheritDoc */
    getOptionMenuItems: function(context) {
      return [];
    },

    /** @inheritDoc */
    show: function() {
      this.showToolbarButtons("lbCajaSourceButtons", true);
      Firebug.SourceBoxPanel.show.apply(this, arguments);

      // Reapply the decorator, so that breakpoints remain in sync.
      if (this.selectedSourceBox) {
        this.applyDecorator(this.selectedSourceBox);
      }
    },

    /** @inheritDoc */
    hide: function() {
      this.showToolbarButtons("lbCajaSourceButtons", false);
      Firebug.SourceBoxPanel.hide.apply(this, arguments);
    },

    /** @inheritDoc */
    supportsObject: function(obj) {
      if (obj instanceof clInspector.CajaSourceLocation) {
        return 100;
      }

      return 0;
    },

    /** @inheritDoc */
    updateSelection: function(obj) {
      if (obj instanceof clInspector.CajaSourceLocation) {
        this.showSourceFile(obj.sourceFile);

        var that = this;
        setTimeout(function() {
          that.scrollToLine(obj.sourceFile.href, obj.lineNo,
                            that.jumpHighlightFactory(obj.lineNo,
                                                      that.context));
        }, 200);
      }
    },

    // --------------------------------------------------
    // UI event listeners

    onMouseDown: function(event) {
      var sourceLine = getAncestorByClass(event.target, "sourceLine");
      if (!sourceLine)
        return;

      var sourceRow = sourceLine.parentNode;
      var sourceFile = sourceRow.parentNode.repObject;
      var lineNo = parseInt(sourceLine.textContent);

      if (isLeftClick(event)) {
        this.toggleBreakpoint(lineNo);
      }
    },

    // --------------------------------------------------
    // extends SourceBoxPanel

    getSourceType: function() {
      return "html";
    },

    initializeNode: function(oldPanelNode) {
      this.onMouseDownHandler = bind(this.onMouseDown, this);
      this.panelNode.addEventListener("mousedown", this.onMouseDownHandler,
                                      true);
    },

    destroyNode: function() {
      this.panelNode.removeEventListener("mousedown", this.onMouseDownHandler,
                                         true);
    }
  });

  // No registeration the panel, as we don't want it to appear unless
  // a Caja page is open.
  // Firebug.registerPanel(clInspector.CajaDebugger.MainPanel);

}});
