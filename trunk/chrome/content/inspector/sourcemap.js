// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Source Map handlers.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

   if (clInspector.wrongVersion) { return; }

   var Ci = Components.interfaces;
   var Cc = Components.classes;
   var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);

  /**
   * Private constructor for creating a source map.
   *
   * @constructor
   */
  clInspector.SourceMap = function(scriptHref) {

    /**
     * Mapping of character positions on a line (the array index)
     * to its associated mapping ID, if any. -1 means no mapping
     * exists, undefined means use the previously found mapping.
     *
     * @type {Array.<number>}
     * @private
     */
    this.lineCharMap_ = [];

    /**
     * Mapping of the list of source files used to construct the line
     * (the index in the array).
     *
     * @type {Array.<Array.<string>>}
     * @private
     */
    this.lineFilesMap_ = [];

    /**
     * The mappings in the source map. Each element is a string before lazy
     * evaluation, and an Array afterwards.
     *
     * @type {Array.<string>|Array.<Array>}
     * @private
     */
    this.mappings_ = [];

    /**
     * The URL of the script that this source map represents.
     *
     * @type {string}
     * @private
     */
    this.scriptHref_ = scriptHref;
  };

  /**
   * Parses the given lines and builds a source map from them. Returns
   * the source map constructed or null if an error occurred.
   *
   * @return {clInspector.SourceMap?} The source map created or null if
   *   an error.
   */
  clInspector.SourceMap.buildFrom = function(sourceLines, scriptHref) {
    var sourceMap = new clInspector.SourceMap(scriptHref);

    var firstLineHeader = "/** Begin line maps. **/";
    var filesSeperator = "/** Begin file information. **/";
    var mappingSeperator = "/** Begin mapping definitions. **/";

    if (sourceLines.length < 4) {
      return null;
    }

    // Check the first line for the beginning header
    // and eval it to get the total line count for this
    // source mapping file.
    var line = clInspector.Helpers.trimString(sourceLines[0]);
    if (line.indexOf(firstLineHeader) != 0) {
      if (line.indexOf("source map") > 0) {
        // Attempt to use a future version of the source map
        // specification.
        alert('The source map that was loaded is of an incompatible version. '
              + 'Please upgrade Closure Inspector.');
      }

      return null;
    }

    var jsonStart = line.indexOf('{');

    if (jsonStart < 0) {
      return null;
    }

    var jsonSource = line.substring(jsonStart);
    var firstLine = null;

    try {
      firstLine = nativeJSON.decode(jsonSource);
    } catch (e) {
      return null;
    }

    if (!firstLine) {
      return null;
    }

    if (!('count' in firstLine)) {
      return null;
    }

    if (typeof firstLine.count != 'number') {
      return null;
    }

    var lineCount = firstLine.count;
    var sLine = 1;

    // Build the line character maps.
    for (var i = 0; i < lineCount; ++i) {
      line = clInspector.Helpers.trimString(sourceLines[sLine + i]);

      if (line && line.indexOf("/*") >= 0) {
        return null;
      }

      sourceMap.lineCharMap_[i] = [];

      if (line) {
        try {
          sourceMap.lineCharMap_[i] = nativeJSON.decode(line);
        } catch (e) {
          return null;
        }
      }
    }

    sLine += lineCount;

    // Check for the files header.
    line = clInspector.Helpers.trimString(sourceLines[sLine]);

    if (line != filesSeperator) {
      return null;
    }

    sLine++;

    // Build the line files maps.
    for (var i = 0; i < lineCount; ++i) {
      line = clInspector.Helpers.trimString(sourceLines[sLine + i]);

      if (line && line.indexOf("/*") >= 0) {
        return null;
      }

      sourceMap.lineFilesMap_[i] = [];

      if (line) {
        try {
          sourceMap.lineFilesMap_[i] = nativeJSON.decode(line);
        } catch (e) {
          return null;
        }
      }
    }

    sLine += lineCount;

    // Check for the mappings header.
    line = clInspector.Helpers.trimString(sourceLines[sLine]);

    if (line != mappingSeperator) {
      return null;
    }

    sLine++;

    // Handle the remaining lines.
    var mapID = 0;

    for (var i = sLine; i < sourceLines.length; ++i) {
      line = clInspector.Helpers.trimString(sourceLines[i]);
      sourceMap.mappings_[mapID] = line;
      ++mapID;
    }

    return sourceMap;
  };

  ////////////////////////////////////////////////////////////////////

  clInspector.SourceMap.prototype = {
    /**
     * Returns true if the source mapping has a mapping defined
     * for the given line number.
     *
     * @param {number} lineNumber The line number to check.
     *
     * @return {boolean} true if a source mapping exists, false otherwise.
     */
    hasSourceMapping: function(lineNumber) {
      var mapping = this.getSourceMappingsForLine(lineNumber);
      return !!mapping && mapping.length > 0;
    },


    /**
     * Returns the mapping for the given character on the given line in the
     * generated source file represented by this source map.
     *
     * @param {number} lineNumber The line number for which to retrieve
     *   the mapping.
     * @param {number} offset The character position on the given line
     *   for which to retrieve the mapping.
     *
     * @return {Array?} The mapping found or null if none.
     */
    getSourceMapping: function(lineNumber, offset) {
      var lineCharMap = this.getSourceMappingsForLine(lineNumber);

      if (!lineCharMap) {
        return null;
      }

      // Search backwards in the character map until we find a defined
      // mapping ID. This is needed because characters that repeat the
      // previous mapping ID have an 'undefined' entry in the map for
      // space reasons.
      while (lineCharMap[offset] === undefined && offset >= 0) {
        offset--;
      }

      if (offset >= 0) {
        var mapID = lineCharMap[offset];

        if (mapID >= 0) {
          return this.getMappingById(mapID);
        }
      }
      return null;
    },


    /**
     * Returns the character map for the given source line.
     * @param {number} lineNumber The line number for which to retrieve
     *   the character mapping.
     *
     * @return {Array.<number>?} The character mapping array or null if none.
     */
    getSourceMappingsForLine: function(lineNumber) {
      return this.lineCharMap_[lineNumber - 1];
    },


    /**
     * Returns the mapping with the given ID found in the source map.
     * @param {number} mapID The ID of the mapping to find.
     *
     * @return {Array?} The mapping found or null if none.
     */
    getMappingById: function(mapID) {
      if (mapID == -1 || mapID === undefined) {
        return null;
      }

      var mapping = this.mappings_[mapID];

      // Just-In-Time evaluate the mapping itself. If the mapping
      // is a string, turn it into the array that is expected by
      // decoding it via the JSON decoder.
      if (typeof mapping == 'string') {
        try {
          mapping = nativeJSON.decode(mapping);
        } catch (e) {
          alert('Error parsing mapping');
          mapping = {};
        }

        this.mappings_[mapID] = mapping;
        mapping.id = mapID;
      }

      return mapping;
    },

    /**
     * Returns the list of source files that generated the given line
     * in the generated file that this map represents.
     *
     * @param {number} lineNumber The line number to check.
     *
     * @return {Array.<string>?} The source files or null if none.
     */
    getFilesForLine: function(lineNumber) {
      return this.lineFilesMap_[lineNumber - 1];
    },

    /**
     * Performs a reverse mapping, mapping the given *original* source file
     * and line in that file to one or more generated lines.
     *
     * @param {string} originalPath The path of the original file.
     * @param {number} lineNumber The line in the original file.
     * @param {Array.<Object>} out The array in which the reverse mapping
     *   results will be placed.
     */
    reverseMap: function(originalPath, lineNumber, out) {
      for (var i = 0; i < this.lineFilesMap_.length; ++i) {
        var entry = this.lineFilesMap_[i];
        var index = entry.indexOf(originalPath);

        if (index < 0) {
          continue;
        }

        // We have found a line mapping to the original source file. Find all
        // entries pointing to the correct line.
        var lineCharMap = this.lineCharMap_[i];

        for (var k = 0; k < lineCharMap.length; ++k) {
          var mapping = this.getMappingById(lineCharMap[k]);

          if (!mapping) {
            continue;
          }

          if (mapping[1] == lineNumber) {
            out.push({
               scriptHref: this.scriptHref_,
               lineNo: i + 1
            });
          }
        }
      }
    }
  };

};
});
