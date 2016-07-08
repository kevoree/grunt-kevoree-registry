'use strict';

var api = require('kevoree-registry-api');
var Q = require('q');
var inquirer = require('inquirer');
var nconf = require('nconf');

module.exports = function auth(grunt) {
  return Q.Promise(function (resolve, reject) {
    grunt.log.writeln();
    grunt.log.ok('Login:    ' + nconf.get('user:login').blue);
    Q.Promise(function (innerResolve, innerReject) {
      var password = nconf.get('user:password');
      if (password) {
        innerResolve(password);
      } else {
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
          innerResolve(answers.password);
        }).catch(innerReject);
      }
    }).then(function (password) {
      api.auth({
          login: nconf.get('user:login'),
          password: password
        })
        .login()
        .then(function () {
          grunt.log.ok('Auth ok');
          resolve();
        })
        .catch(function (err) {
          grunt.log.error(err.message || 'Authentication failed');
          reject(err);
        });
    }).catch(reject);
  });
};
