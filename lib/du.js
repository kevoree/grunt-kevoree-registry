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
      var serializer = new kevoree.factory.DefaultKevoreeFactory().createJSONSerializer();
      duStr = serializer.serialize(dus[0]).trim();
    } catch (err) {
      done(err);
      return;
    }

    grunt.log.writeln();
    auth(grunt)
      .then(function () {
        grunt.log.writeln();
        grunt.log.writeln('Publishing DeployUnit ' + (dus[0].name + '/' + dus[0].version + '/' + dus[0].findFiltersByID('platform').value).bold + ' ...');
        api.du({
          namespace: namespace,
          tdefName: tdef.name,
          tdefVersion: tdef.version,
          name: dus[0].name,
          version: dus[0].version,
          platform: dus[0].findFiltersByID('platform').value,
          model: duStr
        })
        .create()
        .then(function () {
          grunt.log.ok('Success:  ' + (dus[0].name + '/' + dus[0].version + '/' + dus[0].findFiltersByID('platform').value).bold + ' published on registry');
          done();
        })
        .catch(function (err) {
          done(err);
        });
      })
      .catch(function (err) {
        done(err);
      });
  }
};
