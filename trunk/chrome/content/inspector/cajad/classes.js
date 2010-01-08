// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Helper classes for the Caja Debugger.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  /**
   * A reference to a source file used to generate a Caja module.
   *
   * @param {clInspector.CajaModule} module The module to which this source
   *   file belongs.
   * @param {string} file The name/path of the input file this object
   *   represents.
   *
   * @constructor
   */
  clInspector.CajaSourceFile = function(module, file) {
    this.name = file;
    this.href = 'caja://' + file;
    this.module = module;
    this.file = file;

    // Retrieve the source code of the file.
    this.source = module.getCajaContext().getContentLines(
        module.getBase()['originalSource'][file]);
  };

  clInspector.CajaSourceFile.prototype = {

    /**
     * Returns an array containing the mapping source lines in the generated
     * code that resulted from the generation of the specific line in this
     * file.
     *
     * @param {number} lineNumber The line number of the original line.
     *
     * @return {Array.<Object>} The list of generated lines.
     */
    getGeneratedLines: function(lineNumber) {
      var context = this.module.getCajaContext();
      return context.getGeneratedLinesFor(this.name, lineNumber);
    },

    /**
     * Firebug-required method on the source file. Returns the lines of
     * the source file.
     */
    loadScriptLines: function(context) {
      return this.source;
    }
  };

  ////////////////////////////////////////////////////////////////////

  /**
   * Represents a particular line in a CajaSourceFile.
   *
   * @param {clInspector.CajaSourceFile} file The source file.
   * @param {number} lineNo The line number.
   *
   * @constructor
   */
  clInspector.CajaSourceLocation = function(file, lineNo) {
    this.sourceFile = file;
    this.lineNo = lineNo;
  };

  ////////////////////////////////////////////////////////////////////

  /**
   * Wrapper class for holding information about a registered Caja
   * module.
   *
   * @param {clInspector.CajaContext} cajac The parent context of this
   *   module.
   * @param {string} scriptHref The defining script of this module.
   * @param {Object} module The Caja module in Caja-format.
   *
   * @constructor
   */
  clInspector.CajaModule = function(cajac, scriptHref, module) {
    this.cajac_ = cajac;
    this.baseModule_ = module;
    this.sources_ = [];
    this.scriptHref_ = scriptHref;

    this.buildSources_();
  };

  clInspector.CajaModule.prototype = {

    /**
     * Returns the CajaContext to which this module belongs.
     * @return {clInspector.CajaContext} The parent context.
     */
    getCajaContext: function() {
      return this.cajac_;
    },

    /**
     * Returns the underlying Caja module that this CajaModule
     * wraps.
     *
     * @return {Object} The underlying module.
     */
    getBase: function() {
      return this.baseModule_;
    },


    /**
     * Builds the list of input source files used to create the
     * underlying Caja module.
     *
     * @private
     */
    buildSources_: function() {
      var module = this.baseModule_;
      var originalSource = module['originalSource'];

      // Enable the sources menu if need be.
      if (originalSource) {
        for (var key in originalSource) {
          if (originalSource.hasOwnProperty(key)) {
            var sourceFile = new clInspector.CajaSourceFile(this, key);
            this.sources_.push(sourceFile);
          }
        }
      }
    },

    /**
     * Returns the URL of the script which defined this module.
     *
     * @return {string} The URL of the script.
     */
    getDefiningScriptURL: function() {
      return this.scriptHref_;
    },

    /**
     * Returns the list of source files that were used to generate
     * the underlying module.
     *
     * @return {Array.<clInspector.CajaSourceFile>} The source files.
     */
    getSources: function() {
      return this.sources_;
    },


    /**
     * Finds the source file in this module that matches the given
     * name or null if none was found.
     *
     * @param {string} name The name for which to search.
     *
     * @return {clInspector.CajaSourceFile?} The source file found or null
     *   for none.
     */
    findSource: function(name) {
      for (var i = 0; i < this.sources_.length; ++i) {
        var sourceFile = this.sources_[i];

        if (sourceFile.name == name) {
          return sourceFile;
        }
      }

      return null;
    }
  };

  ////////////////////////////////////////////////////////////////////

  /**
   * A wrapper class around a given context, holding all the Caja-specific
   * information for that context.
   *
   * @param {Object} context The context that the CajaContext wraps.
   *
   * @constructor
   */
  clInspector.CajaContext = function(context) {
    this.context = context;
    this.modules_ = [];
    this.moduleMap_ = {};
    this.sourceMaps_ = {};

    context[clInspector.Context.CAJA_CONTEXT] = this;
  };

  clInspector.CajaContext.prototype = {
    /**
     * Adds the given module to the context.
     *
     * @param {Object} module The Caja module in native format.
     * @param {string} scriptHref The URL of the script that contains the
     *   module.
     *
     * @return {clInspector.CajaModule} The CajaModule wrapper around the
     *   module.
     */
    addModule: function(module, scriptHref) {
      // Create the wrapper instance and add it to the modules list.
      var moduleWrapper = new clInspector.CajaModule(this, scriptHref,
                                                          module);
      this.modules_.push(moduleWrapper);
      this.moduleMap_[scriptHref] = moduleWrapper;

      // Build the source map for the given module.
      var sourceMapContents = this.getContentLines(module['sourceLocationMap']);

      if (sourceMapContents) {
        this.sourceMaps_[scriptHref] =
            clInspector.SourceMap.buildFrom(sourceMapContents, scriptHref);
      }

      return moduleWrapper;
    },

    /**
     * Returns the modules defined in this context.
     *
     * @return {Array.<clInspector.CajaModule>} The lists of modules.
     */
    getModules: function() {
      return this.modules_;
    },

    /**
     * Returns the code lines for the given native section in the Caja module.
     *
     * @param {Object} section A section of a Caja module (in native format).
     *
     * @return {Array.<string>} The content lines or null if none.
     */
    getContentLines: function(section) {
      if (!section) {
        return null;
      }

      if (section['content']) {
        return section['content'];
      } else {
        return getSourceLines(section['url']);
      }
    },


    /**
     * Finds the source map for the given script URL.
     *
     * @param {string} scriptURL The script URL.
     *
     * @return {clInspector.SourceMap?} The source map found or null for
     *   none.
     */
    findSourceMapForScript: function(scriptUrl) {
      return this.sourceMaps_[scriptUrl];
    },

    /**
     * Returns the generated line mappings for the original file and line
     * in that file.
     *
     * @param {string} originalName The name (path) of the original source file.
     * @param {number} lineNumber The line number in the original file.
     *
     * @return {Array.<Object>} The mappings to the generated file(s).
     */
    getGeneratedLinesFor: function(originalName, lineNumber) {
      var out = [];

      for (var key in this.sourceMaps_) {
        if (this.sourceMaps_.hasOwnProperty(key)) {
          var map = this.sourceMaps_[key];

          // Ignore empty maps.
          if (!map) {
            continue;
          }

          map.reverseMap(originalName, lineNumber, out);
        }
      }

      return out;
    },

    /**
     * Finds the CajaModule for the given script URL.
     *
     * @param {string} scriptURL The script URL.
     *
     * @return {clInspector.CajaModule?} The CajaModule found or null for
     *   none.
     */
    findModuleForScript: function(scriptUrl) {
      return this.moduleMap_[scriptUrl];
    }
  };

}});
