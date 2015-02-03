/// <reference path="includes.ts"/>
/// <reference path="tasks.ts"/>
module EventServices {
  var pluginName = 'hawtio-event-tasks';
  var log:Logging.Logger = Logger.get(pluginName);
  var _module = angular.module(pluginName, []);

  // service to register tasks that should happen when the URL changes
  _module.factory('locationChangeStartTasks', () => {
    return new Core.ParameterizedTasksImpl();
  });

  // service to register stuff that should happen when the user logs in
  _module.factory('postLoginTasks', () => {
    return Core.postLoginTasks;
  });

  // service to register stuff that should happen when the user logs out
  _module.factory('preLogoutTasks', () => {
    return Core.preLogoutTasks;
  });

  // service to register stuff that should happen after the user logs out
  _module.factory('postLogoutTasks', () => {
    return Core.postLogoutTasks;
  });

  _module.run(['$rootScope', 'locationChangeStartTasks', 'postLoginTasks', 'preLogoutTasks', 'postLogoutTasks', ($rootScope, locationChangeStartTasks, postLoginTasks, preLogoutTasks, postLogoutTasks) => {
    preLogoutTasks.addTask("ResetPreLogoutTasks", () => {
      preLogoutTasks.reset();
    });
    preLogoutTasks.addTask("ResetPostLoginTasks", () => {
      preLogoutTasks.reset();
    });
    postLoginTasks.addTask("ResetPostLogoutTasks", () => {
      postLogoutTasks.reset();
    });
    $rootScope.$on('$locationChangeStart', ($event, newUrl, oldUrl) => {
      locationChangeStartTasks.execute($event, newUrl, oldUrl);
    });
    log.debug("loaded");
  }]);


  hawtioPluginLoader.addModule(pluginName);
}
