// Copyright Google 2008 Inc. All Rights Reserved.

/**
 * @fileoverview The main module used by the extension when talking to Firebug.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  if (clInspector.wrongVersion) { return; }

  /**
   * Module
   */
  clInspector.MainModule = extend(Firebug.Module,
    {
      /**
       * The inline 'CLOSURE_INSPECTOR___' object accessible by code running
       * inside the window.
       */
      inline_: {},

      /**
       * The registered debuggers.
       */
      debuggers_: [],

      initialize: function() {
        Firebug.Module.initialize.apply(this, arguments);
      },

      /**
       * Sets up the window in the given context by creating the inspector
       * inline object if necessary.
       *
       * @param {Object} context The context containing the window.
       */
      setupWindow: function(context) {
        var url = context.window.location.href.toString();

        // Disable injection except for local files and localhost.
        // TODO(jschorr): Turn this into a real whitelist.
        if (url.indexOf("file://") < 0 && url.indexOf("://localhost") < 0) {
          return;
        }

        // Inject the inspector object if necessary.
        if (!context.window.wrappedJSObject.CLOSURE_INSPECTOR___) {
          var inline = {};

          // Create the inline copy for the window.
          // Any functions get wrapped to be bound to this
          // module and have the context and window arguments
          // added.
          for (var key in this.inline_) {
            var value = this.inline_[key];

            if (typeof value == 'function') {
                value = clInspector.Helpers.bind(value, this, context);
            }

            inline[key] = value;
          }

          context.window.wrappedJSObject.CLOSURE_INSPECTOR___ = inline;
        }
      },

      /**
       * Registers the given inline object as being a part of the overall
       * inline object supplied to the window.
       * Must be called before the context is initialized.
       */
      registerInline: function(inline) {
        for (var key in inline) {
          var value = inline[key];
          this.inline_[key] = value;
        }
      },


      /**
       * Registers a debugger with the module.
       *
       * @param {clInspector.Debugger} debuggerInstance The debugger.
       */
      registerDebugger: function(debuggerInstance) {
        this.debuggers_.push(debuggerInstance);
      },


      /**
       * Retrieves the list of debuggers registered.
       *
       * @return {Array.<clInspector.Debugger>} The debuggers.
       */
      getDebuggers: function() {
        return this.debuggers_;
      },


      /**
       * Calls the given function on all registered debuggers with
       * the given arguments.
       *
       * @param {string} funcName The name of the function to call.
       * @param {Array} args The arguments.
       *
       * @return {Object} The first-non-null object found or null if none.
       */
      applyToDebuggers: function(funcName, args) {
        for (var i = 0; i < this.debuggers_.length; ++i) {
          var deb = this.debuggers_[i];
          var rtn = deb[funcName].apply(deb, args);

          if (rtn) {
            return rtn;
          }
        }

        return null;
      },

      initContext: function(context) {
        if (context[clInspector.Context.INITIALIZED]) {
          return;
        }

        context[clInspector.Context.INITIALIZED] = true;

        // Get the URL of the current context.
        var url = context.window.location.href.toString();

        // If the current page does not have the inline
        // hook, add it.
        if (!context.window.CLOSURE_INSPECTOR___) {
          this.setupWindow(context);
        }

        // Call the debuggers with the context.
        this.applyToDebuggers('onContextLoaded', [context]);

        // Setup hook for panel navigation.
        clInspector.Hooks.setupContextualHooks(context);
      },

      destroyContext: function(context) {
        var url = context.window.location.href.toString();
      },

      /**
       * Handle the fixing of panels as needed.
       */
      showPanel: function(browser, panel) {
        if (!panel || panel.$__LBFixed) {
          return;
        }

        // Script panel (and its sub-panel, callstack).
        if (panel.name == "script") {
          clInspector.Hooks.fixScriptPanel(panel.context, panel);
          panel.$__LBFixed = true;

          if (clInspector.Helpers.isFB12()) {
            clInspector.Hooks.fixStackPanel(
                panel.context,
                panel.context.getPanel("callstack", true));
          }
        }
      }

    });

  ////////////////////////////////////////////////////////////////

  /**
   * Context members.
   */

  clInspector.Context = {};

  clInspector.Context.INITIALIZED = 'ci_initialized';

  clInspector.Context.SHOW_JSUNIT_ASSERT = 'ci_show_jsunit_assert';
  clInspector.Context.HIGHLIGHT_JSUNIT_ASSERT =
      'ci_highlight_jsunit_assert';

  clInspector.Context.CAJA_CONTEXT = 'ci_caja_context';
  clInspector.Context.COMPILER_CONTEXT = 'ci_compiler_context';

  ////////////////////////////////////////////////////////////////

  /**
   * Registration
   */
  Firebug.registerModule(clInspector.MainModule);

}});
