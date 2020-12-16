const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const utils = require('./utils');

const readdir = promisify(fs.readdir);
const readfile = promisify(fs.readFile);
const stat = promisify(fs.stat);

const supportedRuntimes = [
  'noflo',
  'noflo-nodejs',
  'noflo-browser',
];

/**
 * @typedef NoFloManifestComponent
 * @property {string} runtime
 */

/**
 * @typedef {import("../list").FbpManifestComponent & NoFloManifestComponent} ManifestComponent
 */

/**
 * @param {string} componentDir
 * @param {import("../list").FbpManifestOptions} options
 * @returns {Promise<Array<ManifestComponent>>}
 */
function listComponents(componentDir, options) {
  return readdir(componentDir)
    .then((entries) => {
      const potentialComponents = entries.filter((c) => [
        '.coffee',
        '.ts',
        '.js',
        '.litcoffee',
      ].includes(path.extname(c)) && c.indexOf('.d.ts') === -1);
      return Promise
        .all(potentialComponents.map((p) => {
          const componentPath = path.resolve(componentDir, p);
          return stat(componentPath)
            .then((stats) => {
              if (stats.isFile()) {
                return componentPath;
              }
              return false;
            });
        }))
        .then((potential) => potential.filter((p) => typeof p === 'string'))
        .then((potential) => potential
          .reduce((chain, localPath) => chain
            .then((current) => {
              const p = /** @type {string} */ (localPath);
              const componentPath = path.resolve(componentDir, p);
              const component = {
                name: null,
                path: path.relative(options.root, componentPath),
                source: path.relative(options.root, componentPath),
                elementary: true,
              };
              return readfile(componentPath, 'utf-8')
                .then((source) => {
                  component.name = utils.parseId(source, componentPath);
                  component.runtime = utils.parsePlatform(source);
                  if (['all', null].includes(component.runtime)) {
                    // Default to NoFlo on any platform
                    component.runtime = 'noflo';
                  }
                  return component;
                })
                .then((c) => [...current, c]);
            }), Promise.resolve([])))
        .then((components) => {
          const potentialDirs = entries.filter((entry) => !potentialComponents.includes(entry));
          if (!potentialDirs.length) {
            return Promise.resolve(components);
          }
          if (!options.subdirs) {
            return Promise.resolve(components);
          }
          // Seek from subdirectories
          return Promise
            .all(potentialDirs.map((d) => {
              const dirPath = path.resolve(componentDir, d);
              return stat(dirPath)
                .then((stats) => {
                  if (!stats.isDirectory()) {
                    return [];
                  }
                  return listComponents(dirPath, options);
                });
            }))
            .then((subDirs) => {
              let allComponents = components;
              subDirs.forEach((subComponents) => {
                allComponents = allComponents.concat(subComponents);
              });
              return Promise.resolve(allComponents);
            });
        });
    })
    .then((components) => components.filter(
      (c) => supportedRuntimes.includes(c.runtime),
    ))
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return Promise.resolve([]);
      }
      return Promise.reject(err);
    });
}

/**
 * @param {string} componentDir
 * @param {import("../list").FbpManifestOptions} options
 * @returns {Promise<Array<ManifestComponent>>}
 */
function listGraphs(componentDir, options) {
  return readdir(componentDir)
    .then((components) => {
      const potentialGraphs = components.filter((c) => [
        '.json',
        '.fbp',
      ].includes(path.extname(c)));
      return Promise
        .all(potentialGraphs.map((p) => {
          const componentPath = path.resolve(componentDir, p);
          return stat(componentPath)
            .then((stats) => {
              if (stats.isFile()) {
                return componentPath;
              }
              return false;
            });
        }))
        .then((potential) => potential.filter((p) => typeof p === 'string'))
        .then((potential) => potential
          .reduce((chain, localPath) => chain
            .then((current) => {
              const p = /** @type {string} */ (localPath);
              const componentPath = path.resolve(componentDir, p);
              const component = {
                name: null,
                path: path.relative(options.root, componentPath),
                source: path.relative(options.root, componentPath),
                elementary: false,
              };
              return readfile(componentPath, 'utf-8')
                .then((source) => {
                  if (path.extname(component.path) === '.fbp') {
                    component.name = utils.parseId(source, componentPath);
                    component.runtime = utils.parsePlatform(source);
                    return Promise.resolve(component);
                  }
                  const graph = JSON.parse(source);
                  if (graph.properties && graph.properties.id) {
                    component.name = graph.properties.id;
                  } else {
                    component.name = utils.parseId(source, componentPath);
                  }
                  component.runtime = null;
                  if (graph.properties && graph.properties.environment) {
                    if (graph.properties.environment.type) {
                      component.runtime = graph.properties.environment.type;
                    } else {
                      component.runtime = graph.properties.environment;
                    }
                  }
                  if (graph.properties != null ? graph.properties.main : undefined) {
                    if (!component.noflo) { component.noflo = {}; }
                    component.noflo.main = graph.properties.main;
                  }
                  return Promise.resolve(component);
                })
                .then((c) => [...current, c]);
            }), Promise.resolve([])))
        .then((comps) => comps.map((c) => {
          const comp = c;
          if (['all', null].includes(comp.runtime)) {
            // Default to NoFlo on any platform
            comp.runtime = 'noflo';
          }
          return comp;
        }));
    })
    .then((components) => components.filter((c) => {
      // Don't register "main" graphs as modules
      if (c.noflo != null ? c.noflo.main : undefined) { return false; }
      // Skip non-supported runtimes
      return supportedRuntimes.includes(c.runtime);
    }))
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return Promise.resolve([]);
      }
      return Promise.reject(err);
    });
}

/**
 * @param {string} specDir
 * @param {import("../list").FbpManifestModule} module
 * @returns {Promise<import("../list").FbpManifestModule>}
 */
function listSpecs(specDir, module, options) {
  return readdir(specDir)
    .then((entries) => {
      const potentialSpecs = entries.filter((c) => [
        '.coffee',
        '.ts',
        '.js',
        '.yaml',
        '.yml',
      ].includes(path.extname(c)));
      return Promise
        .all(potentialSpecs.map((p) => {
          const specPath = path.resolve(specDir, p);
          return stat(specPath)
            .then((stats) => {
              if (stats.isFile()) {
                return specPath;
              }
              return false;
            });
        }))
        .then((potential) => potential.filter((p) => typeof p === 'string'))

        .then((potential) => potential
          .reduce((chain, localPath) => chain
            .then((current) => {
              const p = /** @type {string} */ (localPath);
              const specPath = path.resolve(specDir, p);
              return readfile(specPath, 'utf-8')
                .then((source) => {
                  const specName = utils.parseId(source, specPath);
                  if (current[specName]
                    && path.extname(current[specName]) === '.yaml') {
                    // Prefer fbp-spec files
                    return current;
                  }
                  const cur = {
                    ...current,
                  };
                  cur[specName] = specPath;
                  return cur;
                });
            }), Promise.resolve({})));
    })
    .then((specs) => ({
      ...module,
      components: module.components.map((c) => {
        if (!specs[c.name]) {
          return c;
        }
        return {
          ...c,
          tests: path.relative(options.root, specs[c.name]),
        };
      }),
    }))
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return Promise.resolve(module);
      }
      return Promise.reject(err);
    });
}

/**
 * @param {string} baseDir
 * @param {import("../list").FbpManifestOptions} options
 */
function getModuleInfo(baseDir, options) { // eslint-disable-line no-unused-vars
  const packageFile = path.resolve(baseDir, 'package.json');
  return readfile(packageFile, 'utf-8')
    .catch((e) => {
      if ((e != null ? e.code : undefined) !== 'ENOENT') {
        return Promise.reject(e);
      }
      // Fake package with just dirname
      return JSON.stringify({
        name: path.basename(baseDir),
        description: null,
      });
    })
    .then((json) => JSON.parse(json))
    .then((packageData) => {
      const module = {
        name: packageData.name,
        description: packageData.description,
      };

      if (packageData.noflo != null ? packageData.noflo.icon : undefined) {
        module.icon = packageData.noflo.icon;
      }

      if (packageData.noflo != null ? packageData.noflo.loader : undefined) {
        if (!module.noflo) { module.noflo = {}; }
        module.noflo.loader = packageData.noflo.loader;
      }

      if (module.name === 'noflo') { module.name = ''; }
      if (module.name[0] === '@') {
        module.name = module.name.replace(/@[a-z-]+\//, '');
      }
      module.name = module.name.replace('noflo-', '');

      return module;
    });
}

/**
 * @param {string} baseDir
 * @returns {Promise<Array<import("../list").FbpManifestModule>>}
 */
exports.list = (baseDir, options) => getModuleInfo(baseDir, options)
  .then((module) => Promise
    .all([
      listComponents(path.resolve(baseDir, 'components/'), options),
      listGraphs(path.resolve(baseDir, 'graphs/'), options),
    ])
    .then(([components, graphs]) => ({
      module,
      components,
      graphs,
    })))
  .then(({ module, components, graphs }) => {
    if (!module) {
      return Promise.resolve([]);
    }
    const runtimes = {};
    components.forEach((c) => {
      const component = c;
      if (!runtimes[component.runtime]) {
        runtimes[component.runtime] = [];
      }
      runtimes[component.runtime].push(component);
      delete component.runtime;
    });
    graphs.forEach((c) => {
      const component = c;
      if (!runtimes[component.runtime]) {
        runtimes[component.runtime] = [];
      }
      runtimes[component.runtime].push(component);
      delete component.runtime;
    });

    /**
     * @type {Array<import("../list").FbpManifestModule>}
     */
    const modules = [];
    Object.keys(runtimes).forEach((k) => {
      const v = runtimes[k];
      modules.push({
        name: module.name,
        description: module.description,
        runtime: k,
        noflo: module.noflo,
        base: path.relative(options.root, baseDir),
        icon: module.icon,
        components: v,
      });
    });

    if ((graphs.length === 0)
      && (components.length === 0)
      && (module.noflo != null ? module.noflo.loader : undefined)) {
      // Component that only provides a custom loader, register for "noflo"
      modules.push({
        name: module.name,
        description: module.description,
        runtime: 'noflo',
        noflo: module.noflo,
        base: path.relative(options.root, baseDir),
        icon: module.icon,
        components: [],
      });
    }
    return Promise.resolve(modules);
  })
  .then((modules) => modules
    .reduce((chain, m) => chain
      .then((current) => listSpecs(path.resolve(baseDir, 'spec/'), m, options)
        .then((moduleWithSpecs) => current
          .concat(moduleWithSpecs))), Promise.resolve([])));

/**
 * @param {string} baseDir
 * @param {import("../list").FbpManifestOptions} options
 * @returns {Promise<Array<string>>}
 */
exports.listDependencies = (baseDir, options) => { // eslint-disable-line no-unused-vars
  const depsDir = path.resolve(baseDir, 'node_modules/');
  return readdir(depsDir)
    .then((deps) => {
      const suitableDeps = deps.filter((d) => d[0] !== '.');
      return suitableDeps
        .reduce((chain, d) => chain
          .then((current) => {
            const depsPath = path.resolve(depsDir, d);
            if (d[0] !== '@') {
              return Promise.resolve(current.concat([depsPath]));
            }
            return readdir(depsPath)
              .then((subDeps) => subDeps
                .map((s) => path.resolve(depsPath, s)))
              .then((subDepPaths) => current.concat(subDepPaths));
          }), Promise.resolve([]));
    })
    .then((depsPaths) => {
      let selectedDeps = [];
      depsPaths.forEach((d) => {
        selectedDeps = selectedDeps.concat(d);
      });
      return selectedDeps;
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return Promise.resolve([]);
      }
      return Promise.reject(err);
    });
};
