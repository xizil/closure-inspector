// Copyright Google 2008 Inc. All Rights Reserved.

/**
 * @fileoverview DOM Layouts used by the extension.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  /**
   * The various layouts used throughout the extension. All must be
   * constructed via domplate.
   */
  clInspector.Layouts = {};

  /**
   * Layout for displaying the map of original source files for
   * a given compiled line.
   */
  clInspector.Layouts.SourceMapLineInfo = domplate({
    table: TABLE({"style" : "margin-left: 6px;"},
                 FOR("line", "$info",
                     TR({},
                        TD({"style": "font-size: 10px; color: blue;"}, "$line.lineStart"),
                        TD({"style": "font-size: 10px; color: black;"}, "-"),
                        TD({"style": "font-size: 10px; color: blue;"}, "$line.lineEnd"),
                        TD({"style": "font-size: 10px;"}, "$line.files")
                     ))
             )
    });

  /**
   * Layout for the source mapping panel when no valid source map is loaded.
   */
  clInspector.Layouts.NoSourceMapLoaded = domplate({
    message: DIV({style: "padding: 6px; padding-top: 10px; font-size: 12px; " +
                         "text-weight: bold; color: black"},
                  SPAN({}, "No source map assigned to the current page."),
                  BR(),
                  BR(),
                  UL({style: "padding: 2px; "},
                     LI({ style: "list-style-type: none; padding-bottom: 6px;"},
                        A({style: "cursor: pointer", onclick: "$chooseMapFile_" }, "Open Local File.")),
                     LI({style: "list-style-type: none "},
                        SPAN({}, "Enter URL: "),
                        INPUT({type: 'text', style: "border: 1px solid #CCCCCC; padding: 2px; width: 250px;", onkeypress: "$onUrlKeyPress_" }))))
    });

  /**
   * Layout for the source mapping panel when a source map is loaded.
   */
  clInspector.Layouts.SourceMapLoaded = domplate({
    table: DIV({ style: "padding: 6px; padding-top: 10px; font-size: 12px; "
                          + "text-weight: bold; color: black" },

                 SPAN({}, "Mapping file loaded."))
    });

  /**
   * Layout for the "Copy Stack" button in the Stack tab.
   */
  clInspector.Layouts.StackCopyButton = domplate({
    button : INPUT({ "type" : "button",
                     "value" : "Copy Stack",
                     "style" : "background: #EEEEEE; border: 1px solid black; "
                         + "font-size: 10px; margin: 6px; margin-bottom: 10px",
                     onclick: "$copyStackFrame" })
   });

  /**
   * Layout for the file seperator displayed in the stack.
   */
  clInspector.Layouts.FileSeperator =  domplate({
    div: DIV({"style": "background: #EEEEEE"},
             SPAN({"style": "color: black"}, "In File: "),
             SPAN({"style": "color: blue"}, "$frameInfo|getSourceFile")),

    getSourceFile : function(frameInfo) {
      return frameInfo.sourceHref;
    }
  });

  /**
   * Layout for displaying a stack frame.
   */
  clInspector.Layouts.StackFrame = domplate({
    frame: DIV({"label" : "$label"},
               SPAN({"label": "$label"}, "$frameInfo|getDescription"),
               SPAN({"label": "$label"}, "   "),
               SPAN({"label": "$label", "style": "color: blue"}, "$frameInfo|getRealName"),
               SPAN({"label": "$label"}, "   "),
               SPAN({"label": "$label", "style": "color: black"}, "Line: ", "$frameInfo|getSourceLine")),

     getDescription : function(frameInfo) {
       return frameInfo.description;
     },

     getRealName : function(frameInfo) {
       return frameInfo.realName ? frameInfo.realName.name : '';
     },

     getSourceLine : function(frameInfo) {
       return frameInfo.sourceLine;
     }
  });

  /**
   * Layout for the additions to the info tip (tooltip)
   * shown when hovering over a renamed variable or
   * property.
   */
  clInspector.Layouts.NameInfoTip = domplate({
     tip: DIV({"style": "color: $color"},
              "(Name Map: ", "$originalName", " --> ", "$name", ")")
          });

}});
