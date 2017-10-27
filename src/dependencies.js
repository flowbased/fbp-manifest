/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was updated by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let main;
const clone = require('clone');
const path = require('path');
const fs = require('fs');
const fbp = require('fbp');
const Promise = require('bluebird');
const loader = require('./load');

const loadGraph = (graphPath, callback) =>
  fs.readFile(graphPath, 'utf-8', function (err, content) {
    let e, graph;
    if (err) { return callback(err); }
    if (path.extname(graphPath) === '.fbp') {
      try {
        graph = fbp.parse(content);
      } catch (error) {
        e = error;
        return callback(e);
      }
      return callback(null, graph);
    }
    try {
      graph = JSON.parse(content);
    } catch (error1) {
      e = error1;
      return callback(e);
    }
    return callback(null, graph);
  })
;

exports.findComponent = function (modules, component) {
  for (let m of Array.from(modules)) {
    for (let c of Array.from(m.components)) {
      if ((c.name === component) || (`${m.name}/${c.name}` === component)) {
        return c;
      }
    }
  }
  return null;
};

exports.checkCustomLoaderInModules = function (modules, component) {
  for (let m of Array.from(modules)) {
    if (exports.checkCustomLoader(m, component)) { return true; }
    continue;
  }
  return false;
};

exports.checkCustomLoader = function (module, component) {
  if (!component) { return false; }
  if (!(module.noflo != null ? module.noflo.loader : undefined)) { return false; }
  const componentModule = component.split('/')[0];
  if (componentModule !== module.name) { return false; }
  return true;
};

exports.filterModules = function (modules, components, callback) {
  let componentsFound = [];
  const filteredModules = [];

  modules.forEach(function (m) {
    // Filter components list to only the ones used in graph(s)
    const foundComponents = m.components.filter(function (c) {
      if (!c) { return false; }
      let foundAsDependency = false;
      if (Array.from(components).includes(c.name)) {
        componentsFound.push(c.name);
        foundAsDependency = true;
      }
      if (Array.from(components).includes(`${m.name}/${c.name}`)) {
        componentsFound.push(`${m.name}/${c.name}`);
        foundAsDependency = true;
      }
      return foundAsDependency;
    });
    // Check if graph(s) depend on dynamically loaded components
    const customLoaderComponents = components.filter(function (c) {
      if (!c) { return false; }
      if (exports.checkCustomLoader(m, c)) {
        return true;
      }
      return false;
    });
    componentsFound = componentsFound.concat(customLoaderComponents);
    if (!foundComponents.length && !customLoaderComponents.length) { return; }
    const newModule = clone(m);
    newModule.components = foundComponents;
    return filteredModules.push(newModule);
  });

  components = components.filter(c => componentsFound.indexOf(c) === -1);

  if (components.length) {
    return callback(new Error(`Missing components: ${components.join(', ')}`));
  }
  return callback(null, filteredModules);
};

exports.resolve = function (modules, component, options, callback) {
  const componentFound = exports.findComponent(modules, component);
  if (!componentFound) {
    // Check if the dependended module registers a custom loader
    const customLoader = exports.checkCustomLoaderInModules(modules, component);
    if (customLoader) { return callback(null, [component]); }
    // Otherwise we fail with missing dependency
    return callback(new Error(`Component ${component} not available`));
  }

  if (componentFound.elementary) {
    callback(null, [component]);
    return;
  }

  if (!componentFound.source) {
    return callback(new Error(`Graph source not available for ${component}`));
  }

  const graphPath = path.resolve(options.baseDir, componentFound.source);
  return loadGraph(graphPath, function (err, graph) {
    if (err) { return callback(err); }
    const components = [];
    for (let k in graph.processes) {
      const v = graph.processes[k];
      if (!v.component) { continue; }
      components.push(v.component);
    }

    const resolver = Promise.promisify(exports.resolve);
    return Promise.map(components, c => resolver(modules, c, options)).nodeify(function (err, deps) {
      if (err != null ? err.cause : undefined) { return callback(err.cause); }
      if (err) { return callback(err); }
      const subs = [component];
      for (let s of Array.from(deps)) {
        for (let sc of Array.from(s)) {
          if (subs.indexOf(sc) !== -1) { continue; }
          subs.push(sc);
        }
      }
      return callback(null, subs);
    });
  });
};

exports.find = (modules, component, options, callback) =>
  exports.resolve(modules, component, options, function (err, components) {
    if (err) { return callback(err); }
    return exports.filterModules(modules, components, callback);
  })
;

exports.loadAndFind = (baseDir, component, options, callback) =>
  loader.load(baseDir, options, function (err, manifest) {
    if (err) { return callback(err); }
    return exports.find(manifest.modules, component, options, callback);
  })
;

exports.main = (main = function () {
  const list = val => val.split(',');
  const program = require('commander')
    .option('--runtimes <runtimes>', 'List components from runtimes', list)
    .option('--manifest <manifest>', 'Manifest file to use. Default is fbp.json', 'fbp.json')
    .arguments('<basedir> <component>')
    .parse(process.argv);

  if (program.args.length < 2) {
    program.args.unshift(process.cwd());
  }

  program.recursive = true;
  program.baseDir = program.args[0];
  return exports.loadAndFind(program.args[0], program.args[1], program, function (err, dependedModules) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    const manifest = {
      main: exports.findComponent(dependedModules, program.args[1]),
      version: 1,
      modules: dependedModules
    };
    console.log(JSON.stringify(manifest, null, 2));
    return process.exit(0);
  });
});
