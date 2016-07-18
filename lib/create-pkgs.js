'use strict';

var kevoree = require('kevoree-library');

module.exports = function createPkgs(namespace, model) {
  var factory = new kevoree.factory.DefaultKevoreeFactory();
  var deepestPkg;
  var pkg;
  namespace.split('.').forEach(function (name, index, names) {
    var subPkg = factory.createPackage();
    subPkg.name = name;
    if (pkg) {
      pkg.addPackages(subPkg);
    } else {
      model.addPackages(subPkg);
    }
    pkg = subPkg;
    if (index+1 === names.length) {
      deepestPkg = subPkg;
    }
  });
  return deepestPkg;
};
