/// <reference path="../includes.ts"/>
/// <reference path="../tasks.ts"/>

namespace EventServices {

  const pluginName = 'hawtio-core-event-services';

  const log: Logging.Logger = Logger.get(pluginName);

  angular.module(pluginName, [])
    // service to register tasks that should happen when the URL changes
    .factory('locationChangeStartTasks', () => new Core.ParameterizedTasksImpl())
    // service to register stuff that should happen when the user logs in
    .factory('postLoginTasks', () => Core.postLoginTasks)
    // service to register stuff that should happen when the user logs out
    .factory('preLogoutTasks', () => Core.preLogoutTasks)
    // service to register stuff that should happen after the user logs out
    .factory('postLogoutTasks', () => Core.postLogoutTasks)
    .run(initializeTasks);

  function initializeTasks($rootScope, locationChangeStartTasks, postLoginTasks, preLogoutTasks, postLogoutTasks): void {
    'ngInject';
    // Reset pre/post-logout tasks after login
    postLoginTasks.addTask("ResetPreLogoutTasks", () => preLogoutTasks.reset());
    postLoginTasks.addTask("ResetPostLogoutTasks", () => postLogoutTasks.reset());
    // Reset pre-login tasks before logout
    preLogoutTasks.addTask("ResetPostLoginTasks", () => postLoginTasks.reset());

    $rootScope.$on('$locationChangeStart', ($event, newUrl, oldUrl) =>
      locationChangeStartTasks.execute($event, newUrl, oldUrl));

    log.debug("Event services loaded");
  }

  hawtioPluginLoader.addModule(pluginName);
}
