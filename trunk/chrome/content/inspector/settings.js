// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Helper class used to get and set settings from
 *   the Inspector settings file.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  var Ci = Components.interfaces;
  var Cc = Components.classes;
  var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);

  clInspector.Settings = {};

  /**
   * Retrieves the global settings object.
   *
   * @param {object} context The context to use to retrieve the settings
   *   from the file. Can be any context.
   *
   * @return {object} The settings object.
   */
  clInspector.Settings.getSettings = function(context) {
    if (clInspector.Settings.cached_) {
      return clInspector.Settings.cached_;
    }

    clInspector.Settings.cached_ = {};

    var settingsFile = clInspector.Helpers.getPref('settingsFile');

    if (!settingsFile) {
      return clInspector.Settings.cached_;
    }

    var lines = context.sourceCache.load('file:///' + settingsFile);

    if (!lines) {
      alert('The saved settings file path is invalid.');
      return null;
    }

    var source = lines.join('\n');
    var settings = null;

    try {
      settings = nativeJSON.decode(source);
    } catch (e) {
      alert('Could not parse settings file');
      return null;
    }

    clInspector.Settings.cached_ = settings;
    return settings;
  };


  /**
   * Saves the settings to the settings file.
   *
   * @param {object} context The context to use to retrieve/save
   *  the settings from/to the file. Can be any context.
   */
  clInspector.Settings.saveSettings = function(context) {
     var settings = clInspector.Settings.getSettings(context);

     // Attempt to load the settings file path from the preferences.
     var settingsFile = clInspector.Helpers.getPref('settingsFile');

     if (!settingsFile) {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;

        var fp = Components.classes[
            "@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

        // Initialize the file picker.
        fp.init(window,
                "Select a destination for your Closure Inspector settings file",
                nsIFilePicker.modeSave);

        if (fp.show() != nsIFilePicker.returnCancel) {
          settingsFile = fp.file.path;
          clInspector.Helpers.setPref('settingsFile', settingsFile);
        }
     }

     // Save the settings to the file.
     var file = CCIN("@mozilla.org/file/local;1", "nsILocalFile");

     file.initWithPath(settingsFile);

     var outputStream = CCIN("@mozilla.org/network/file-output-stream;1",
                             "nsIFileOutputStream");

     // Flag Information: https://developer.mozilla.org/en/PR_Open#Parameters
     outputStream.init( file, 0x04 | 0x08 | 0x20, 420, 0 );
     var output = nativeJSON.encode(settings);
     var result = outputStream.write(output, output.length);
     outputStream.close();
  };


  /**
   * Sets the value of a given setting for the given context.
   *
   * @param {object} context The context for which to set the setting.
   * @param {string} key The settings key.
   * @param {string} value The new value for that setting.
   */
  clInspector.Settings.setSettingForContext =
      function(context, key, value) {
    var block = clInspector.Settings.getSettingObjForContext_(context);

    if (block[key] == value) {
      return;
    }

    block[key] = value;

    // Write the setting file.
    clInspector.Settings.saveSettings(context);
  };


  /**
   * Gets the value of a given setting for the given context.
   *
   * @param {object} context The context for which to get the setting.
   * @param {string} key The settings key.
   *
   * @return {object?} The value of the setting for the context.
   */
  clInspector.Settings.getSettingForContext = function(context, key) {
    return clInspector.Settings.getSettingObjForContext_(context)[key];
  };

  /**
   * Retrieves the settings block for the given context by the
   * context's URL.
   *
   * @param {object} context The context for which to retrieve
   *   the settings.
   *
   * @return {object} The settings block for that context. If none
   *   existed, a new one is created.
   */
  clInspector.Settings.getSettingObjForContext_ = function(context) {
    var settings = clInspector.Settings.getSettings(context);
    var contextBased = settings[clInspector.Settings.S_CONTEXT];

    if (!contextBased) {
      settings[clInspector.Settings.S_CONTEXT] = contextBased = [];
    }

    for (var i = 0; i < contextBased.length; ++i) {
      var block = contextBased[i];

      if (block[clInspector.Settings.S_URL] ==
          context.window.location.href.toString()) {

        return block;
      }
    }

    var newObject = {};
    newObject[clInspector.Settings.S_URL] =
       context.window.location.href.toString();
    contextBased.push(newObject);
    return newObject;
  };


  ////////////////////////////////////////////////////////////////
  // Settings                                                   //
  ////////////////////////////////////////////////////////////////

  /**
   * Key used for contextually-based settings (internal)
   */
  clInspector.Settings.S_CONTEXT = 'context';

  /**
   * Key used to map a contextually-based setting to a given URL.
   * (internal).
   */
  clInspector.Settings.S_URL = 'url';

}});
