// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Helper functions for the Closure Compiler
 * debugger.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  const nsIFilePicker = Ci.nsIFilePicker;

  clInspector.CompilerDebugger.Helpers = {};

  /**
   * Prompts the user to set the root path for the given
   * context. If the user specifies a folder, the path is
   * saved into the settings file for that user and the path
   * is returned by this method.
   *
   * @param {Object} context The context for which the user is being
   *   prompted to set the root path.
   *
   * @return {string?} The path set or null if none.
   */
  clInspector.CompilerDebugger.Helpers.promptToSetRootPath =
      function(context) {
    var fp = CCIN("@mozilla.org/filepicker;1", "nsIFilePicker");

    // Initialize the file picker.
    fp.init(window, "Select the root folder of the uncompiled JS",
            nsIFilePicker.modeGetFolder);

    if (fp.show() == nsIFilePicker.returnOK) {
      clInspector.Settings.setSettingForContext(
          context,
          clInspector.CompilerDebugger.Settings.S_MAPS_ROOTPATH,
          fp.file.path);

      return fp.file.path;
    }

    return null;
  };


  /**
   * Returns the root path for the given context. If none is
   * set, the user is prompted to set one.
   *
   * @param {Object} context The context for which to get the root
   *   path.
   *
   * @return {string?} The path or null if none.
   */
  clInspector.CompilerDebugger.Helpers.getRootPath = function(context) {
    // Check the settings for the context first.
    var rootPath =
        clInspector.Settings.getSettingForContext(
            context,
            clInspector.CompilerDebugger.Settings.S_MAPS_ROOTPATH);

    if (!rootPath) {
      rootPath =
          clInspector.CompilerDebugger.Helpers.promptToSetRootPath(
              context);
    }

    return rootPath;
  };


  /**
   * Parses the source map and places it into the context.
   *
   * @param {Object} context The parent context of the current source map.
   * @param {Array.<string>} sourceLines The source lines of the source map
   *   file.
   * @param {string} url The url/path of the source map.
   */
  clInspector.CompilerDebugger.Helpers.parseSourceMap =
      function(context, sourceLines, url) {
    var sourceMap = clInspector.SourceMap.buildFrom(sourceLines, url);

    if (!sourceMap) {
      return null;
    }

    // Save the map in the settings.
    clInspector.Settings.setSettingForContext(
        context,
        clInspector.CompilerDebugger.Settings.S_MAPS_SOURCEMAP,
        url);

    return sourceMap;
  };

}});
