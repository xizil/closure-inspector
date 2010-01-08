// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Implements the main module of the CajaDebugger, an inspector
 * debugger for Caja-generated code.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

 if (clInspector.wrongVersion) { return; }

 clInspector.CajaDebugger =  extend(clInspector.Debugger, {

   // --------------------------------------------------
   // extends clInspector.Debugger

   /**
    * @inheritDoc
    */
   canMap: function(context, sourceHref, lineNo) {
     // TODO(jschorr): Compute the offset to the function top
     // properly.
     var sourceLine = lineNo - 2;
     var cajac = context[clInspector.Context.CAJA_CONTEXT];

     if (!cajac) {
       return false;
     }

     var sourceMap = cajac.findSourceMapForScript(sourceHref);

     if (!sourceMap) {
       return false;
     }

     return sourceMap.hasSourceMapping(sourceLine);
   },

   /**
    * @inheritDoc
    */
   showMappedSource: function(context, sourceHref, lineNo, offset) {
     // TODO(jschorr): Compute the offset to the function top
     // properly.
     var sourceLine = lineNo - 2;
     var cajac = context[clInspector.Context.CAJA_CONTEXT];
     var sourceMap = cajac.findSourceMapForScript(sourceHref);

     var mapping = sourceMap.getSourceMapping(sourceLine, offset);

     if (!mapping[0]) {
       alert('(Caja-added code)');
       return;
     }

     var module = cajac.findModuleForScript(sourceHref);

     if (!module) {
       return;
     }

     var sourceFile = module.findSource(mapping[0]);

     if (!sourceFile) {
       return;
     }

     var location = new clInspector.CajaSourceLocation(sourceFile,
                                                            mapping[1]);
     FirebugChrome.select(location, "caja-source");
   },


   // --------------------------------------------------
   // local implementation

   /**
    * Returns the contents of the given file's originalSource
    * block.
    *
    * @param {clInspector.CajaModule} module The module from which to
    *   retrieve the original source.
    *
    * @return {Array.<String>} The source lines of the original source.
    */
   getSourceLines: function(sourceFile) {
     var originalSource = sourceFile.module['originalSource'];
     var file = sourceFile.file;

     if (!originalSource[file]) {
       return null;
     }

     return originalSource[file]['content'];
   },

   /**
    * Registers the given Caja module found under the given context
    * and the given script URL.
    *
    * @param {Object} context The context under which the module was declared.
    * @param {Object} module The Caja module (not a CajaModule) that was created
    *   in the context.
    * @param {string} scriptHref The URL of the script that contains the module.
    */
   register: function(context, module, scriptHref) {
     var isNewContext = !context[clInspector.Context.CAJA_CONTEXT];

     // If the Caja debugger has not been shown before, register the
     // panel with Firebug.
     if (isNewContext &&
         !clInspector.CajaDebugger.MainPanel.isRegistered) {
       clInspector.CajaDebugger.MainPanel.isRegistered = true;
       Firebug.registerPanel(clInspector.CajaDebugger.MainPanel);
     }

     // Create a new CajaContext if none exists.
     var cajac = context[clInspector.Context.CAJA_CONTEXT] ||
        new clInspector.CajaContext(context);

     // Add the module to the CajaContext.
     var moduleWrapper = cajac.addModule(module, scriptHref);

     // Remove any existing children of the menu.
     var sourcesList = context.browser.chrome.$('mpSources');

     if (isNewContext) {
       while (sourcesList.hasChildNodes()) {
         sourcesList.removeChild(sourcesList.firstChild);
       }
     }

     // Add the sources to the menu.
     var sources = moduleWrapper.getSources();
     var menu = context.browser.chrome.$('mnuSources');
     menu.disabled = sources.length == 0;

     for (var i = 0; i < sources.length; ++i) {
       var sourceFile = sources[i];

       var item = menu.ownerDocument.createElement('menuitem');
       item.setAttribute('label', sourceFile.name);
       item.setAttribute('tooltiptext', 'View Source File: ' + sourceFile.name);

       item.addEventListener('command', function(file) {
         return function() {
           context.getPanel('caja-source').showSourceFile(file);
         };
       }(sourceFile), false);

       sourcesList.appendChild(item);
     }
   }
  });

 // Register the debugger.
 clInspector.MainModule.registerDebugger(clInspector.CajaDebugger);

}});
