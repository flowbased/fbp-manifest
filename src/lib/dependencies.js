const path = require('path');
const fbpGraph = require('fbp-graph');
const program = require('commander');
const loader = require('./load');
const lister = require('./list'); // eslint-disable-line no-unused-vars

/**
 * @param {Array<lister.FbpManifestModule>} modules
 * @param {string} component
 * @returns {lister.FbpManifestComponent|null}
 */
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

/**
 * @param {Array<lister.FbpManifestModule>} modules
 * @param {string} component
 * @returns {boolean}
 */
exports.checkCustomLoaderInModules = (modules, component) => {
  const foundLoader = modules.find((m) => exports.checkCustomLoader(m, component));
  if (foundLoader) {
    return true;
  }
  return false;
};

/**
 * @param {lister.FbpManifestModule} module
 * @param {string} component
 * @returns {boolean}
 */
exports.checkCustomLoader = (module, component) => {
  if (!component) { return false; }
  if (!(module.noflo != null ? module.noflo.loader : undefined)) { return false; }
  const componentModule = component.split('/')[0];
  if (componentModule !== module.name) { return false; }
  return true;
};

/**
 * @param {Array<lister.FbpManifestModule>} modules
 * @param {string[]} components
 * @param {Promise<Array<lister.FbpManifestModule>>} modules
 */
exports.filterModules = (modules, components) => {
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
    const newModule = {
      ...m,
      components: foundComponents,
    };
    filteredModules.push(newModule);
  });

  const missingComponents = components.filter((c) => componentsFound.indexOf(c) === -1);
  if (missingComponents.length) {
    return Promise.reject(new Error(`Missing components: ${missingComponents.join(', ')}`));
  }
  return Promise.resolve(filteredModules);
};

/**
 * @param {Array<lister.FbpManifestModule>} modules
 * @param {string} component
 * @param {lister.FbpManifestOptions} options
 * @returns {Promise<Array<string>>}
 */
exports.resolve = (modules, component, options) => {
  const componentFound = exports.findComponent(modules, component);
  if (!componentFound) {
    // Check if the dependended module registers a custom loader
    const customLoader = exports.checkCustomLoaderInModules(modules, component);
    if (customLoader) {
      return Promise.resolve([component]);
    }
    // Otherwise we fail with missing dependency
    return Promise.reject(new Error(`Component ${component} not available`));
  }

  if (componentFound.elementary) {
    // Non-graph components don't have dependencies
    return Promise.resolve([component]);
  }

  if (!componentFound.source) {
    return Promise.reject(new Error(`Graph source not available for ${component}`));
  }

  const graphPath = path.resolve(options.baseDir, componentFound.source);
  return fbpGraph.graph.loadFile(graphPath)
    .then((graph) => {
      const components = [];
      graph.nodes.forEach((node) => {
        if (!node.component) {
          return;
        }
        components.push(node.component);
      });
      // Then recurse to find deps-of-deps
      return Promise
        .all(components.map((c) => exports
          .resolve(modules, c, options)
          .catch(() => [])))
        .then((deps) => {
          deps.push([component]);
          deps.forEach((subDeps) => {
            subDeps.forEach((dep) => {
              if (components.indexOf(dep) !== -1) {
                return;
              }
              components.push(dep);
            });
          });
          return components;
        });
    });
};

/**
 * @param {Array<lister.FbpManifestModule>} modules
 * @param {string} component
 * @param {lister.FbpManifestOptions} options
 * @returns {Promise<Array<lister.FbpManifestModule>>}
 */
exports.find = (modules, component, options) => exports
  .resolve(modules, component, options)
  .then((components) => exports
    .filterModules(modules, components));

/**
 * @param {string} baseDir
 * @param {string} component
 * @param {lister.FbpManifestOptions} options
 * @returns {Promise<Array<lister.FbpManifestModule>>}
 */
exports.loadAndFind = (baseDir, component, options) => loader
  .load(baseDir, options)
  .then((manifest) => exports.find(manifest.modules, component, options));

exports.main = () => {
  const list = (val) => val.split(',');
  program
    .option('--runtimes <runtimes>', 'List components from runtimes', list)
    .option('--manifest <manifest>', 'Manifest file to use. Default is fbp.json', 'fbp.json')
    .arguments('<basedir> <component>')
    .parse(process.argv);

  if (program.args.length < 2) {
    program.args.unshift(process.cwd());
  }

  program.recursive = true;
  const [baseDir] = program.args;
  exports.loadAndFind(program.args[0], program.args[1], {
    runtimes: program.runtimes,
    manifest: program.manifest,
    baseDir,
  })
    .then((dependedModules) => {
      const manifest = {
        main: exports.findComponent(dependedModules, program.args[1]),
        version: 1,
        modules: dependedModules,
      };
      console.log(JSON.stringify(manifest, null, 2));
      process.exit(0);
    }, (err) => {
      console.error(err);
      process.exit(1);
    });
};
