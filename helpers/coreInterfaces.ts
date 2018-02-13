/// <reference path="includes.ts"/>
/// <reference path="stringHelpers.ts"/>
namespace Core {

  /**
   * Typescript interface that represents the UserDetails service
   */
  export interface UserDetails {
    username: String
    password: String
    loginDetails?: Object
  }

  /**
   * Typescript interface that represents the options needed to connect to another JVM
   */
  export interface ConnectOptions {
    scheme: String;
    host?: String;
    port?: Number;
    path?: String;
    useProxy: boolean;
    jolokiaUrl?: String;
    userName: String;
    password: String;
    view: String;
    name: String;
    secure: boolean;
  }

  export interface ConnectionMap {
    [name: string]: ConnectOptions;
  }

  /**
   * Factory to create an instance of ConnectToServerOptions
   * @returns {ConnectToServerOptions}
   */
  export function createConnectOptions(options?: any): ConnectOptions {
    let defaults: ConnectOptions = {
      scheme: 'http',
      host: null,
      port: null,
      path: null,
      useProxy: true,
      jolokiaUrl: null,
      userName: null,
      password: null,
      view: null,
      name: null,
      secure: false
    };
    let opts = options || {};
    return angular.extend(defaults, opts);
  }

}
