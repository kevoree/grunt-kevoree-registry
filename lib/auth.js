'use strict';

var api = require('kevoree-registry-api');
var Q = require('q');
var inquirer = require('inquirer');
var nconf = require('kevoree-nconf');

module.exports = function auth(grunt) {
  return Q.Promise(function (resolve, reject) {
    Q.Promise(function (innerResolve, innerReject) {
      var password = nconf.get('user:password');
      if (password) {
        innerResolve(password);
      } else {
        grunt.log.ok('Login:    ' + nconf.get('user:login').blue);
        inquirer.prompt([
          {
            type: 'password',
            name: 'password',
            message: 'Password',
            validate: function (val) {
              return val.length > 0;
            }
          }
        ]).then(function (answers) {
          nconf.set('user:password', answers.password);
          innerResolve();
        }).catch(innerReject);
      }
    }).then(function () {
      api.auth({
          login: nconf.get('user:login'),
          password: nconf.get('user:password')
        })
        .login()
        .then(function () {
          grunt.log.ok('Auth ok');
          resolve();
        })
        .catch(function (err) {
          nconf.set('user:password', undefined);
          grunt.log.error(err.message || 'Authentication failed');
          reject(err);
        });
    }).catch(reject);
  });
};
