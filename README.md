# grunt-kevoree-registry

> Grunt plugin that handles POST of Kevoree models to registry.kevoree.org using kevoree-registry-client

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-kevoree-registry --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-kevoree-registry');
```

## The "kevoree_registry" task

### Overview
In your project's Gruntfile, add a section named `kevoree_registry` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  kevoree_registry: {
    options: {
      type: 'json',
      host: 'registry.kevoree.org',
      port: 80
    },
    src: 'kevlib.json'
  }
});
```

### Options

#### options.type
Type: `String`
Default value: `'json'`

A string value that is used to tell the encoding type of the model you want to push.  
Available types ('json', 'xmi', 'trace')

#### options.host
Type: `String`
Default value: `'registry.kevoree.org'`

A string value used to specified the remote Kevoree registry you want to publish the model to.

#### options.port
Type: `Number`
Default value: `80`

A number value used to specified the remote Kevoree registry's port you want to publish the model to.


### Command line options
You can also update the default host and port of the targeted registry directly in the command line.
For example the following command will try to publish the deploy unit to a registry located at http://localhost:8080/
```bash
$ grunt publish --kevoree-registry-host=localhost --kevoree-registry-port=8008
```