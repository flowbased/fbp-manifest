const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const utils = require('./utils');

const readdir = Promise.promisify(fs.readdir);
const readfile = Promise.promisify(fs.readFile);
const stat = Promise.promisify(fs.stat);

const supportedRuntimes = [
  'noflo',
  'noflo-nodejs',
  'noflo-browser',
];

function listComponents(componentDir, options, callback) {
  readdir(componentDir)
    .then((entries) => {
      const potentialComponents = entries.filter((c) => [
        '.coffee',
        '.ts',
        '.js',
        '.litcoffee',
      ].includes(path.extname(c)));
      return Promise.filter(potentialComponents, (p) => {
        const componentPath = path.resolve(componentDir, p);
        return stat(componentPath)
          .then((stats) => stats.isFile());
      }).then((potential) => Promise.map(potential, (p) => {
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
            // Default to NoFlo on any platform
            if (['all', null].includes(component.runtime)) { component.runtime = 'noflo'; }
            return Promise.resolve(component);
          });
      })).then((comps) => {
        let components = comps;
        const potentialDirs = entries.filter((entry) => !potentialComponents.includes(entry));
        if (!potentialDirs.length) { return Promise.resolve(components); }
        if (!options.subdirs) { return Promise.resolve(components); }
        // Seek from subdirectories
        return Promise.filter(potentialDirs, (d) => {
          const dirPath = path.resolve(componentDir, d);
          return stat(dirPath)
            .then((stats) => stats.isDirectory());
        }).then((directories) => Promise.map(directories, (d) => {
          const dirPath = path.resolve(componentDir, d);
          return Promise.promisify(listComponents)(dirPath, options);
        })).then((subDirs) => {
          subDirs.forEach((subComponents) => {
            components = components.concat(subComponents);
          });
          return Promise.resolve(components);
        });
      });
    })
    .then((components) => Promise.resolve(components.filter(
      (c) => supportedRuntimes.includes(c.runtime),
    )))
    .nodeify((err, components) => {
      if (err && (err.code === 'ENOENT')) { return callback(null, []); }
      if (err) { return callback(err); }
      return callback(null, components);
    });
  return null;
}

function listGraphs(componentDir, options, callback) {
  readdir(componentDir)
    .then((components) => {
      const potentialGraphs = components.filter((c) => [
        '.json',
        '.fbp',
      ].includes(path.extname(c)));
      return Promise.filter(potentialGraphs, (p) => {
        const componentPath = path.resolve(componentDir, p);
        return stat(componentPath)
          .then((stats) => stats.isFile());
      }).then((potential) => Promise.map(potential, (p) => {
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
          }).then((c) => {
            const comp = c;
            // Default to NoFlo on any platform
            if (['all', null].includes(comp.runtime)) { comp.runtime = 'noflo'; }
            return Promise.resolve(comp);
          });
      }));
    }).then((components) => Promise.resolve(components.filter((c) => {
      // Don't register "main" graphs as modules
      if (c.noflo != null ? c.noflo.main : undefined) { return false; }
      // Skip non-supported runtimes
      return supportedRuntimes.includes(c.runtime);
    }))).nodeify((err, components) => {
      if (err && (err.code === 'ENOENT')) { return callback(null, []); }
      if (err) { return callback(err); }
      return callback(null, components);
    });
  return null;
}

function getModuleInfo(baseDir, options, callback) {
  const packageFile = path.resolve(baseDir, 'package.json');
  return readfile(packageFile, 'utf-8')
    .catch((e) => {
      if ((e != null ? e.code : undefined) !== 'ENOENT') { return Promise.reject(e); }
      // Fake package with just dirname
      return Promise.resolve({
        name: path.basename(baseDir),
        description: null,
      });
    }).then((json) => {
      if (typeof json === 'object') { return Promise.resolve(json); }
      return Promise.resolve(JSON.parse(json));
    }).then((packageData) => {
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
      if (module.name[0] === '@') { module.name = module.name.replace(/@[a-z-]+\//, ''); }
      module.name = module.name.replace('noflo-', '');

      return Promise.resolve(module);
    })
    .nodeify((err, module) => {
      if (err && (err.code === 'ENOENT')) { return callback(null, null); }
      if (err) { return callback(err); }
      return callback(null, module);
    });
}

exports.list = (baseDir, options, callback) => {
  const listC = Promise.promisify(listComponents);
  const listG = Promise.promisify(listGraphs);
  const getModule = Promise.promisify(getModuleInfo);
  return Promise.all([
    getModule(baseDir, options),
    listC(path.resolve(baseDir, 'components/'), options),
    listG(path.resolve(baseDir, 'graphs/'), options),
  ])
    .then((...args) => {
      const [module, components, graphs] = Array.from(args[0]);
      if (!module) { return Promise.resolve([]); }
      const runtimes = {};
      components.forEach((c) => {
        const component = c;
        if (!runtimes[component.runtime]) { runtimes[component.runtime] = []; }
        runtimes[component.runtime].push(component);
        delete component.runtime;
      });
      graphs.forEach((c) => {
        const component = c;
        if (!runtimes[component.runtime]) { runtimes[component.runtime] = []; }
        runtimes[component.runtime].push(component);
        delete component.runtime;
      });

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
    }).nodeify(callback);
};

exports.listDependencies = (baseDir, options, callback) => {
  const depsDir = path.resolve(baseDir, 'node_modules/');
  return readdir(depsDir)
    .then((deps) => {
      const suitableDeps = deps.filter((d) => d[0] !== '.');
      return Promise.map(suitableDeps, (d) => {
        const depsPath = path.resolve(depsDir, d);
        if (d[0] !== '@') {
          return Promise.resolve([depsPath]);
        }
        return readdir(depsPath)
          .then((subDeps) => Promise.resolve(subDeps.map((s) => path.resolve(depsPath, s))));
      }).then((depsPaths) => {
        let selectedDeps = [];
        depsPaths.forEach((d) => {
          selectedDeps = selectedDeps.concat(d);
        });
        return Promise.resolve(selectedDeps);
      });
    }).nodeify((err, deps) => {
      if (err && (err.code === 'ENOENT')) { return callback(null, []); }
      if (err) { return callback(err); }
      return callback(null, deps);
    });
};
