/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');

const readfile = Promise.promisify(fs.readFile);

const replaceMarker = function (str, marker, value) {
  marker = `#${marker.toUpperCase()}`;
  return str.replace(marker, value);
};

const replaceVariables = function (str, variables) {
  for (let marker in variables) {
    const value = variables[marker];
    str = replaceMarker(str, marker, value);
  }
  return str;
};

const componentsFromConfig = function (config) {
  const variables = config.variables || {};
  if (!config.components) { config.components = {}; }

  const components = {};
  for (let component in config.components) {
    const cmd = config.components[component];
    let componentName = component.split('/')[1];
    if (!componentName) { componentName = component; }
    variables['COMPONENTNAME'] = componentName;
    variables['COMPONENT'] = component;

    components[component] = replaceVariables(cmd, variables);
  }
  return components;
};

exports.list = function (baseDir, options, callback) {
  const packageFile = path.resolve(baseDir, 'package.json');
  return readfile(packageFile, 'utf-8')
    .then(function (json) {
      const packageData = JSON.parse(json);
      if (!packageData.msgflo) { return Promise.resolve([]); }

      const module = {
        name: packageData.name,
        description: packageData.description,
        runtime: 'msgflo',
        base: path.relative(options.root, baseDir),
        components: []
      };

      if (packageData.msgflo != null ? packageData.msgflo.icon : undefined) {
        module.icon = packageData.msgflo.icon;
      }

      const object = componentsFromConfig(packageData.msgflo);
      for (let name in object) {
        const definition = object[name];
        let componentName = name.split('/')[1];
        if (!componentName) { componentName = name; }
        module.components.push({
          name: componentName,
          exec: definition,
          elementary: false
        });
      }

      return Promise.resolve([module]);
    })
    .nodeify(callback);
};

exports.listDependencies = (baseDir, options, callback) => callback(null, []);
