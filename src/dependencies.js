const clone = require('clone');
const path = require('path');
const fs = require('fs');
const fbp = require('fbp');
const Promise = require('bluebird');
const program = require('commander');
const loader = require('./load');

function loadGraph(graphPath, callback) {
  return fs.readFile(graphPath, 'utf-8', (err, content) => {
    if (err) {
      callback(err);
      return;
    }
    let graph;
    if (path.extname(graphPath) === '.fbp') {
      try {
        graph = fbp.parse(content);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, graph);
      return;
    }
    try {
      graph = JSON.parse(content);
    } catch (error) {
      callback(error);
    }
    callback(null, graph);
  });
}

exports.findComponent = (modules, component) => {
  for (let i = 0; i < modules.length; i += 1) {
    const m = modules[i];
    for (let ii = 0; ii < m.components.length; ii += 1) {
      const c = m.components[ii];
      if ((c.name === component) || (`${m.name}/${c.name}` === component)) {
        return c;
      }
    }
  }
  return null;
};

exports.checkCustomLoaderInModules = (modules, component) => {
  const foundLoader = modules.find(m => exports.checkCustomLoader(m, component));
  if (foundLoader) {
    return true;
  }
  return false;
};

exports.checkCustomLoader = (module, component) => {
  if (!component) { return false; }
  if (!(module.noflo != null ? module.noflo.loader : undefined)) { return false; }
  const componentModule = component.split('/')[0];
  if (componentModule !== module.name) { return false; }
  return true;
};

exports.filterModules = (modules, components, callback) => {
  let componentsFound = [];
  const filteredModules = [];

  modules.forEach((m) => {
    // Filter components list to only the ones used in graph(s)
    const foundComponents = m.components.filter((c) => {
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
    const customLoaderComponents = components.filter((c) => {
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
    filteredModules.push(newModule);
  });

  const missingComponents = components.filter(c => componentsFound.indexOf(c) === -1);
  if (missingComponents.length) {
    callback(new Error(`Missing components: ${missingComponents.join(', ')}`));
    return;
  }
  callback(null, filteredModules);
};

exports.resolve = (modules, component, options, callback) => {
  const componentFound = exports.findComponent(modules, component);
  if (!componentFound) {
    // Check if the dependended module registers a custom loader
    const customLoader = exports.checkCustomLoaderInModules(modules, component);
    if (customLoader) {
      callback(null, [component]);
      return;
    }
    // Otherwise we fail with missing dependency
    callback(new Error(`Component ${component} not available`));
    return;
  }

  if (componentFound.elementary) {
    callback(null, [component]);
    return;
  }

  if (!componentFound.source) {
    callback(new Error(`Graph source not available for ${component}`));
    return;
  }

  const graphPath = path.resolve(options.baseDir, componentFound.source);
  loadGraph(graphPath, (err, graph) => {
    if (err) { return callback(err); }
    const components = [];
    Object.keys(graph.processes).forEach((k) => {
      const v = graph.processes[k];
      if (!v.component) { return; }
      components.push(v.component);
    });

    const resolver = Promise.promisify(exports.resolve);
    return Promise.map(components, c => resolver(modules, c, options)).nodeify((e, deps) => {
      if (e) {
        if (e.cause) {
          callback(e.cause);
          return;
        }
        callback(e);
      }
      const subs = [component];
      deps.forEach((s) => {
        s.forEach((sc) => {
          if (subs.indexOf(sc) !== -1) { return; }
          subs.push(sc);
        });
      });
      callback(null, subs);
    });
  });
};

exports.find = (modules, component, options, callback) => exports.resolve(
  modules,
  component,
  options,
  (err, components) => {
    if (err) { return callback(err); }
    return exports.filterModules(modules, components, callback);
  },
);

exports.loadAndFind = (baseDir, component, options, callback) => loader.load(
  baseDir,
  options,
  (err, manifest) => {
    if (err) {
      callback(err);
      return;
    }
    exports.find(manifest.modules, component, options, callback);
  },
);

exports.main = () => {
  const list = val => val.split(',');
  program
    .option('--runtimes <runtimes>', 'List components from runtimes', list)
    .option('--manifest <manifest>', 'Manifest file to use. Default is fbp.json', 'fbp.json')
    .arguments('<basedir> <component>')
    .parse(process.argv);

  if (program.args.length < 2) {
    program.args.unshift(process.cwd());
  }

  program.recursive = true;
  [program.baseDir] = program.args;
  return exports.loadAndFind(program.args[0], program.args[1], program, (err, dependedModules) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    const manifest = {
      main: exports.findComponent(dependedModules, program.args[1]),
      version: 1,
      modules: dependedModules,
    };
    console.log(JSON.stringify(manifest, null, 2));
    process.exit(0);
  });
};
