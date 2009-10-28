// Copyright Google 2009 Inc. All Rights Reserved.

/**
 * @fileoverview Implements the main module of the CompilerDebugger,
 *  a Closure Inspector debugger for Closure Compiler-generated code.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

 if (clInspector.wrongVersion) { return; }

 clInspector.CompilerDebugger =  extend(clInspector.Debugger, {

   // --------------------------------------------------
   // extends clInspector.Debugger

   /**
    * @inheritDoc
    */
   onContextLoaded : function(context) {
     context[clInspector.Context.COMPILER_CONTEXT] =
        new clInspector.CompilerContext(context);
   },

   /**
    * @inheritDoc
    */
   canMap: function(context, sourceHref, lineNo) {
     var ccc = context[clInspector.Context.COMPILER_CONTEXT];

     if (!ccc) {
       return false;
     }

     var sourceMap = ccc.getSourceMap();
     return sourceMap && sourceMap.hasSourceMapping(lineNo);
   },

   /**
    * @inheritDoc
    */
   showMappedSource: function(context, sourceHref, lineNo, offset) {
     var ccc = context[clInspector.Context.COMPILER_CONTEXT];

     if (!ccc) {
       return false;
     }

     var sourceMap = ccc.getSourceMap();

     if (!sourceMap) {
       return false;
     }

     var mapping = sourceMap.getSourceMapping(lineNo, offset);

     if (mapping) {
       var rootPath = clInspector.CompilerDebugger.Helpers.getRootPath(context);

       if (!rootPath) {
         alert('Cannot open source file as the root path is unknown');
         return;
       }

       clInspector.Helpers.displayFileInIDE(rootPath + '/' + mapping[0],
                                                 mapping[1]);
     }
   },

   /**
    * @inheritDoc
    */
   getMappedName: function(context, sourceHref, lineNo, offset) {
     if (!this.canMap(context, sourceHref, lineNo)) {
       return null;
     }

     var ccc = context[clInspector.Context.COMPILER_CONTEXT];
     var sourceMap = ccc.getSourceMap();
     var mapping = sourceMap.getSourceMapping(lineNo, offset);

     if (!mapping || mapping.length < 4) {
       return null;
     }

     return {
       handler: this,
       name: mapping[3]
     };
   },

   /**
    * @inheritDoc
    */
   convertName: function(token, originalName) {
     var value = token.value;
     var style = token.style;
     var rtn = {
       value: value,
       style: style
     };

     if (clInspector.Helpers.startsWith(input, 'SETPROP_')) {
       var prop = input.substring(8);
       rtn.value = '(set ' + prop + ')';
       rtn.style = 'js-atom';
       return rtn;
     }

     if (clInspector.Helpers.startsWith(input, '$$PROP_')) {
       var prop = input.substring(7);

       if (map == 'props') {
         rtn.value = prop;
       } else {
         rtn.value = "'" + prop + "'";
         rtn.style = 'js-string';
       }

       return rtn;
     }

     if (clInspector.Helpers.startsWith(input, 'GLOBAL_')) {
       rtn.value = input.substring(7);
       return rtn;
     }

     if (clInspector.Helpers.startsWith(input, '$$ALIAS_')) {
       rtn.value = input.substring(8).toLowerCase();

       if (rtn.value == 'throw') {
         rtn.style = 'js-keyword';
       } else {
         rtn.style = 'js-atom';
       }

       return rtn;
     }

     if (input == 'Compilerompiler_extractPrototype') {
       rtn.value = '(current prototype)';
       rtn.style = 'js-atom';
       return rtn;
     }

     rtn.value = input.replace(/(\$)+/g, '.');
     return rtn;
   }
  });

 // Register the debugger.
 clInspector.MainModule.registerDebugger(clInspector.CompilerDebugger);

 // ----------------------------------------------------------
 // Settings constants.

 clInspector.CompilerDebugger.Settings = {};

 /**
  * Context-setting: The source map for that context.
  */
 clInspector.CompilerDebugger.Settings.S_MAPS_SOURCEMAP = 'sourcemap';

 /**
  * Context-setting: The root path for the context in which to find source
  * files.
  */
 clInspector.CompilerDebugger.Settings.S_MAPS_ROOTPATH = 'rootPath';

}});
