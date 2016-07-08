'use strict';

var path = require('path');
var api = require('kevoree-registry-api');
var nconf = require('nconf');
var kevoree = require('kevoree-library').org.kevoree;

var auth = require('../lib/auth');
var diff = require('../lib/diff');
var du = require('../lib/du');

function genUrl() {
  var host = nconf.get('registry:host');
  var port = nconf.get('registry:port');
  var protocol = nconf.get('registry:ssl') ? 'https://' : 'http://';
  return protocol + host + ((port === 80) ? '' : ':' + port);
}

function computeNamespace(pkg) {
  var name = pkg.name;

  function walk(elem) {
    if (elem.eContainer()) {
      name = elem.name + '.' + name;
      walk(elem.eContainer());
    }
  }
  walk(pkg.eContainer());
  return name;
}

var HOME_DIR = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
var KREGRC_PATH = path.resolve(HOME_DIR, '.kregrc');

module.exports = function (grunt) {
  grunt.registerMultiTask(
    'kevoree_registry',
    'Grunt plugin to publish Kevoree models to a Kevoree Registry (you can use --kevoree-registry-host and --kevoree-registry-port to target an alternative registry).',
    function () {
      var done = this.async();

      // Merge task-specific and/or target-specific options with these defaults.
      var options = this.options({
        registry: {
          host: grunt.option('kevoree-registry-host') || 'registry.kevoree.org',
          port: grunt.option('kevoree-registry-port') || 80,
          ssl: true
        },
        user: {}
      });
      var config = nconf.argv().env().file(KREGRC_PATH);
      config.use('memory');
      if (options.registry.hasOwnProperty('host')) {
        config.set('registry:host', options.registry.host);
      }
      if (options.registry.hasOwnProperty('port')) {
        config.set('registry:port', options.registry.port);
      }
      if (options.registry.hasOwnProperty('ssl')) {
        config.set('registry:ssl', options.registry.ssl);
      }
      if (options.user.hasOwnProperty('login')) {
        config.set('user:login', options.user.login);
      }
      if (options.user.hasOwnProperty('password')) {
        config.set('user:password', options.user.password);
      }
      if (!config.get('oauth')) {
        config.set('oauth', {
          client_secret: 'kevoree_registryapp_secret',
          client_id: 'kevoree_registryapp'
        });
      }

      var url = genUrl();
      grunt.log.ok('Registry: ' + url.blue);

      var factory = new kevoree.factory.DefaultKevoreeFactory();
      var compare = factory.createModelCompare();
      var loader = factory.createJSONLoader();
      var serializer = factory.createJSONSerializer();

      if (this.files.length === 1) {
        var filepath = this.files[0].src[0];
        if (!grunt.file.exists(filepath)) {
          done(new Error('Model file "' + filepath + '" not found.'));
        } else {
          var modelStr = grunt.file.read(filepath);
          var model;
          try {
            model = loader.loadModelFromString(modelStr).get(0);
          } catch (err) {
            done(new Error('Unable to load model from file "' + filepath + '"'));
            return;
          }

          grunt.log.ok('Model:    ' + filepath.blue);
          var tdefs = model.select('**/typeDefinitions[]').array;
          if (!tdefs || tdefs.length > 1) {
            done(new Error('Model must define one TypeDefinition strictly (found: ' + tdefs.length + ')'));
            return;
          } else {
            var tdefStr;
            try {
              tdefs[0].removeAllDeployUnits();
              tdefStr = serializer.serialize(tdefs[0]).trim();
            } catch (err) {
              done(new Error('Unable to serialize TypeDefinition ' + tdefs[0].name + '/' + tdefs[0].version));
              return;
            }

            var namespace = computeNamespace(tdefs[0].eContainer());
            grunt.log.writeln();
            grunt.log.writeln('Looking for ' + (namespace + '.' + tdefs[0].name +
              '/' + tdefs[0].version).bold + ' in the registry...');
            api.tdef({
                namespace: namespace,
                name: tdefs[0].name,
                version: tdefs[0].version
              })
              .get()
              .then(function (tdef) {
                grunt.log.ok('Found (id:' + tdef.id + ')');
                grunt.log.writeln();
                grunt.verbose.writeln('Loading model...');
                var regTdef;
                try {
                  regTdef = loader.loadModelFromString(tdef.model).get(0);
                  // create a ContainerRoot for registry tdef
                  var regModel = factory.createContainerRoot().withGenerated_KMF_ID(0);
                  factory.root(regModel);
                  var regPkg = factory.createPackage();
                  regPkg.name = tdef.namespace.name;
                  regModel.addPackages(regPkg);
                  regPkg.addTypeDefinitions(regTdef);
                  // create a ContainerRoot for src tdef
                  var srcModel = factory.createContainerRoot().withGenerated_KMF_ID(0);
                  factory.root(srcModel);
                  var srcPkg = factory.createPackage();
                  srcPkg.name = tdef.namespace.name;
                  srcModel.addPackages(srcPkg);
                  srcPkg.addTypeDefinitions(tdefs[0]);
                  // diff the two models to ensure there are the same
                  var traces = compare.diff(regModel, srcModel).traces.array;
                  if (traces.length === 0) {
                    // no diff between local and registry: good to go
                    du(grunt, namespace, tdefs[0], model, done);
                  } else {
                    // there is differences between local and registry: error
                    diff(grunt, srcModel, regModel, traces);
                    done(new Error('If you want to use your local changes then you have to increment your TypeDefinition version.'));
                  }
                } catch (err) {
                  done(err);
                }
              })
              .catch(function (err) {
                if (err.code === 404) {
                  // typeDef does not exist: create it
                  grunt.log.warn('Not found.');
                  grunt.log.writeln('Trying to add ' + (namespace + '.' +
                    tdefs[0].name + '/' + tdefs[0].version).bold + ' in the registry...');

                  grunt.log.writeln();
                  auth(grunt)
                    .then(function () {
                      grunt.verbose.writeln('TypeDefinition Model: ' + JSON.stringify(JSON.parse(tdefStr), null, 2));
                      api.tdef({
                          namespace: namespace,
                          name: tdefs[0].name,
                          version: tdefs[0].version,
                          model: tdefStr
                        })
                        .create()
                        .then(function () {
                          grunt.log.writeln();
                          grunt.log.ok('Success:  ' + (namespace + '.' +
                            tdefs[0].name + '/' + tdefs[0].version).bold + ' published on registry');
                          du(grunt, namespace, tdefs[0], model, done);
                        })
                        .catch(function (err) {
                          if (err.code === 401) {
                            grunt.log.warn('You are not logged in');
                          } else if (err.code === 403) {
                            grunt.log.warn('You are not a member of namespace "' + namespace + '"');
                          } else {
                            grunt.log.warn(err.message);
                          }
                          done(err);
                        });
                    })
                    .catch(function (err) {
                      done(err);
                    });
                } else {
                  done(err);
                }
              });
          }
        }
      } else {
        done(new Error('You must specify one Kevoree model JSON file'));
      }
    });
};
