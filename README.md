## hawtio-utilities

This module contains various helper functions and some classes that can be used by hawtio plugins.

## Installation

```
yarn add @hawtio/utilities
```

## Set up development environment

### Clone the repository

```
git clone https://github.com/hawtio/hawtio-utilities
cd hawtio-utilities
```

### Install development tools

* [Node.js](http://nodejs.org)
* [Yarn](https://yarnpkg.com)
* [gulp](http://gulpjs.com/)

### Install project dependencies

```
yarn install:dev
```

### Run the demo web application

```
gulp
```

### Change the default proxy port

To proxy to a local JVM running on a different port than `8282` specify the `--port` CLI arguement to gulp:
```
gulp --port=8181
```

#### Output build to a different directory

When developing this plugin in a dependent console you can change the output directory where the compiled .js and .css go.  Just use the 'out' flag to set a different output directory, for example:

`gulp watch --out=../fabric8-console/libs/hawtio-utilities/dist/`

Whenever the build completes the compiled .js file will be put into the target directory.  Don't forget to first do a `gulp build` without this flag before committing changes!
