'use strict';

var kevoree = require('kevoree-library');
var api = require('kevoree-registry-api');

var auth = require('./auth');

module.exports = function du(grunt, namespace, tdef, model, done) {
  var dus = model.select('**/deployUnits[]').array;
  if (!dus || dus.length !== 1) {
    done(new Error('Model must define one DeployUnit strictly (found: ' + dus.length + ')'));
  } else {
    var duStr;
    try {
      var factory = new kevoree.factory.DefaultKevoreeFactory();
      var serializer = factory.createJSONSerializer();
      var cloner = factory.createModelCloner();
      var clonedModel = cloner.clone(model);
      console.log('>', tdef.path());
      var tdefFound = clonedModel.findByPath(tdef.path());
      tdefFound.delete();
      duStr = serializer.serialize(clonedModel).trim();
    } catch (err) {
      done(err);
      return;
    }

    grunt.log.writeln();
    auth(grunt)
      .then(function () {
        var deployUnit = {
          name: dus[0].name,
          version: dus[0].version,
          platform: dus[0].findFiltersByID('platform').value,
          model: duStr,
          typeDefinition: {
            name: tdef.name,
            version: tdef.version,
            namespace: {
              name: namespace
            }
          }
        };

        grunt.log.writeln();
        grunt.log.writeln('Looking for DeployUnit ' + (deployUnit.name + '/' + deployUnit.version + '/' + deployUnit.platform).bold + ' in the registry ...');
        api.du(deployUnit)
        .get()
        .then(function (du) {
          grunt.log.ok('Found (id:' + du.id + '), updating...');
          du.model = deployUnit.model;
          grunt.log.writeln();
          api.du(du)
            .update()
            .then(function () {
              grunt.log.ok('Success:  ' + (du.name + '/' + du.version + '/' + du.platform).bold + ' published on registry');
              done();
            })
            .catch(function (err) {
              grunt.log.warn(err.message);
              done(new Error('Unable to update DeployUnit.'));
            });
        })
        .catch(function (err) {
          if (err.code === 404) {
            grunt.log.warn('Not found, creating...');
            grunt.log.writeln();
            api.du(deployUnit)
              .create()
              .then(function () {
                grunt.log.ok('Success:  ' + (deployUnit.name + '/' + deployUnit.version + '/' + deployUnit.platform).bold + ' published on registry');
                done();
              })
              .catch(function (err) {
                grunt.log.warn(err.message);
                done(new Error('Unable to create DeployUnit.'));
              });
          } else {
            grunt.log.warn(err.message);
            done(new Error('Something went wrong while trying to find DeployUnit on registry.'));
          }
        });
      })
      .catch(function (err) {
        done(err);
      });
  }
};
