// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Helper classes for the Closure Compiler Debugger.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  /**
   * A wrapper class around a given context, holding all the Compiler-specific
   * information for that context.
   *
   * @param {Object} context The context that the CompilerContext wraps.
   *
   * @constructor
   */
  clInspector.CompilerContext = function(context) {
    this.context = context;
    context[clInspector.Context.Compiler_CONTEXT] = this;

    // If a source map setting exists, load it.
    var mapPath = clInspector.Settings.getSettingForContext(
          this.context,
          clInspector.CompilerDebugger.Settings.S_MAPS_SOURCEMAP);

    if (mapPath) {
      this.loadSourceMap(mapPath);
    }
  };

  clInspector.CompilerContext.prototype = {
    /**
     * The source map for this context, if any.
     *
     * @type {clInspector.SourceMap}
     * @private
     */
    sourceMap_: null,

    /**
     * Returns the source map for this context, if any or null if none.
     * @return {clInspector.SourceMap?}
     */
    getSourceMap: function() {
      return this.sourceMap_;
    },


    /**
     * Loads and parses the source map found at the given path.
     * @param {string} path The path to the source map.
     */
    loadSourceMap: function(path) {
      var sourceLines = this.context.sourceCache.load(path);

      if (!sourceLines) {
        alert('Could not retrieve contents of source map given');
        return null;
      }

      this.sourceMap_ =
         clInspector.CompilerDebugger.Helpers.parseSourceMap(
             this.context,
             sourceLines,
             path);

      if (!this.sourceMap_) {
        alert('Could not open source map');
        return;
      }

      this.context.getPanel("clInspectorSourceMap", false)
         .updateDisplay_();
    },

    /**
     * Clears the source map loaded.
     */
    clearSourceMap: function() {
      this.sourceMap_ = null;

      clInspector.Settings.setSettingForContext(
          this.context,
          clInspector.CompilerDebugger.Settings.S_MAPS_SOURCEMAP,
          null);
    },
  };

}});
