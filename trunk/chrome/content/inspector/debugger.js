// Copyright Google 2008 Inc. All Rights Reserved.

/**
 * @fileoverview The debugger abstract class.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

if (clInspector.wrongVersion) { return; }

clInspector.Debugger = {

  /**
   * Handler called when a new context is loaded.
   *
   * @param {Object} context The context.
   */
  onContextLoaded: function(context) {
    return null;
  },

  /**
   * Returns true if the debugger can source map from
   * the given source URL and line number under the given
   * context.
   *
   * @param {Object} context The context.
   * @param {string} sourceHref The URL of the script file being viewed.
   * @param {number} lineNo The line number in the script file.
   *
   * @return {boolean} true if a valid mapping exists, false otherwise.
   */
  canMap: function(context, sourceHref, lineNo) {
    return false;
  },

  /**
   * Returns the mapped name (if any) of the given source file and source line.
   *
   * @param {Object} context The context.
   * @param {string} sourceHref The URL of the source file.
   * @param {number} lineNo The line number in the source file.
   * @param {number} offset The 0-based character position in the line.
   *
   * @return {Object} The original name and this debugger in an object or null.
   */
  getMappedName: function(context, sourceHref, lineNo, offset) {
    return null;
  },

  /**
   * Converts the given formatted name into its original name.
   */
  convertName : function(token, originalName) {
    return token;
  },

  /**
   * Conducts the proper action to display the original source as
   * determined by the source map. Called when 'Show Original Source'
   * is chosen in the script view.
   *
   * @param {Object} context The context.
   * @param {string} sourceHref The URL of the script file being viewed.
   * @param {number} lineNo The line number in the script file.
   * @param {number} offset The 0-indexed character offset in the line.
   */
  showMappedSource : function(context, sourceHref, lineNo, offset) {
  }
};

}});
