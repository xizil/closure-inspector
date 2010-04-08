// Copyright Google 2008 Inc. All Rights Reserved.

/**
 * @fileoverview Closure Inspector,a Firebug extension for working with
 *   Google Closure.
 *
 * @author jschorr@google.com (Joseph Schorr)
 */

FBL.ns(function() { with (FBL) {

  /**
   * Compares two version numbers.
   *
   * @param {string|number} version1 Version of first item.
   * @param {string|number} version2 Version of second item.
   *
   * @return {number}  1 if {@code version1} is higher.
   *                   0 if arguments are equal.
   *                  -1 if {@code version2} is higher.
   *
   * Shamelessly borrowed from Closure Library's string.js.
   */
  function compareVersions(version1, version2) {
    var order = 0;

    // Trim leading and trailing whitespace and split the versions into
    // subversions.
    var v1Subs = String(version1).split('.');
    var v2Subs = String(version2).split('.');
    var subCount = Math.max(v1Subs.length, v2Subs.length);

    // Iterate over the subversions, as long as they appear to be equivalent.
    for (var subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
      var v1Sub = v1Subs[subIdx] || '';
      var v2Sub = v2Subs[subIdx] || '';

      // Split the subversions into pairs of numbers and qualifiers (like 'b').
      // Two different RegExp objects are needed because they are both using
      // the 'g' flag.
      var v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
      var v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
      do {
        var v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
        var v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
        // Break if there are no more matches.
        if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
          break;
        }

        // Parse the numeric part of the subversion. A missing number is
        // equivalent to 0.
        var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
        var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);

        // Compare the subversion components. The number has the highest
        // precedence. Next, if the numbers are equal, a subversion without any
        // qualifier is always higher than a subversion with any qualifier.
        // Next, the qualifiers are compared as strings.
        order = compareElements_(v1CompNum, v2CompNum) ||
            compareElements_(v1Comp[2].length == 0,
                             v2Comp[2].length == 0) ||
            compareElements_(v1Comp[2], v2Comp[2]);
        // Stop as soon as an inequality is discovered.
      } while (order == 0);
    }

    return order;
  }

  /**
   * Compares elements of a version number.
   *
   * @param {string|number|boolean} left An element from a version number.
   * @param {string|number|boolean} right An element from a version number.
   *
   * @return {number}  1 if {@code left} is higher.
   *                   0 if arguments are equal.
   *                  -1 if {@code right} is higher.
   */
  function compareElements_(left, right) {
    if (left < right) {
      return -1;
    } else if (left > right) {
      return 1;
    }
    return 0;
  }

  /////////////////////////////////////////////////////////////////////

  clInspector = {};
  clInspector.supportedVersions = [1.5];
  clInspector.wrongVersion = true;

  var firebugVersion = Firebug.version;

  for (var i = 0; i < clInspector.supportedVersions.length; ++i) {
    if (compareVersions(firebugVersion,
                        clInspector.supportedVersions[i]) == 0) {
      clInspector.wrongVersion = false;
      break;
    }
  }

  if (clInspector.wrongVersion) {
    // Indicate that the inspector is disabled. We use a timer here
    // so that we can be sure the console is initialized once we
    // add the message.
    setTimeout(function() {
        Firebug.Console.log("Closure Inspector has been disabled as it has " +
                            "detected the wrong version of Firebug: " +
                            firebugVersion + ". Allowed version: " +
                            clInspector.supportedVersions.toSource(),
                            FirebugContext);
    }, 1000);
  }


}});
