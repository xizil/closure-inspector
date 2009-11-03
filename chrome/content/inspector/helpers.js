// Copyright Google 2008 Inc. All Rights Reserved.

/**
 * @fileoverview Helper functions used throughout the extension.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  const nsIEnvironment = Ci.nsIEnvironment;
  const nsIFilePicker = Ci.nsIFilePicker;
  const nsIPrefBranch = Ci.nsIPrefBranch;
  const nsIPrefBranch2 = Ci.nsIPrefBranch2;

  const prefService = Cc["@mozilla.org/preferences-service;1"];
  const prefs = prefService.getService(nsIPrefBranch2);

  const envService = Cc["@mozilla.org/process/environment;1"];
  const envs = envService.getService(nsIEnvironment);

  const ciPrefDomain = "extensions.closure_inspector";

  var preferenceCache = {};

  ////////////////////////////////////////////////////////////////

  clInspector.Helpers = {};

  /** Trims the given string. */
  clInspector.Helpers.trimString = function(str) {
    return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
  };

  /**
   * Returns true if an environment variable with the given
   * name is defined in the context in which the extension is running.
   *
   * @param {string} varName The name of the environment variable.
   * @return {boolean} true if the variable is defined, false otherwise.
   */
  clInspector.Helpers.hasEnvVariable = function(varName) {
    return !!envs.exists(varName);
  };

  /**
   * Iterates over the given stack and calls the handler on each
   * frame found in the form of handler(frame, frameInfo);
   *
   * @param {Object} context The context.
   * @param {jsdIStackFrame} frame The starting stack frame.
   * @param {Function} handler The handler method to run for each stack
   *   frame.
   */
  clInspector.Helpers.iterateStack = function(context, frame, handler) {
    while (frame != null) {
      var frameInfo = clInspector.Helpers.getFrameInfo(frame, context);

      if (!frameInfo) {
        return;
      }

      handler(frame, frameInfo);
      frame = frame.callingFrame;
    }
  };

  /**
   * Returns the value of the environment variable with the given
   * name or null if none is defined.
   *
   * @param {string} varName The name of the environment variable.
   * @return {string?} The value or null if none.
   */
  clInspector.Helpers.getEnvVariable = function(varName) {
    if (!clInspector.Helpers.hasEnvVariable(varName)) {
      return null;
    }

    return envs.get(varName);
  };

  /**
   * Finds the full path of the given binary by checking the
   * local $PATH environment variable.
   *
   * @param {string} binary The name of the binary for which
   *   to search.
   *
   * @return {string?} The full path of the binary found or null
   *   if none.
   */
  clInspector.Helpers.findBinary = function(binary) {
    var file = CCIN("@mozilla.org/file/local;1", "nsILocalFile");

    // If the binary path given has no path seperators, then it is
    // merely the binary name and we need to search for it under
    // the $PATH environment variable.
    if (binary.indexOf('/') == -1 && binary.indexOf('\\') == -1) {
      // Check the $PATH.
      var path = clInspector.Helpers.getEnvVariable('PATH');

      if (!path) {
        return null;
      }

      var paths = path.split(':');

      for (var i = 0; i < paths.length; ++i) {
        var newPath = paths[i] + '/' + binary;
        file.initWithPath(newPath);

        if (file.exists()) {
          return newPath;
        }
      }

      return null;

    } else {
      // Check to see if the file exists.
      file.initWithPath(binary);

      if (!file.exists()) {
        return null;
      }

      return binary;
    }
  };


  /**
   * Displays the given source file in the user's IDE (as indicated
   * by the $EDITOR environment variable) and opens it to the given
   * line.
   *
   * @param {string} path The path of the file to be displayed.
   * @param {number} line The line number to display in the file.
   */
  clInspector.Helpers.displayFileInIDE = function(path, line) {
    if (!clInspector.Helpers.hasEnvVariable('EDITOR')) {
      alert('Original Source File: ' + path + '\n' +
            'Line Number:' + line);
      return;
    }

    // Retrieve the editor for the user.
    var editor = clInspector.Helpers.getEnvVariable('EDITOR');
    var editorBinary = editor;

    var lastSlash = editor.lastIndexOf('/');

    if (lastSlash == -1) {
      lastSlash = editor.lastIndexOf('\\');
    }

    if (lastSlash >= 0) {
      editorBinary = editor.substr(lastSlash + 1);
    }

    // Handle the supported binaries.
    var arguments = [];

    switch (editorBinary) {
      case 'emacs':
        arguments.push("+" + line);
        arguments.push(path);
      break;

      case 'vi':
      case 'vim':
      case 'gvim':
        arguments.push(path);
        arguments.push("+" + line);
      break;

      default:
        arguments.push(path);

        alert('The editor "' + editorBinary + '" is unsupported. The line ' +
              'number in the file is ' + line);
      break;
    }

    // Find the full path of the editor so we can open it.
    var editorPath = clInspector.Helpers.findBinary(editor);

    if (!editorPath) {
      alert('Original Source File: ' + path + '\n' +
            'Line Number:' + line);
      return;
    }

    // Launch the editor.
    FBL.launchProgram(editorPath, arguments);
  };


  /**
   * Adds to the specified panel the stylesheet found on the specified path.
   *
   * @param {Firebug.Panel} panel The panel to which to append the CSS.
   * @param {string} path The path to the stylesheet.
   */
  clInspector.Helpers.addStylesheetToPanel = function(panel, path) {
    var doc = panel.document;

    var styleSheet = createStyleSheet(doc, path);
    addStyleSheet(doc, styleSheet);
  };

  /**
   * Returns true if the specified string starts with the specified prefix.
   *
   * @param {string} str The string to search.
   * @param {string} prefix The prefix for which to search.
   *
   * @return {boolean} If the string starts with the prefix, returns true.
   */
  clInspector.Helpers.startsWith = function(str, prefix) {
    return str.indexOf(prefix) == 0;
  };


  /**
   * Returns true if the specified string ends with the specified suffic.
   *
   * @param {string} str The string to search.
   * @param {string} suffix The suffix for which to search.
   *
   * @return {boolean} If the string ends with the suffix, returns true.
   */
  clInspector.Helpers.endsWith = function(str, suffix) {
    var l = str.length - suffix.length;
    return l >= 0 && str.lastIndexOf(suffix, l) == l;
  };


  /**
   * Returns the mapped name (if any) of the given source file and source line.
   *
   * @param {Object} context The context.
   * @param {string} sourceHref The URL of the source file.
   * @param {number} lineNo The line number in the source file.
   * @param {number} offset The 0-based character position in the line.
   *
   * @return {string} The original name or null for none.
   */
  clInspector.Helpers.getMappedName =
      function(context, sourceHref, lineNo, offset) {
    return clInspector.MainModule.applyToDebuggers('getMappedName',
                                                        arguments);
  };


  /**
   * Returns information for the specified stack frame under the specified
   * context.
   */
  clInspector.Helpers.getFrameInfo = function(frame, context) {
    if (!frame.isValid) {
      return null;
    }

    var funcDescription = getFunctionName(frame.script, context);
    var funcName = funcDescription;
    var realName = null;

    var sourceHref = null;
    var sourceLine = null;

    var sourceFile = FBL.getSourceFileByScript(context, frame.script);
    if (!sourceFile) {
      return null;
    }

    var analyzer = sourceFile.getScriptAnalyzer(frame.script);

    sourceHref = sourceFile.href;
    sourceLine = analyzer.getSourceLineFromFrame(context, frame);

    // TODO(jschorr): Find the real offset.
    realName = clInspector.Helpers.getMappedName(
        context, sourceFile, sourceLine, 0);

    return {
      description: funcDescription,
      realName: realName,
      sourceFile: sourceFile,
      sourceHref: sourceHref,
      sourceLine: sourceLine
    };
  };


  /**
   * Hooks the specified function, replacing it with the newFunc function. This
   * method also provides a "$__Previous" variable on the new function so it can
   * call the older function.
   *
   * @param {Object} obj The object on which to replace the function.
   * @param {string} funcName The name of the function to replace.
   * @param {Function} newFunc The new function for the object.
   */
  clInspector.Helpers.hookFunction = function(obj, funcName, newFunc) {
    var oldFunc = obj[funcName];
    newFunc.$__Previous = oldFunc;
    obj[funcName] = newFunc;
  };


  /**
   * Augments the specified baseObj, adding any new members found in augm to it
   * and hooking any existing members via the hook funtion.
   *
   * @param {Object} baseObj The base object to augment.
   * @param {Object} augm The object from which to copy the key/value pairs
   *   to the base object.
   */
  clInspector.Helpers.augmentClass = function(baseObj, augm) {
    for (var key in augm) {
      if (baseObj[key]) {
        clInspector.Helpers.hookFunction(baseObj, key, augm[key]);
      } else {
        baseObj[key] = augm[key];
      }
    }
  };


  /**
   * Returns a reference to the Rainbow class, if any is defined.
   */
  clInspector.Helpers.getRainbow = function() {
    return Firebug.RainbowExtension || Firebug.FireRainbowExtension;
  };


  /**
   * Selects a parser for syntax coloring and formatting based on the
   * lines given.
   *
   * @param {Array.<String>} lines The first few lines of the source code.
   *
   * @return {Array} Index 0: The parser object selected, Index 1: Is it a
   *    JSParser.
   */
  clInspector.Helpers.selectParser = function(lines) {
    var firstLines = "";

    for (var i = 0; i < lines.length; ++i) {
      var line = lines[i].replace(/^\s*|\s*$/g,"");
      firstLines += line;
      if (line != "") break;
    }

    // If we have HTML, choose that parser.
    if (firstLines.indexOf('<html>') >= 0
        || firstLines.indexOf('<?xml') >= 0
        || firstLines.indexOf('<script>') >= 0
        || firstLines.indexOf('<script ') >= 0
        || firstLines.indexOf('<!DOCTYPE') >= 0
        || firstLines.indexOf('<head>') >= 0
        || firstLines.indexOf('<body>') >= 0
        || firstLines.indexOf('<!--') >= 0
        || firstLines.indexOf('<style') >= 0
        || firstLines.indexOf('<body ') >= 0) {
       return [HTMLMixedParser, false];
     }

    return [JSParser, true];
  };


  /**
   * Formats the specified source box, found in the given context, with the
   * state holding the current row and line to format.
   *
   * @param {Object} context The parent context of the source box.
   * @param {HTMLDivElement} sourceBox The source box containing the source to
   *   format.
   * @param {Object} state State information for the formatting. Implementation
   *   specific.
   *
   * @deprecated To be removed once we move everyone to FF3.
   */
  clInspector.Helpers.formatSourceBox = function(context, sourceBox, state) {
    // Check if we need to delay the formatting while scrolling or the mouse is
    // down.
    if (sourceBox.scrolling || sourceBox.mousedown) {
      if (sourceBox.scrolling) {
        sourceBox.scrolling = false;
      }

      clInspector.Helpers.throttle(
          context,
          clInspector.Helpers.formatSourceBox,
          [context, sourceBox, state]);

      return;
    }

    var cRow = state.start;
    var line = state.line;

    if (!cRow) {
      cRow = sourceBox.firstChild;
      line = 1;
    }

    if (!cRow || cRow.$__LBFormatted) {
      return;
    }

    cRow.$__LBFormatted = true;

    var i = 0;

    // Handle Rainbow parsing.
    if (line == 1 && clInspector.Helpers.getRainbow()) {

      if (!sourceBox.stream) {
        sourceBox.stream = Editor.rainbowStream();
      }

      // Determine the correct parser to use.
      // This is a modified version of the code
      // found in the Rainbow source file.
      var parser = JSParser;
      sourceBox.isScript = true;

      var firstLines = null;
      var cNode = cRow;

      while (cNode) {
        firstLines = cNode.textContent;
        firstLines = firstLines.replace(/^\s*|\s*$/g,"");
        if (firstLines != "") break;
        cNode = cNode.nextSibling;
      }

      // If we have HTML, choose that parser.
      if (firstLines.indexOf('<html>') > 0
          || firstLines.indexOf('<?xml') > 0
          || firstLines.indexOf('<script>') > 0
          || firstLines.indexOf('<script ') > 0
          || firstLines.indexOf('<!DOCTYPE') > 0
          || firstLines.indexOf('<head>') > 0
          || firstLines.indexOf('<body>') > 0
          || firstLines.indexOf('<!--') > 0
          || firstLines.indexOf('<style') > 0
          || firstLines.indexOf('<body ') > 0) {
        parser = HTMLMixedParser;
        sourceBox.isScript = false;
      }

      sourceBox.parser = parser.make(sourceBox.stream);
      sourceBox.onscroll = function() {
        sourceBox.scrolling = true;
      };

      sourceBox.onmousedown = function() {
        sourceBox.mousedown = true;
      };

      sourceBox.onmouseup = function() {
        sourceBox.mousedown = false;
      };
    }

    // Format the source code in chunks of 1 lines
    // to prevent it from blocking the browser.
    // TODO(jschorr): See if we can increase back up to
    // a more reasonable number than 1 once we move to FF3
    // with its ability to have background threads.
    while (i < 1 && cRow != null) {
      var lineNoChars = cRow.childNodes[0].textContent.length;
      var sourceCode = cRow.childNodes[1].textContent;

      if (clInspector.Helpers.getRainbow()) {
        cRow.childNodes[1].innerHTML =
            clInspector.Helpers.getRainbowSourceLineRange(
                context, sourceBox, state, sourceCode, line, lineNoChars);
      } else {
        cRow.childNodes[1].innerHTML =
            clInspector.Helpers.getFormattedSourceLineRange(
                sourceCode, line, lineNoChars);
      }

      ++i;
      ++line;
      cRow = cRow.nextSibling;
    }

    // Set a timer for the next invocation if need be.
    if (i >= 1 && cRow != null) {
      newState = {};
      newState.indentation = state.indentation;
      newState.start = cRow;
      newState.line = line;

      clInspector.Helpers.throttle(
          context,
          clInspector.Helpers.formatSourceBox,
          [context, sourceBox, newState]);

    } else {
      sourceBox.parser = null;
      sourceBox.stream = null;
    }
  };


  /**
   * Throttles the call to the given function by executing it after
   * a delay of 10ms.
   *
   * @param {Object} context The context under which to run the given
   *   function.
   * @param {Function} func The function to run.
   * @param {Array} args The arguments to the function.
   */
  clInspector.Helpers.throttle = function(context, func, args) {
    setTimeout(function() {
      func.apply(context, args);
    }, 10);
  };


  /**
   * Formats the specified sourceBox via the Rainbow extension's parsing model.
   *
   * @param {Object} context The context of the file being rendered.
   * @param {HTMLDivElement} sourceBox The source box containing the source to
   *   format.
   * @param {Object} state The internal state information for the formatting.
   * @param {string} line The line in the source to format.
   * @param {number} lineNumber The line number of the given line.
   * @param {number} maxLineNoChars The number of characters needed for
   *   displaying the line number in the source box.
   */
  clInspector.Helpers.getRainbowSourceLineRange =
   function(context, sourceBox, state, line, lineNumber, maxLineNoChars) {
    // TODO(jschorr): Major refactoring of this method.

    var code = line + '\n';

    sourceBox.stream.reinit(code);

    var that = clInspector.Helpers.getRainbow();

    if (!that.styleLibrary) {
      that.styleLibrary = {};
    }

    var newLines = []; // parts accumulated for current line
    var cLine = null;
    var cChar = 0;

    //// HELPERS /////////////////////////////////////////////

    /**
     * Starts a new line in the list.
     */
    function startNewLine() {
      // If we have more than a single newLine added
      // and the sourceBox does not contain a script
      // then we don't create a second newline. This
      // prevents odd formatting from appearing
      // in non-Javascript displays (such as HTML).
      if (newLines.length > 0 && !sourceBox.isScript) {
        return;
      }

      cLine =  { source : [],
                 rawSource : [],
                 hasText: false,
                 indentation : state.indentation };
      newLines.push(cLine);
    }

    /**
     * Increase the current indentation.
     */
    function increaseIndentation() {
      state.indentation += 2;
    }

    /**
     * Decreases the current indentation.
     */
    function decreaseIndentation() {
      state.indentation -= 2;
      cLine.indentation = state.indentation;
    }

    /**
     * Appends the specified formatted and raw source
     * to the current line.
     */
    function appendToLine(source, rawSource) {
      if (/^\s*$/.test(rawSource)) {
        return;
      }

      cLine.source.push(source);
      cLine.rawSource.push(rawSource);
      cLine.hasText = true;
    }

    function appendToken(token, previous) {
      var value = token.value;
      var style = token.style;

      var isNameToken = false;

      switch (style) {
        case 'js-localvariable':
        case 'js-variable':
        case 'js-variabledef':
        case 'js-property':
          isNameToken = (value != '|');
          break;
      }

      if (previous && previous.value == '.') {
        isNameToken = true;
      }

      var title = '(Generated Value Displayed)';

      if (!!clInspector.Helpers.getPref("dynamicReplacement") &&
          isNameToken) {
        var realNameInfo = clInspector.Helpers.getMappedName(
            context, sourceBox.repObject.href, lineNumber, cChar);

        if (realNameInfo) {
          title = 'Generated Value: ' + value;
          var newInfo =
              realNameInfo.handler.convertName(token, realNameInfo.name);
          value = newInfo.value;
          style = newInfo.style;
        }
      }

      appendToLine('<span class="' + style + '" characterOffset="' + cChar
                   + '" title="' + title + '">' + escapeHTML(value) +
                   '</span>',
                   token.value);

      // We increase the character offset by the *actual* token length,
      // as opposed to our replaced value.
      cChar += token.value.length;
    }

    /**
     * Appends the specified whitespace to the current line.
     */
    function appendWhitespace(space) {
      if (!sourceBox.isScript) {
        return;
      }

      cLine.source.push('<span class="whitespace">' + space + '</span>');
    }

    /**
     * Returns true if the current line is not the first
     * line and is empty.
     */
    function isOnNewLine() {
      return newLines.length > 0 && cLine.source.length == 0;
    }

    var opList = {'+' : 1, '-' : 1,  '=' : 1, '*' : 1,  '%' : 1,  '||' : 1,
                  '&&' : 1, '<' : 1, '>' : 1, '<=' : 1, '>=': 1, '==' : 1,
                  '!=' : 1, '?' : 1, ':' : 1, 'in' : 1};

    /**
     * Returns true if the specified token value is an operator.
     */
    function isOp(op) {
      return !!opList[op];
    }

    //// END HELPERS /////////////////////////////////////////


    // Start a new line as the default state.
    startNewLine();

    /**
     * The following is a modified version of the parse loop used
     * in Rainbow. Code extracted from rainbow.js on 9/11/2008.
     */

    var pNeedsLine = false;
    var insideForLoop = false;
    var pNeedsLineOrSemi = false;
    var previous = null;

    forEach(sourceBox.parser, function(token) {
      var val = token.value;
      val = val.replace(/^\s+|\s+$/, '');

      // Add a newline if the previous token requested it.
      if (pNeedsLine) {
        if (!isOnNewLine()) {
          startNewLine();
        }

        pNeedsLine = false;
      }

      // Special case: Semicolons
      if (pNeedsLineOrSemi) {
        if (val != ';') {
          startNewLine();
        }

        pNeedsLineOrSemi = false;
      }

      // Operator spacing
      if (isOp(val)) {
        appendWhitespace(' ');
      }

      // For loop handling for semi-colons.
      if (val == 'for') {
        insideForLoop = true;
      }

      if (val == ')') {
        insideForLoop = false;
      }

      // }
      if (val == '}') {
        if (!isOnNewLine()) {
          startNewLine();
        }

        decreaseIndentation();
      }

      // Append the actual token to the current line.
      appendToken(token, previous);

      // Operator and comma spacing.
      if (isOp(val) || val == ',') {
        appendWhitespace(' ');
      }

      // Semi-colon handling.
      if (val == ';') {
        if (insideForLoop) {
          appendWhitespace(' ');
        } else {
          pNeedsLine = true;
        }
      }

      // {
      if (val == '{') {
        pNeedsLine = true;
        increaseIndentation();
      }

      // }
      if (val == '}') {
        pNeedsLineOrSemi = true;
      }

      // Mark the token's style has being used in Rainbow.
      that.styleLibrary[token.style] = true;
      previous = token;
    });

    // Build the HTML.
    var html = [];

    for (var i = 0; i < newLines.length; ++i) {
      var line = newLines[i];

      var lineSource = line.source.join("");
      var rawSource = line.rawSource.join("");

      // Remove spurious newlines we might have added.
      if (!line.hasText) {
        continue;
      }

      // Make sure all line numbers are the same width (with a fixed-width font)
      var lineNo = lineNumber + "";
      while (lineNo.length < maxLineNoChars) {
         lineNo = " " + lineNo;
      }

      // Handle line continuations.
      if (i > 0) {
        html.push(
            '<div class="sourceRowContinutation"><a class="sourceLine">',
            lineNo,
            '</a><span class="sourceRowText">');
      }

      // Handle indentation.
      if (sourceBox.isScript && line.indentation > 0) {
        var indent = '';

        for (var j = 0; j < line.indentation; ++j) {
          indent += ' ';
        }

        lineSource = '<span class="whitespace">' + indent + '</span>'
            + lineSource;
      }

      // Add the line itself.
      html.push(lineSource);

      // Close continuation lines.
      if (i > 0) {
        html.push('</span></div>');
      }
    }

    return html.join("");
  };

  /**
   * Returns a formatted version of the specified line, with newlines
   * added after }, { and ;. This is used if Rainbow is not installed but
   * source formatting was requested.
   *
   * @param {string} line The line to format.
   * @param {number} lineNumber The line number of the line being formatted.
   * @param {number} maxLineNoChars The number of characters needed for
   *   displaying the line number in the source box.
   *
   * @deprecated To be removed once everyone is moved to FF3.
   */
  clInspector.Helpers.getFormattedSourceLineRange =
      function(line, lineNumber, maxLineNoChars) {
    var html = [];
    var newLines = [];

    var cLine = null;
    startNewLine(0);

    function startNewLine(index) {
      cLine =  { source : [], index : index  };
      newLines.push(cLine);
    }

    function appendToLine(source) {
      cLine.source.push(source);
    }

    var insideString = false;

    for (var j = 0; j < line.length; ++j) {
      var cChar = line[j];
      var nChar = '\n';
      var pChar = '\n';

      if (j > 0) {
        pChar = line[j - 1];
      }

      if (j < line.length - 1) {
        nChar = line[j + 1];
      }

      if (!insideString && nChar != '\n') {
        if (cChar == '{' || cChar == '}') {
          startNewLine(j);
        }
      }

      if (pChar !='\\' && (cChar == '"' || cChar == "'")) {
        insideString = !insideString;
      }

      appendToLine(cChar, j);

      if (cChar == '{' || cChar == ';') {
        if (!insideString && nChar != '\n') {
          startNewLine(j);
        }
      } else if (cChar == '}' && nChar != ';') {
        if (!insideString && pChar != '\n') {
          startNewLine(j);
        }
      }
    }

    for (var i = 0; i < newLines.length; ++i) {
      var line = newLines[i];

      // Remove suprious newlines we might have added.
      if (i > 0 && line.source.length == 0) {
        continue;
      }

      // Make sure all line numbers are the same width (with a fixed-width font)
      var lineNo = lineNumber + "";
      while (lineNo.length < maxLineNoChars) {
         lineNo = " " + lineNo;
      }

      if (i > 0) {
        html.push(
            '<div class="sourceRowContinutation"><a class="sourceLine">',
            lineNo,
            '</a><span class="sourceRowText" characterOffset="' + line.index
            + '">');
      }

      html.push(escapeHTML(line.source.join("")));

      if (i > 0) {
        html.push('</span>');
        html.push('</div>');
      }
    }

    return html.join("");
  };


  /**
   * Returns the index-th element with the specified class
   * which is a child of the specified node.
   *
   * @param {HTMLElement} node The HTML element under which to search.
   * @param {string} className The name of the class for which to search.
   * @param {number} index The index of the element found to return.
   */
  clInspector.Helpers.getSpecificElementByClass =
      function(node, className, index) {
    var element = FBL.getElementByClass(node, className);

    for (var i = 0; i < index && element; ++i) {
      element = FBL.getNextByClass(element, className);
    }

    return element;
  };


  /**
   * Creates an options menu item that gets its value from a preference
   * (as specified by option).
   *
   * @param {string} label The label to display in the menu item.
   * @param {string} option The key of the preference/option.
   * @param {Function} command The function to execute when the option is
   *   changed.
   *
   * @return {Object} The options menu item created.
   */
  clInspector.Helpers.createOptionMenu = function(label, option, command) {
    return {label: label + ' (Closure Inspector)', nol10n: true,
            type: "checkbox",
            checked: clInspector.Helpers.getPref(option),
            command: command};
  };


  /**
   * Gets the value of the preference with the specified name.
   *
   * @param {string} name The name/key of the preference.
   * @return {string?} The value found.
   */
  clInspector.Helpers.getPref = function(name) {
    // Code based on that found in Firebug.

    if (preferenceCache[name]) {
      return preferenceCache[name];
    }

    var prefName = ciPrefDomain + "." + name;

    var type = prefs.getPrefType(prefName);
    var value = null;

    if (type == nsIPrefBranch.PREF_STRING)
      value = prefs.getCharPref(prefName);
    else if (type == nsIPrefBranch.PREF_INT)
      value = prefs.getIntPref(prefName);
    else if (type == nsIPrefBranch.PREF_BOOL)
      value = prefs.getBoolPref(prefName);

    preferenceCache[name] = value;
    return value;
  };


  /**
   * Sets a preference with the specified name to the specified value.
   *
   * @param {string} name The name/key of the preference.
   * @param {string} value The new value for the preference.
   */
  clInspector.Helpers.setPref = function(name, value) {
    preferenceCache[name] = value;

    var prefName = ciPrefDomain + "." + name;

    var type = prefs.getPrefType(prefName);
    if (type == nsIPrefBranch.PREF_STRING)
      prefs.setCharPref(prefName, value);
    else if (type == nsIPrefBranch.PREF_INT)
      prefs.setIntPref(prefName, value);
    else if (type == nsIPrefBranch.PREF_BOOL)
      prefs.setBoolPref(prefName, value);
  };


  /**
   * Clears the preference with the specified name.
   * Subsequent calls to getPref will return the default value for the
   * preference as defined in prefs.js.
   *
   * @param {string} The name/key of the preference.
   */
  clInspector.Helpers.clearPref = function(name) {
    preferenceCache[name] = null;

    var prefName = ciPrefDomain + "." + name;
    return prefs.clearUserPref(prefName);
  };


  /**
   * Displays the given source line in the source view in Firebug.
   *
   * @param {Object} context The parent context of the source file.
   * @param {string} href The path/url of the source file.
   * @param {number} line The line to show.
   */
  clInspector.Helpers.showSourceLine = function(context, href, line) {
    Firebug.toggleBar(true, 'script');

    setTimeout(function() {
      var sourceLink =  new SourceLink(href, line, "js");
      context.getPanel("script", true).showSourceLink(sourceLink);
    }, 10);
  };


  /**
   * Binds a function to a given context and adds the given arguments
   * to its call.
   *
   * @param {Function} oldFunction The function to bind.
   * @param {Object} that The value of the "this" for the function.
   *
   * @return {Function} The bound function.
   */
  clInspector.Helpers.bind = function(oldFunction, that, var_args) {
    var otherArguments = arguments;

    return function() {
      var args = [];

      for (var j = 2; j < otherArguments.length; ++j) {
        args.push(otherArguments[j]);
      }

      for (var i = 0; i < arguments.length; ++i) {
        args.push(arguments[i]);
      }

      return oldFunction.apply(that, args);
    };
  };

}});
