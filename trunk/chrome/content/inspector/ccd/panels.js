// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Panels for the Closure Compiler Debugger.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */


FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  /**
   * Source Mapping Panel
   *
   * @constructor
   */
  clInspector.CompilerDebugger.SourceMapPanel = function() {};

  clInspector.CompilerDebugger.SourceMapPanel.prototype =
      extend(Firebug.Panel, {

    // --------------------------------------------------
    // extends Firebug.Panel

    order: 1,
    parentPanel: "script",

    show: function() {
      this.updateDisplay_();
    },

    name: "clInspectorSourceMap",
    title: "Source Mapping",


    // --------------------------------------------------
    // local implementation

    loadedLayout: clInspector.Layouts.SourceMapLoaded,
    notLoadedLayout: clInspector.Layouts.NoSourceMapLoaded,

    /**
     * Updates the display (i.e. the DOM) of the current panel.
     */
    updateDisplay_: function() {
      this.panelNode.innerHTML = '';

      var ccc = this.context[clInspector.Context.COMPILER_CONTEXT];
      var loaded = ccc && !!ccc.getSourceMap();

      if (loaded) {
        this.loadedLayout.table.append(
          { object: this }, this.panelNode, this.loadedLayout);

      } else {
        this.notLoadedLayout.message.append(
          { object: this }, this.panelNode, this);
      }
    },


    /**
     * Event handler for when a key is pressed in the
     * "Enter URL" input field on the panel.
     */
    onUrlKeyPress_: function(event) {
      if (event.keyCode == 13 /* ENTER */) {
        var url = event.target.value;
        this.loadUrl_(url);
      }
    },

    /**
     * Displays the "Select name mapping" dialog box.
     */
    chooseMapFile_: function() {
      var fp = CCIN("@mozilla.org/filepicker;1", "nsIFilePicker");

      // Initialize the file picker.
      fp.init(window, "Select a local map file",
              Ci.nsIFilePicker.modeOpen);

      if (fp.show() == Ci.nsIFilePicker.returnOK) {
        this.loadLocalFile_(fp.file);
      }
    },

    unloadMapFile_: function() {
      var ccc = this.context[clInspector.Context.COMPILER_CONTEXT];
      ccc.clearSourceMap();
      this.updateDisplay_();
    },

    loadUrl_: function(url) {
      var ccc = this.context[clInspector.Context.COMPILER_CONTEXT];
      ccc.loadSourceMap(url);
    },

    loadLocalFile_: function(file) {
      var ccc = this.context[clInspector.Context.COMPILER_CONTEXT];
      ccc.loadSourceMap('file:///' + file.path);
    },

    /**
     * Displays which source files were compiled to create the given
     * source rows in the compiled source file currently being shown
     * in the script panel.
     *
     * @param {Array.<HTMLDivElement>} sourceRows The rows on screen.
     */
    displayFileInfo: function(sourceRows) {
      // Show the aggregated information.
      var info = [];

      var lastInfo = null;

      for (var i = 0; i < sourceRows.length; ++i) {
        var sourceLine = getChildByClass(sourceRows[i], "sourceLine");

        if (!sourceLine) {
          return;
        }

        var lineNo = parseInt(sourceLine.textContent, 10);

        var ccc = this.context[clInspector.Context.COMPILER_CONTEXT];

        var files = ccc && ccc.getSourceMap() &&
            ccc.getSourceMap().getFilesForLine(lineNo);

        if (files) {
          // Check to see if the current files list is the same as the
          // previous line. If so, we can simply add the current line number
          // to the valid range for the current list of files.
          var same = lastInfo && lastInfo.files.length == files.length;

          for (var j = 0; same && j < lastInfo.files.length; ++j) {
            same = lastInfo.files[j] == files[j];
          }

          if (same) {
            lastInfo.lineEnd++;
            continue;
          }

          var cInfo = { lineStart: lineNo, lineEnd: lineNo, files: files };
          lastInfo = cInfo;
          info.push(cInfo);
        }
      }

      // Add the information to the panel node.
      this.panelNode.innerHTML = '';

      clInspector.Layouts.SourceMapLineInfo.table.append(
          { object: this, info: info },
      this.panelNode, this);
    },

    /**
     * Prompts the user to set his or her rootPath path for the
     * current context.
     */
    setRootPath_: function() {
      clInspector.CompilerDebugger.Helpers.promptToSetRootPath(
          this.context);
    },

    getOptionsMenuItems: function() {
      var options = [];

      options.push({
        label: "Select Local map file",
        nol10n: true,
        command: bindFixed(this.chooseMapFile_, this, true)
      });

      var ccc = this.context[clInspector.Context.COMPILER_CONTEXT];
      if (ccc && ccc.getSourceMap()) {
          options.push({
            label: "Unload map file",
            nol10n: true,
            command: bindFixed(this.unloadMapFile_, this, true)
          });
      }

      var label = 'Set Root Source File Path';

      var rootPath = clInspector.Settings.getSettingForContext(
          this.context,
          clInspector.CompilerDebugger.Settings.S_MAPS_ROOTPATH);

      if (rootPath) {
        label = 'Change Root Source File Path: ' + rootPath;
      }

      options.push({
        label: label,
        nol10n: true,
        command: bindFixed(this.setRootPath_, this, true)
      });

      return options;
    }
  });

  /**
   * Registration
   */
  Firebug.registerPanel(clInspector.CompilerDebugger.SourceMapPanel);

}});
