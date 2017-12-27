/// <reference path="baseHelpers.ts"/>
/// <reference path="controllerHelpers.ts"/>
/// <reference path="coreInterfaces.ts"/>
/// <reference path="tasks.ts"/>

namespace Core {

  var log = log || Logger.get("Core");

  export const lazyLoaders = {};

  export const numberTypeNames = {
    'byte': true,
    'short': true,
    'int': true,
    'long': true,
    'float': true,
    'double': true,
    'java.lang.byte': true,
    'java.lang.short': true,
    'java.lang.integer': true,
    'java.lang.long': true,
    'java.lang.float': true,
    'java.lang.double': true
  };

  /**
   * Returns the number of lines in the given text
   *
   * @method lineCount
   * @static
   * @param {String} value
   * @return {Number}
   *
   */
  export function lineCount(value): number {
    let rows = 0;
    if (value) {
      rows = 1;
      value.toString().each(/\n/, () => rows++);
    }
    return rows;
  }

  export function safeNull(value: any): string {
    if (typeof value === 'boolean') {
      return value + '';
    } else if (typeof value === 'number') {
      // return numbers as-is
      return value + '';
    }
    if (value) {
      return value;
    } else {
      return "";
    }
  }

  export function safeNullAsString(value: any, type: string): string {
    if (typeof value === 'boolean') {
      return "" + value;
    } else if (typeof value === 'number') {
      // return numbers as-is
      return "" + value;
    } else if (typeof value === 'string') {
      // its a string
      return "" + value;
    } else if (type === 'javax.management.openmbean.CompositeData' || type === '[Ljavax.management.openmbean.CompositeData;' || type === 'java.util.Map') {
      // composite data or composite data array, we just display as json
      // use json representation
      let data = angular.toJson(value, true);
      return data;
    } else if (type === 'javax.management.ObjectName') {
      return "" + (value == null ? "" : value.canonicalName);
    } else if (type === 'javax.management.openmbean.TabularData') {
      // tabular data is a key/value structure so loop each field and convert to array we can
      // turn into a String
      let arr = [];
      for (let key in value) {
        let val = value[key];
        let line = "" + key + "=" + val;
        arr.push(line);
      }
      // sort array so the values is listed nicely
      arr = _.sortBy(arr, (row) => row.toString());
      return arr.join("\n");
    } else if (angular.isArray(value)) {
      // join array with new line, and do not sort as the order in the array may matter
      return value.join("\n");
    } else if (value) {
      // force as string
      return "" + value;
    } else {
      return "";
    }
  }

  /**
   * Converts the given value to an array of query arguments.
   *
   * If the value is null an empty array is returned.
   * If the value is a non empty string then the string is split by commas
   *
   * @method toSearchArgumentArray
   * @static
   * @param {*} value
   * @return {String[]}
   *
   */
  export function toSearchArgumentArray(value): string[] {
    if (value) {
      if (angular.isArray(value)) return value;
      if (angular.isString(value)) return value.split(',');
    }
    return [];
  }

  export function folderMatchesPatterns(node, patterns) {
    if (node) {
      let folderNames = node.folderNames;
      if (folderNames) {
        return patterns.any((ignorePaths) => {
          for (let i = 0; i < ignorePaths.length; i++) {
            let folderName = folderNames[i];
            let ignorePath = ignorePaths[i];
            if (!folderName) return false;
            let idx = ignorePath.indexOf(folderName);
            if (idx < 0) {
              return false;
            }
          }
          return true;
        });
      }
    }
    return false;
  }

  export function scopeStoreJolokiaHandle($scope, jolokia, jolokiaHandle) {
    // TODO do we even need to store the jolokiaHandle in the scope?
    if (jolokiaHandle) {
      $scope.$on('$destroy', function () {
        closeHandle($scope, jolokia)
      });
      $scope.jolokiaHandle = jolokiaHandle;
    }
  }

  export function closeHandle($scope, jolokia) {
    let jolokiaHandle = $scope.jolokiaHandle
    if (jolokiaHandle) {
      //console.log('Closing the handle ' + jolokiaHandle);
      jolokia.unregister(jolokiaHandle);
      $scope.jolokiaHandle = null;
    }
  }

  /**
   * Pass in null for the success function to switch to sync mode
   *
   * @method onSuccess
   * @static
   * @param {Function} Success callback function
   * @param {Object} Options object to pass on to Jolokia request
   * @return {Object} initialized options object
   */
  export function onSuccess(
    fn: (response: Jolokia.IResponse) => void | ((response: Jolokia.IResponse) => void)[],
    options: Jolokia.IParams = {}): any {
    options['mimeType'] = 'application/json';
    if (!_.isUndefined(fn)) {
      options['success'] = fn;
    }
    if (!options['method']) {
      options['method'] = "POST";
    }
    // the default (unsorted) order is important for Karaf runtime
    options['canonicalNaming'] = false;
    options['canonicalProperties'] = false;
    if (!options['error']) {
      options['error'] = (response: Jolokia.IErrorResponse) => defaultJolokiaErrorHandler(response, options);
    }
    return options;
  }

  /**
   * The default error handler which logs errors either using debug or log level logging based on the silent setting
   * @param response the response from a jolokia request
   */
  export function defaultJolokiaErrorHandler(response: Jolokia.IErrorResponse, options: Jolokia.IParams = {}): void {
    let operation = Core.pathGet(response, ['request', 'operation']) || "unknown";
    let silent = options['silent'];
    let stacktrace = response.stacktrace;
    if (silent || isIgnorableException(response)) {
      log.debug("Operation", operation, "failed due to:", response['error']);
    } else {
      log.warn("Operation", operation, "failed due to:", response['error']);
    }
  }

  /**
   * Checks if it's an error that can happen on timing issues such as its been removed or if we run against older containers
   * @param {Object} response the error response from a jolokia request
   */
  function isIgnorableException(response: Jolokia.IErrorResponse): boolean {
    let isNotFound = (target) =>
      target.indexOf("InstanceNotFoundException") >= 0
      || target.indexOf("AttributeNotFoundException") >= 0
      || target.indexOf("IllegalArgumentException: No operation") >= 0;
    return (response.stacktrace && isNotFound(response.stacktrace)) || (response.error && isNotFound(response.error));
  }

  /**
   * Logs any failed operation and stack traces
   */
  export function logJolokiaStackTrace(response: Jolokia.IErrorResponse) {
    let stacktrace = response.stacktrace;
    if (stacktrace) {
      let operation = Core.pathGet(response, ['request', 'operation']) || "unknown";
      log.info("Operation", operation, "failed due to:", response['error']);
    }
  }

  export function supportsLocalStorage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  }


  export function isNumberTypeName(typeName): boolean {
    if (typeName) {
      let text = typeName.toString().toLowerCase();
      let flag = numberTypeNames[text];
      return flag;
    }
    return false;
  }

  /**
   * Escapes the mbean for Jolokia GET requests.
   * See: http://www.jolokia.org/reference/html/protocol.html#escape-rules
   *
   * @param {string} mbean the mbean
   * @returns {string}
   */
  export function escapeMBean(mbean: string): string {
    return encodeURI(mbean.replace(/\//g, '!/'));
  }

  /**
   * Escapes the mbean as a path for Jolokia POST "list" requests.
   * See: https://jolokia.org/reference/html/protocol.html#list
   *
   * @param {string} mbean the mbean
   * @returns {string}
   */
  export function escapeMBeanPath(mbean: string): string {
    return mbean.replace(/\//g, '!/').replace(':', '/');
  }

  export function escapeDots(text: string) {
    return text.replace(/\./g, '-');
  }

  /**
   * Escapes all dots and 'span' text in the css style names to avoid clashing with bootstrap stuff
   *
   * @method escapeTreeCssStyles
   * @static
   * @param {String} text
   * @return {String}
   */
  export function escapeTreeCssStyles(text: string) {
    return escapeDots(text).replace(/span/g, 'sp-an');
  }

  export function showLogPanel() {
    let log = $("#log-panel");
    let body = $('body');
    localStorage['showLog'] = 'true';
    log.css({ 'bottom': '50%' });
    body.css({
      'overflow-y': 'hidden'
    });
  }

  /**
   * Returns the CSS class for a log level based on if its info, warn, error etc.
   *
   * @method logLevelClass
   * @static
   * @param {String} level
   * @return {String}
   */
  export function logLevelClass(level: string) {
    if (level) {
      let first = level[0];
      if (first === 'w' || first === "W") {
        return "warning"
      } else if (first === 'e' || first === "E") {
        return "error";
      } else if (first === 'i' || first === "I") {
        return "info";
      } else if (first === 'd' || first === "D") {
        // we have no debug css style
        return "";
      }
    }
    return "";
  }


  export function toPath(hashUrl: string) {
    if (Core.isBlank(hashUrl)) {
      return hashUrl;
    }
    if (_.startsWith(hashUrl, "#")) {
      return hashUrl.substring(1);
    } else {
      return hashUrl;
    }
  }

  export function parseMBean(mbean) {
    let answer: any = {};
    let parts: any = mbean.split(":");
    if (parts.length > 1) {
      answer['domain'] = _.first(parts);
      parts = _.without(parts, _.first(parts));
      parts = parts.join(":");
      answer['attributes'] = {};
      let nameValues = parts.split(",");
      nameValues.forEach((str) => {
        let nameValue = str.split('=');
        let name = (<string>_.first(nameValue)).trim();
        nameValue = _.without(nameValue, _.first(nameValue));
        answer['attributes'][name] = nameValue.join('=').trim();
      });
    }
    return answer;
  }

  export function executePostLoginTasks(): void {
    log.debug("Executing post login tasks");
    Core.postLoginTasks.execute();
  }

  export function executePreLogoutTasks(onComplete: () => void): void {
    log.debug("Executing pre logout tasks");
    Core.preLogoutTasks.onComplete(onComplete);
    Core.preLogoutTasks.execute();
  }

  export function executePostLogoutTasks(onComplete: () => void): void {
    log.debug("Executing post logout tasks");
    Core.postLogoutTasks.onComplete(onComplete);
    Core.postLogoutTasks.execute();
  }

  /**
   * log out the current user
   * @for Core
   * @static
   * @method logout
   * @param {String} jolokiaUrl
   * @param {*} userDetails
   * @param {Object} localStorage
   * @param {Object} $scope
   * @param {Function} successCB
   * @param {Function} errorCB
   *
   */
  export function logout(jolokiaUrl,
    userDetails,
    localStorage: Storage,
    $scope,
    successCB: () => void = null,
    errorCB: () => void = null) {

    if (jolokiaUrl) {
      let url = "auth/logout/";

      executePreLogoutTasks(() => {
        $.ajax(url, {
          type: "POST",
          success: () => {
            userDetails.username = null;
            userDetails.password = null;
            userDetails.loginDetails = null;
            userDetails.rememberMe = false;
            delete localStorage['userDetails'];
            let jvmConnect = angular.fromJson(localStorage['jvmConnect'])
            _.each(jvmConnect, function (value) {
              delete value['userName'];
              delete value['password'];
            });
            localStorage.setItem('jvmConnect', angular.toJson(jvmConnect));
            localStorage.removeItem('activemqUserName');
            localStorage.removeItem('activemqPassword');
            if (successCB && angular.isFunction(successCB)) {
              successCB();
            }
            Core.$apply($scope);
          },
          error: (xhr, textStatus, error) => {
            userDetails.username = null;
            userDetails.password = null;
            userDetails.loginDetails = null;
            userDetails.rememberMe = false;
            delete localStorage['userDetails'];
            let jvmConnect = angular.fromJson(localStorage['jvmConnect'])
            _.each(jvmConnect, function (value) {
              delete value['userName'];
              delete value['password'];
            });
            localStorage.setItem('jvmConnect', angular.toJson(jvmConnect));
            localStorage.removeItem('activemqUserName');
            localStorage.removeItem('activemqPassword');
            // TODO, more feedback
            switch (xhr.status) {
              case 401:
                log.debug('Failed to log out, ', error);
                break;
              case 403:
                log.debug('Failed to log out, ', error);
                break;
              case 0:
                // this may happen during onbeforeunload -> logout, when XHR is cancelled
                break;
              default:
                log.debug('Failed to log out, ', error);
                break;
            }
            if (errorCB && angular.isFunction(errorCB)) {
              errorCB();
            }
            Core.$apply($scope);
          }
        });
      });
    }

  }

  /**
   * Creates a link by appending the current $location.search() hash to the given href link,
   * removing any required parameters from the link
   * @method createHref
   * @for Core
   * @static
   * @param {ng.ILocationService} $location
   * @param {String} href the link to have any $location.search() hash parameters appended
   * @param {Array} removeParams any parameters to be removed from the $location.search()
   * @return {Object} the link with any $location.search() parameters added
   */
  export function createHref($location, href, removeParams = null) {
    let hashMap = angular.copy($location.search());
    // lets remove any top level nav bar related hash searches
    if (removeParams) {
      angular.forEach(removeParams, (param) => delete hashMap[param]);
    }
    let hash = Core.hashToString(hashMap);
    if (hash) {
      let prefix = (href.indexOf("?") >= 0) ? "&" : "?";
      href += prefix + hash;
    }
    return href;
  }

  /**
   * Turns the given search hash into a URI style query string
   * @method hashToString
   * @for Core
   * @static
   * @param {Object} hash
   * @return {String}
   */
  export function hashToString(hash) {
    let keyValuePairs: string[] = [];
    angular.forEach(hash, function (value, key) {
      keyValuePairs.push(key + "=" + value);
    });
    let params = keyValuePairs.join("&");
    return encodeURI(params);
  }

  /**
   * Parses the given string of x=y&bar=foo into a hash
   * @method stringToHash
   * @for Core
   * @static
   * @param {String} hashAsString
   * @return {Object}
   */
  export function stringToHash(hashAsString: string) {
    let entries = {};
    if (hashAsString) {
      let text = decodeURI(hashAsString);
      let items = text.split('&');
      angular.forEach(items, (item) => {
        let kv = item.split('=');
        let key = kv[0];
        let value = kv[1] || key;
        entries[key] = value;
      });
    }
    return entries;
  }

  /**
   * Register a JMX operation to poll for changes, only
   * calls back when a change occurs
   *
   * @param jolokia
   * @param scope
   * @param arguments
   * @param callback
   * @param options
   * @returns Object
   */
  export function registerForChanges(jolokia, $scope, arguments, callback: (response: any) => void, options?: any): () => void {
    let decorated = {
      responseJson: '',
      success: (response) => {
        let json = angular.toJson(response.value);
        if (decorated.responseJson !== json) {
          decorated.responseJson = json;
          callback(response);
        }
      }
    };
    angular.extend(decorated, options);
    return Core.register(jolokia, $scope, arguments, onSuccess(undefined, decorated));
  }

  // Jolokia caching stuff, try and cache responses so we don't always have to wait
  // for the server

  export interface IResponseHistory {
    [name: string]: any;
  }

  let responseHistory: IResponseHistory = null;

  export function getOrInitObjectFromLocalStorage(key: string): any {
    let answer: any = undefined;
    if (!(key in localStorage)) {
      localStorage[key] = angular.toJson({});
    }
    return angular.fromJson(localStorage[key]);
  }

  function argumentsToString(arguments: Array<any>) {
    return StringHelpers.toString(arguments);
  }

  function keyForArgument(argument: any) {
    if (!('type' in argument)) {
      return null;
    }
    let answer = <string>argument['type'];
    switch (answer.toLowerCase()) {
      case 'exec':
        answer += ':' + argument['mbean'] + ':' + argument['operation'];
        let argString = argumentsToString(argument['arguments']);
        if (!Core.isBlank(argString)) {
          answer += ':' + argString;
        }
        break;
      case 'read':
        answer += ':' + argument['mbean'] + ':' + argument['attribute'];
        break;
      default:
        return null;
    }
    return answer;
  }

  function createResponseKey(arguments: any) {
    let answer = '';
    if (angular.isArray(arguments)) {
      answer = arguments.map((arg) => { return keyForArgument(arg); }).join(':');
    } else {
      answer = keyForArgument(arguments);
    }
    return answer;
  }

  export function getResponseHistory(): any {
    if (responseHistory === null) {
      //responseHistory = getOrInitObjectFromLocalStorage('responseHistory');
      responseHistory = {};
      log.debug("Created response history", responseHistory);
    }
    return responseHistory;
  }

  export const MAX_RESPONSE_CACHE_SIZE = 20;

  function getOldestKey(responseHistory: IResponseHistory) {
    let oldest: number = null;
    let oldestKey: string = null;
    angular.forEach(responseHistory, (value: any, key: string) => {
      //log.debug("Checking entry: ", key);
      //log.debug("Oldest timestamp: ", oldest, " key: ", key, " value: ", value);
      if (!value || !value.timestamp) {
        // null value is an excellent candidate for deletion
        oldest = 0;
        oldestKey = key;
      } else if (oldest === null || value.timestamp < oldest) {
        oldest = value.timestamp;
        oldestKey = key;
      }
    });
    return oldestKey;
  }

  function addResponse(arguments: any, value: any) {
    let responseHistory = getResponseHistory();
    let key = createResponseKey(arguments);
    if (key === null) {
      log.debug("key for arguments is null, not caching: ", StringHelpers.toString(arguments));
      return;
    }
    //log.debug("Adding response to history, key: ", key, " value: ", value);
    // trim the cache if needed
    let keys = _.keys(responseHistory);
    //log.debug("Number of stored responses: ", keys.length);
    if (keys.length >= MAX_RESPONSE_CACHE_SIZE) {
      log.debug("Cache limit (", MAX_RESPONSE_CACHE_SIZE, ") met or  exceeded (", keys.length, "), trimming oldest response");
      let oldestKey = getOldestKey(responseHistory);
      if (oldestKey !== null) {
        // delete the oldest entry
        log.debug("Deleting key: ", oldestKey);
        delete responseHistory[oldestKey];
      } else {
        log.debug("Got null key, could be a cache problem, wiping cache");
        keys.forEach((key) => {
          log.debug("Deleting key: ", key);
          delete responseHistory[key];
        });
      }
    }

    responseHistory[key] = value;
    //localStorage['responseHistory'] = angular.toJson(responseHistory);
  }

  function getResponse(jolokia, arguments: any, callback: any) {
    let responseHistory = getResponseHistory();
    let key = createResponseKey(arguments);
    if (key === null) {
      jolokia.request(arguments, callback);
      return;
    }
    if (key in responseHistory && 'success' in callback) {
      let value = responseHistory[key];
      // do this async, the controller might not handle us immediately calling back
      setTimeout(() => {
        callback['success'](value);
      }, 10);
    } else {
      log.debug("Unable to find existing response for key: ", key);
      jolokia.request(arguments, callback);
    }
  }
  // end jolokia caching stuff


  /**
   * Register a JMX operation to poll for changes
   * @method register
   * @for Core
   * @static
   * @return {Function} a zero argument function for unregistering  this registration
   * @param {*} jolokia
   * @param {*} scope
   * @param {Object} arguments
   * @param {Function} callback
   */
  export function register(jolokia: Jolokia.IJolokia, scope, arguments: any, callback) {
    if (scope.$$destroyed) {
      // fail fast to prevent registration leaks
      return;
    }
    /*
    if (scope && !Core.isBlank(scope.name)) {
      Core.log.debug("Calling register from scope: ", scope.name);
    } else {
      Core.log.debug("Calling register from anonymous scope");
    }
    */
    if (!angular.isDefined(scope.$jhandle) || !angular.isArray(scope.$jhandle)) {
      //log.debug("No existing handle set, creating one");
      scope.$jhandle = [];
    } else {
      //log.debug("Using existing handle set");
    }
    if (angular.isDefined(scope.$on)) {
      scope.$on('$destroy', function (event) {
        unregister(jolokia, scope);
      });
    }

    let handle: number = null;

    if ('success' in callback) {
      let cb = callback.success;
      let args = arguments;
      callback.success = (response) => {
        addResponse(args, response);
        cb(response);
      }
    }

    if (angular.isArray(arguments)) {
      if (arguments.length >= 1) {
        // TODO can't get this to compile in typescript :)
        //let args = [callback].concat(arguments);
        let args = <any>[callback];
        angular.forEach(arguments, (value) => args.push(value));
        //let args = [callback];
        //args.push(arguments);
        let registerFn = jolokia.register;
        handle = registerFn.apply(jolokia, args);
        scope.$jhandle.push(handle);
        getResponse(jolokia, arguments, callback);
      }
    } else {
      handle = jolokia.register(callback, arguments);
      scope.$jhandle.push(handle);
      getResponse(jolokia, arguments, callback);
    }
    return () => {
      if (handle !== null) {
        scope.$jhandle.remove(handle);
        jolokia.unregister(handle);
      }
    };
  }

  /**
   * Register a JMX operation to poll for changes using a jolokia search using the given mbean pattern
   * @method registerSearch
   * @for Core
   * @static
   * @paran {*} jolokia
   * @param {*} scope
   * @param {String} mbeanPattern
   * @param {Function} callback
   */
  /*
  TODO - won't compile, and where is 'arguments' coming from?
  export function registerSearch(jolokia:Jolokia.IJolokia, scope, mbeanPattern:string, callback) {
      if (!angular.isDefined(scope.$jhandle) || !angular.isArray(scope.$jhandle)) {
          scope.$jhandle = [];
      }
      if (angular.isDefined(scope.$on)) {
          scope.$on('$destroy', function (event) {
              unregister(jolokia, scope);
          });
      }
      if (angular.isArray(arguments)) {
          if (arguments.length >= 1) {
              // TODO can't get this to compile in typescript :)
              //let args = [callback].concat(arguments);
              let args = [callback];
              angular.forEach(arguments, (value) => args.push(value));
              //let args = [callback];
              //args.push(arguments);
              let registerFn = jolokia.register;
              let handle = registerFn.apply(jolokia, args);
              scope.$jhandle.push(handle);
              jolokia.search(mbeanPattern, callback);
          }
      } else {
          let handle = jolokia.register(callback, arguments);
          scope.$jhandle.push(handle);
          jolokia.search(mbeanPattern, callback);
      }
  }
  */

  export function unregister(jolokia: Jolokia.IJolokia, scope) {
    if (angular.isDefined(scope.$jhandle)) {
      scope.$jhandle.forEach(function (handle) {
        jolokia.unregister(handle);
      });
      delete scope.$jhandle;
    }
  }

  /**
   * Converts the given XML node to a string representation of the XML
   * @method xmlNodeToString
   * @for Core
   * @static
   * @param {Object} xmlNode
   * @return {Object}
   */
  export function xmlNodeToString(xmlNode) {
    try {
      // Gecko- and Webkit-based browsers (Firefox, Chrome), Opera.
      return (new XMLSerializer()).serializeToString(xmlNode);
    }
    catch (e) {
      try {
        // Internet Explorer.
        return xmlNode.xml;
      }
      catch (e) {
        //Other browsers without XML Serializer
        console.log('WARNING: XMLSerializer not supported');
      }
    }
    return false;
  }

  /**
   * Returns true if the given DOM node is a text node
   * @method isTextNode
   * @for Core
   * @static
   * @param {Object} node
   * @return {Boolean}
   */
  export function isTextNode(node) {
    return node && node.nodeType === 3;
  }

  /**
   * Returns the lowercase file extension of the given file name or returns the empty
   * string if the file does not have an extension
   * @method fileExtension
   * @for Core
   * @static
   * @param {String} name
   * @param {String} defaultValue
   * @return {String}
   */
  export function fileExtension(name: string, defaultValue: string = "") {
    let extension = defaultValue;
    if (name) {
      let idx = name.lastIndexOf(".");
      if (idx > 0) {
        extension = name.substring(idx + 1, name.length).toLowerCase();
      }
    }
    return extension;
  }

  export function getUUID() {
    let d = new Date();
    let ms = (d.getTime() * 1000) + d.getUTCMilliseconds();
    let random = Math.floor((1 + Math.random()) * 0x10000);
    return ms.toString(16) + random.toString(16);
  }

  let _versionRegex = /[^\d]*(\d+)\.(\d+)(\.(\d+))?.*/

  /**
   * Parses some text of the form "xxxx2.3.4xxxx"
   * to extract the version numbers as an array of numbers then returns an array of 2 or 3 numbers.
   *
   * Characters before the first digit are ignored as are characters after the last digit.
   * @method parseVersionNumbers
   * @for Core
   * @static
   * @param {String} text a maven like string containing a dash then numbers separated by dots
   * @return {Array}
   */
  export function parseVersionNumbers(text: string) {
    if (text) {
      let m = text.match(_versionRegex);
      if (m && m.length > 4) {
        let m1 = m[1];
        let m2 = m[2];
        let m4 = m[4];
        if (angular.isDefined(m4)) {
          return [parseInt(m1), parseInt(m2), parseInt(m4)];
        } else if (angular.isDefined(m2)) {
          return [parseInt(m1), parseInt(m2)];
        } else if (angular.isDefined(m1)) {
          return [parseInt(m1)];
        }
      }
    }
    return null;
  }

  /**
   * Converts a version string with numbers and dots of the form "123.456.790" into a string
   * which is sortable as a string, by left padding each string between the dots to at least 4 characters
   * so things just sort as a string.
   *
   * @param text
   * @return {string} the sortable version string
   */
  export function versionToSortableString(version: string, maxDigitsBetweenDots = 4) {
    return (version || "").split(".").map((x) => {
      let length = x.length;
      return (length >= maxDigitsBetweenDots)
        ? x : _.padStart(x, maxDigitsBetweenDots - length, ' ')
    }).join(".");
  }

  export function time(message: string, fn) {
    let start = new Date().getTime();
    let answer = fn();
    let elapsed = new Date().getTime() - start;
    console.log(message + " " + elapsed);
    return answer;
  }

  /**
   * Compares the 2 version arrays and returns -1 if v1 is less than v2 or 0 if they are equal or 1 if v1 is greater than v2
   * @method compareVersionNumberArrays
   * @for Core
   * @static
   * @param {Array} v1 an array of version numbers with the most significant version first (major, minor, patch).
   * @param {Array} v2
   * @return {Number}
   */
  export function compareVersionNumberArrays(v1: number[], v2: number[]) {
    if (v1 && !v2) {
      return 1;
    }
    if (!v1 && v2) {
      return -1;
    }
    if (v1 === v2) {
      return 0;
    }
    for (let i = 0; i < v1.length; i++) {
      let n1 = v1[i];
      if (i >= v2.length) {
        return 1;
      }
      let n2 = v2[i];
      if (!angular.isDefined(n1)) {
        return -1;
      }
      if (!angular.isDefined(n2)) {
        return 1;
      }
      if (n1 > n2) {
        return 1;
      } else if (n1 < n2) {
        return -1;
      }
    }
    return 0;
  }

  /**
   * Helper function which converts objects into tables of key/value properties and
   * lists into a <ul> for each value.
   * @method valueToHtml
   * @for Core
   * @static
   * @param {any} value
   * @return {String}
   */
  export function valueToHtml(value) {
    if (angular.isArray(value)) {
      let size = value.length;
      if (!size) {
        return "";
      } else if (size === 1) {
        return valueToHtml(value[0]);
      } else {
        let buffer = "<ul>";
        angular.forEach(value, (childValue) => {
          buffer += "<li>" + valueToHtml(childValue) + "</li>"
        });
        return buffer + "</ul>"
      }
    } else if (angular.isObject(value)) {
      let buffer = "<table>";
      angular.forEach(value, (childValue, key) => {
        buffer += "<tr><td>" + key + "</td><td>" + valueToHtml(childValue) + "</td></tr>"
      });
      return buffer + "</table>"
    } else if (angular.isString(value)) {
      let uriPrefixes = ["http://", "https://", "file://", "mailto:"];
      let answer = value;
      angular.forEach(uriPrefixes, (prefix) => {
        if (_.startsWith(answer, prefix)) {
          answer = "<a href='" + value + "'>" + value + "</a>";
        }
      });
      return answer;
    }
    return value;
  }

  /**
   * If the string starts and ends with [] {} then try parse as JSON and return the parsed content or return null
   * if it does not appear to be JSON
   * @method tryParseJson
   * @for Core
   * @static
   * @param {String} text
   * @return {Object}
   */
  export function tryParseJson(text: string) {
    text = _.trim(text);
    if ((_.startsWith(text, "[") && _.endsWith(text, "]")) || (_.startsWith(text, "{") && _.endsWith(text, "}"))) {
      try {
        return JSON.parse(text);
      } catch (e) {
        // ignore
      }
    }
    return null;
  }

  /**
   * Given values (n, "person") will return either "1 person" or "2 people" depending on if a plural
   * is required using the String.pluralize() function from sugarjs
   * @method maybePlural
   * @for Core
   * @static
   * @param {Number} count
   * @param {String} word
   * @return {String}
   */
  export function maybePlural(count: Number, word: string) {
    /* TODO - will need to find another dependency for this
    if (word.pluralize) {
      let pluralWord = (count === 1) ? word : word.pluralize();
      return "" + count + " " + pluralWord;
    } else {
    */
    let pluralWord = (count === 1) ? word : word + 's';
    return "" + count + " " + pluralWord;
    //}
  }

  /**
   * given a JMX ObjectName of the form <code>domain:key=value,another=something</code> then return the object
   * <code>{key: "value", another: "something"}</code>
   * @method objectNameProperties
   * @for Core
   * @static
   * @param {String} name
   * @return {Object}
   */
  export function objectNameProperties(objectName: string) {
    let entries = {};
    if (objectName) {
      let idx = objectName.indexOf(":");
      if (idx > 0) {
        let path = objectName.substring(idx + 1);
        let items = path.split(',');
        angular.forEach(items, (item) => {
          let kv = item.split('=');
          let key = kv[0];
          let value = kv[1] || key;
          entries[key] = value;
        });
      }
    }
    return entries;
  }

  /*
  export function setPageTitle($document, title:Core.PageTitle) {
    $document.attr('title', title.getTitleWithSeparator(' '));
  }

  export function setPageTitleWithTab($document, title:Core.PageTitle, tab:string) {
    $document.attr('title', title.getTitleWithSeparator(' ') + " " + tab);
  }
  */

  /**
   * Removes dodgy characters from a value such as '/' or '.' so that it can be used as a DOM ID value
   * and used in jQuery / CSS selectors
   * @method toSafeDomID
   * @for Core
   * @static
   * @param {String} text
   * @return {String}
   */
  export function toSafeDomID(text: string) {
    return text ? text.replace(/(\/|\.)/g, "_") : text;
  }


  /**
   * Invokes the given function on each leaf node in the array of folders
   * @method forEachLeafFolder
   * @for Core
   * @static
   * @param {Array[Folder]} folders
   * @param {Function} fn
   */
  export function forEachLeafFolder(folders, fn) {
    angular.forEach(folders, (folder) => {
      let children = folder["children"];
      if (angular.isArray(children) && children.length > 0) {
        forEachLeafFolder(children, fn);
      } else {
        fn(folder);
      }
    });
  }


  export function extractHashURL(url: string) {
    let parts = url.split('#');
    if (parts.length === 0) {
      return url;
    }
    let answer: string = parts[1];
    if (parts.length > 1) {
      let remaining = parts.slice(2);
      remaining.forEach((part) => {
        answer = answer + "#" + part;
      });
    }
    return answer;
  }

  export function authHeaderValue(userDetails: Core.UserDetails) {
    return getBasicAuthHeader(<string>userDetails.username, <string>userDetails.password);
  }

  export function getBasicAuthHeader(username: string, password: string) {
    let authInfo = username + ":" + password;
    authInfo = window.btoa(authInfo);
    return "Basic " + authInfo;
  }

  let httpRegex = new RegExp('^(https?):\/\/(([^:/?#]*)(?::([0-9]+))?)');


  /**
   * Breaks a URL up into a nice object
   * @method parseUrl
   * @for Core
   * @static
   * @param url
   * @returns object
   */
  export function parseUrl(url: string): any {
    if (Core.isBlank(url)) {
      return null;
    }

    let matches = url.match(httpRegex);

    if (matches === null) {
      return null;
    }

    //log.debug("matches: ", matches);

    let scheme = matches[1];
    let host = matches[3];
    let port = matches[4];

    let parts: string[] = null;
    if (!Core.isBlank(port)) {
      parts = url.split(port);
    } else {
      parts = url.split(host);
    }

    // make sure we use port as a number
    let portNum = Core.parseIntValue(port);

    let path = parts[1];
    if (path && _.startsWith(path, '/')) {
      path = path.slice(1, path.length);
    }

    //log.debug("parts: ", parts);

    return {
      scheme: scheme,
      host: host,
      port: portNum,
      path: path
    }
  }

  export function getDocHeight() {
    let D = document;
    return Math.max(
      Math.max(D.body.scrollHeight, D.documentElement.scrollHeight),
      Math.max(D.body.offsetHeight, (<any>D.documentElement).offsetHeight),
      Math.max(D.body.clientHeight, D.documentElement.clientHeight)
    );
  }


  /**
   * If a URL is external to the current web application, then
   * replace the URL with the proxy servlet URL
   * @method useProxyIfExternal
   * @for Core
   * @static
   * @param {String} connectUrl
   * @return {String}
   */
  export function useProxyIfExternal(connectUrl) {
    if (Core.isChromeApp()) {
      return connectUrl;
    }
    let host = window.location.host;
    if (!_.startsWith(connectUrl, "http://" + host + "/") && !_.startsWith(connectUrl, "https://" + host + "/")) {
      // lets remove the http stuff
      let idx = connectUrl.indexOf("://");
      if (idx > 0) {
        connectUrl = connectUrl.substring(idx + 3);
      }
      // lets replace the : with a /
      connectUrl = connectUrl.replace(":", "/");
      connectUrl = Core.trimLeading(connectUrl, "/");
      connectUrl = Core.trimTrailing(connectUrl, "/");
      connectUrl = Core.url("/proxy/" + connectUrl);
    }
    return connectUrl;
  }

  /*
  export function checkInjectorLoaded() {
    // TODO sometimes the injector is not yet initialised; so lets try initialise it here just in case
    if (!Core.injector) {
      Core.injector = angular.element(document.documentElement).injector();
    }
  }
  */

  /**
   * Extracts the url of the target, eg usually http://localhost:port, but if we use fabric to proxy to another host,
   * then we return the url that we proxied too (eg the real target)
   *
   * @param {ng.ILocationService} $location
   * @param {String} scheme to force use a specific scheme, otherwise the scheme from location is used
   * @param {Number} port to force use a specific port number, otherwise the port from location is used
   */
  export function extractTargetUrl($location, scheme, port) {
    if (angular.isUndefined(scheme)) {
      scheme = $location.scheme();
    }

    let host = $location.host();

    //  $location.search()['url']; does not work for some strange reason
    // let qUrl = $location.search()['url'];

    // if its a proxy request using hawtio-proxy servlet, then the url parameter
    // has the actual host/port
    let qUrl = $location.absUrl();
    let idx = qUrl.indexOf("url=");
    if (idx > 0) {
      qUrl = qUrl.substr(idx + 4);
      let value = decodeURIComponent(qUrl);
      if (value) {
        idx = value.indexOf("/proxy/");
        // after proxy we have host and optional port (if port is not 80)
        if (idx > 0) {
          value = value.substr(idx + 7);
          // if the path has http:// or some other scheme in it lets trim that off
          idx = value.indexOf("://");
          if (idx > 0) {
            value = value.substr(idx + 3);
          }
          let data = value.split("/");
          if (data.length >= 1) {
            host = data[0];
          }
          if (angular.isUndefined(port) && data.length >= 2) {
            let qPort = Core.parseIntValue(data[1], "port number");
            if (qPort) {
              port = qPort;
            }
          }
        }
      }
    }

    if (angular.isUndefined(port)) {
      port = $location.port();
    }

    let url = scheme + "://" + host;
    if (port != 80) {
      url += ":" + port;
    }
    return url;
  }

  /**
   * Returns true if the $location is from the hawtio proxy
   */
  export function isProxyUrl($location: ng.ILocationService) {
    let url = $location.url();
    return url.indexOf('/hawtio/proxy/') > 0;
  }

  /**
   * handy do nothing converter for the below function
   **/
  export function doNothing(value: any) { return value; }

  // moved these into their own helper file
  export const bindModelToSearchParam = ControllerHelpers.bindModelToSearchParam;
  export const reloadWhenParametersChange = ControllerHelpers.reloadWhenParametersChange;


  /**
   * Returns a new function which ensures that the delegate function is only invoked at most once
   * within the given number of millseconds
   * @method throttled
   * @for Core
   * @static
   * @param {Function} fn the function to be invoked at most once within the given number of millis
   * @param {Number} millis the time window during which this function should only be called at most once
   * @return {Object}
   */
  export function throttled(fn, millis: number) {
    let nextInvokeTime: number = 0;
    let lastAnswer = null;
    return () => {
      let now = Date.now();
      if (nextInvokeTime < now) {
        nextInvokeTime = now + millis;
        lastAnswer = fn();
      } else {
        //log.debug("Not invoking function as we did call " + (now - (nextInvokeTime - millis)) + " ms ago");
      }
      return lastAnswer;
    }
  }

  /**
   * Attempts to parse the given JSON text and returns the JSON object structure or null.
   *Bad JSON is logged at info level.
   *
   * @param text a JSON formatted string
   * @param message description of the thing being parsed logged if its invalid
   */
  export function parseJsonText(text: string, message: string = "JSON") {
    let answer = null;
    try {
      answer = angular.fromJson(text);
    } catch (e) {
      log.info("Failed to parse " + message + " from: " + text + ". " + e);
    }
    return answer;
  }

  /**
   * Returns the humanized markup of the given value
   */
  export function humanizeValueHtml(value: any): string {
    let formattedValue: string = "";
    if (value === true) {
      formattedValue = '<i class="icon-check"></i>';
    } else if (value === false) {
      formattedValue = '<i class="icon-check-empty"></i>';
    } else {
      formattedValue = humanizeValue(value);
    }
    return formattedValue;
  }

  /**
   * Gets a query value from the given url
   *
   * @param url  url
   * @param parameterName the uri parameter value to get
   * @returns {*}
   */
  export function getQueryParameterValue(url, parameterName) {
    let parts;

    let query = (url || '').split('?');
    if (query && query.length > 0) {
      parts = query[1];
    } else {
      parts = '';
    }

    let vars = parts.split('&');
    for (let i = 0; i < vars.length; i++) {
      let pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) == parameterName) {
        return decodeURIComponent(pair[1]);
      }
    }
    // not found
    return null;
  }

  /**
   * Takes a value in ms and returns a human readable
   * duration
   * @param value
   */
  export function humanizeMilliseconds(value: number): String {

    if (!angular.isNumber(value)) {
      return "XXX";
    }

    let seconds = value / 1000;
    let years = Math.floor(seconds / 31536000);
    if (years) {
      return maybePlural(years, "year");
    }
    let days = Math.floor((seconds %= 31536000) / 86400);
    if (days) {
      return maybePlural(days, "day");
    }
    let hours = Math.floor((seconds %= 86400) / 3600);
    if (hours) {
      return maybePlural(hours, 'hour');
    }
    let minutes = Math.floor((seconds %= 3600) / 60);
    if (minutes) {
      return maybePlural(minutes, 'minute');
    }
    seconds = Math.floor(seconds % 60);
    if (seconds) {
      return maybePlural(seconds, 'second');
    }
    return value + " ms";
  }

  /*
    export function storeConnectionRegex(regexs, name, json) {
      if (!regexs.any((r) => { r['name'] === name })) {
        let regex:string = '';
  
        if (json['useProxy']) {
          regex = '/hawtio/proxy/';
        } else {
          regex = '//';
        }
        regex += json['host'] + ':' + json['port'] + '/' + json['path'];
        regexs.push({
          name: name,
          regex: regex.escapeURL(true),
          color: UI.colors.sample()
        });
        writeRegexs(regexs);
      }
    }
  */
  export function getRegexs() {
    let regexs: any = [];
    try {
      regexs = angular.fromJson(localStorage['regexs']);
    } catch (e) {
      // corrupted config
      delete localStorage['regexs'];
    }
    return regexs;
  }

  export function removeRegex(name) {
    let regexs = Core.getRegexs();
    let hasFunc = (r) => { return r['name'] === name; };
    if (regexs.any(hasFunc)) {
      regexs = regexs.exclude(hasFunc);
      Core.writeRegexs(regexs);
    }
  }

  export function writeRegexs(regexs) {
    localStorage['regexs'] = angular.toJson(regexs);
  }

  export function maskPassword(value: any) {
    if (value) {
      let text = '' + value;
      // we use the same patterns as in Apache Camel in its
      // org.apache.camel.util.URISupport.sanitizeUri
      let userInfoPattern = "(.*://.*:)(.*)(@)";
      value = value.replace(new RegExp(userInfoPattern, 'i'), "$1xxxxxx$3");
    }

    return value;
  }

  /**
   * Match the given filter against the text, ignoring any case.
   * <p/>
   * This operation will regard as a match if either filter or text is null/undefined.
   * As its used for filtering out, unmatched.
   * <p/>
   *
   * @param text   the text
   * @param filter the filter
   * @return true if matched, false if not.
   */
  export function matchFilterIgnoreCase(text, filter): any {
    if (angular.isUndefined(text) || angular.isUndefined(filter)) {
      return true;
    }
    if (text == null || filter == null) {
      return true;
    }

    text = text.toString().trim().toLowerCase();
    filter = filter.toString().trim().toLowerCase();

    if (text.length === 0 || filter.length === 0) {
      return true;
    }

    // there can be more tokens separated by comma
    let tokens = filter.split(",");

    // filter out empty tokens, and make sure its trimmed
    tokens = tokens.filter(t => {
      return t.length > 0;
    }).map(t => {
      return t.trim();
    });
    // match if any of the tokens matches the text
    let answer = tokens.some(t => {
      let bool = text.indexOf(t) > -1;
      return bool;
    });

    return answer;
  }

}
