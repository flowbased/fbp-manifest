const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');

const readfile = Promise.promisify(fs.readFile);

function replaceMarker(str, marker, value) {
  return str.replace(`#${marker.toUpperCase()}`, value);
}

function replaceVariables(string, variables) {
  let str = string;
  Object.keys(variables).forEach((marker) => {
    const value = variables[marker];
    str = replaceMarker(str, marker, value);
  });
  return str;
}

function componentsFromConfig(c) {
  const config = c;
  const variables = config.variables || {};
  if (!config.components) { config.components = {}; }

  const components = {};
  Object.keys(config.components).forEach((component) => {
    const cmd = config.components[component];
    let componentName = component.split('/')[1];
    if (!componentName) { componentName = component; }
    variables.COMPONENTNAME = componentName;
    variables.COMPONENT = component;

    components[component] = replaceVariables(cmd, variables);
  });
  return components;
}

exports.list = (baseDir, options, callback) => {
  const packageFile = path.resolve(baseDir, 'package.json');
  return readfile(packageFile, 'utf-8')
    .then((json) => {
      const packageData = JSON.parse(json);
      if (!packageData.msgflo) { return Promise.resolve([]); }

      const module = {
        name: packageData.name,
        description: packageData.description,
        runtime: 'msgflo',
        base: path.relative(options.root, baseDir),
        components: [],
      };

      if (packageData.msgflo != null ? packageData.msgflo.icon : undefined) {
        module.icon = packageData.msgflo.icon;
      }

      const object = componentsFromConfig(packageData.msgflo);
      Object.keys(object).forEach((name) => {
        const definition = object[name];
        let componentName = name.split('/')[1];
        if (!componentName) { componentName = name; }
        module.components.push({
          name: componentName,
          exec: definition,
          elementary: false,
        });
      });

      return Promise.resolve([module]);
    })
    .nodeify(callback);
};

exports.listDependencies = (baseDir, options, callback) => callback(null, []);
