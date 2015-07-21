define(
  'ephox.phoenix.api.dom.DomSearch',

  [
    'ephox.boss.api.DomUniverse',
    'ephox.phoenix.api.general.Search'
  ],

  /**
   * Documentation is in the actual implementations.
   */
  function (DomUniverse, Search) {
    var universe = DomUniverse();

    var run = function (elements, patterns, optimise, flags) {
      return Search.run(universe, elements, patterns, optimise, flags);
    };

    var safeWords = function (elements, words, optimise, flags) {
      return Search.safeWords(universe, elements, words, optimise, flags);
    };

    var safeToken = function (elements, token, optimise, flags) {
      return Search.safeToken(universe, elements, token, optimise, flags);
    };

    return {
      safeWords: safeWords,
      safeToken: safeToken,
      run: run
    };

  }
);
