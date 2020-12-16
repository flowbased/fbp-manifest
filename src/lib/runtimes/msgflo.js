const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const readfile = promisify(fs.readFile);

/**
 * @param {string} str
 * @param {string} marker
 * @param {any} value
 * @returns {string}
 */
function replaceMarker(str, marker, value) {
  return str.replace(`#${marker.toUpperCase()}`, value);
}

/**
 * @param {string} string
 * @param {Object<string, any>} variables;
 * @returns {string}
 */
function replaceVariables(string, variables) {
  let str = string;
  Object.keys(variables).forEach((marker) => {
    const value = variables[marker];
    str = replaceMarker(str, marker, value);
  });
  return str;
}

/**
 * @param {Object} c
 * @param {Object<string, any>} [c.variables]
 * @param {Object<string, string>} [c.components]
 */
function componentsFromConfig(c) {
  const config = c;
  const variables = config.variables || {};
  if (!config.components) {
    config.components = {};
  }

  /** @type {Object<string, string>} */
  const components = {};
  Object.keys(config.components).forEach((component) => {
    if (!config.components) {
      return;
    }
    const cmd = config.components[component];
    let componentName = component.split('/')[1];
    if (!componentName) { componentName = component; }
    variables.COMPONENTNAME = componentName;
    variables.COMPONENT = component;

    components[component] = replaceVariables(cmd, variables);
  });
  return components;
}

/**
 * @param {string} baseDir
 * @param {import("../list").FbpManifestOptions} options
 * @returns {Promise<Array<import("../list").FbpManifestModule>>}
 */
exports.list = (baseDir, options) => {
  const packageFile = path.resolve(baseDir, 'package.json');
  return readfile(packageFile, 'utf-8')
    .then((json) => {
      const packageData = JSON.parse(json);
      if (!packageData.msgflo) { return Promise.resolve([]); }

      /**
       * @type {import("../list").FbpManifestModule}
       */
      const module = {
        name: packageData.name,
        description: packageData.description,
        runtime: 'msgflo',
        base: path.relative(options.root || '', baseDir),
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
    });
};

/**
 * @param {string} baseDir
 * @param {import("../list").FbpManifestOptions} options
 * @returns {Promise<Array<string>>}
 */
exports.listDependencies = (baseDir, options) => Promise.resolve([]); // eslint-disable-line no-unused-vars,max-len
