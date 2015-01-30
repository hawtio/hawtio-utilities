/// <reference path="coreHelpers.ts" />
module CoreFilters {
  var pluginName = 'hawtio-core-filters';
  var _module = angular.module(pluginName, []);

  _module.filter("valueToHtml", () => Core.valueToHtml);
  _module.filter('humanize', () => Core.humanizeValue);
  _module.filter('humanizeMs', () => Core.humanizeMilliseconds);
  _module.filter('maskPassword', () => Core.maskPassword);

  hawtioPluginLoader.addModule(pluginName);

}
