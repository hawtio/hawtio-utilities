/// <reference path="includes.ts"/>
/// <reference path="stringHelpers.ts"/>
namespace Core {

  /**
   * Typescript interface that represents the UserDetails service
   */
  export interface UserDetails {
    username: string;
    password: string;
    loginDetails?: any;
    token?: string;
  }

  /**
   * Typescript interface that represents the options needed to connect to another JVM
   */
  export interface ConnectOptions {
    scheme: string;
    host?: string;
    port?: number;
    path?: string;
    useProxy: boolean;
    jolokiaUrl?: string;
    userName: string;
    password: string;
    view: string;
    name: string;
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
