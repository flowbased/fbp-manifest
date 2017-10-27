/* eslint-disable
    no-return-assign,
    no-useless-escape,
*/
// TODO: This file was updated by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
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
  'noflo-browser'
];

var listComponents = function (componentDir, options, callback) {
  readdir(componentDir)
    .then(function (entries) {
      const potential = entries.filter(function (c) {
        let needle;
        return (needle = path.extname(c), [
          '.coffee',
          '.js',
          '.litcoffee'
        ].includes(needle));
      });
      return Promise.filter(potential, function (p) {
        const componentPath = path.resolve(componentDir, p);
        return stat(componentPath)
          .then(stats => stats.isFile());
      }).then(potential =>
        Promise.map(potential, function (p) {
          const componentPath = path.resolve(componentDir, p);
          const component = {
            name: null,
            path: path.relative(options.root, componentPath),
            source: path.relative(options.root, componentPath),
            elementary: true
          };
          return readfile(componentPath, 'utf-8')
            .then(function (source) {
              component.name = utils.parseId(source, componentPath);
              component.runtime = utils.parsePlatform(source);
              // Default to NoFlo on any platform
              if (['all', null].includes(component.runtime)) { component.runtime = 'noflo'; }
              return Promise.resolve(component);
            });
        })).then(function (components) {
        const potentialDirs = entries.filter(entry => !Array.from(potential).includes(entry));
        if (!potentialDirs.length) { return Promise.resolve(components); }
        if (!options.subdirs) { return Promise.resolve(components); }
        // Seek from subdirectories
        return Promise.filter(potentialDirs, function (d) {
          const dirPath = path.resolve(componentDir, d);
          return stat(dirPath)
            .then(stats => stats.isDirectory());
        }).then(directories =>
          Promise.map(directories, function (d) {
            const dirPath = path.resolve(componentDir, d);
            listComponents = Promise.promisify(listComponents);
            return listComponents(dirPath, options);
          })).then(function (subDirs) {
          for (let subComponents of Array.from(subDirs)) {
            components = components.concat(subComponents);
          }
          return Promise.resolve(components);
        });
      });
    }).then(components =>
      Promise.resolve(components.filter(c => Array.from(supportedRuntimes).includes(c.runtime))
      )).nodeify(function (err, components) {
      if (err && (err.code === 'ENOENT')) { return callback(null, []); }
      if (err) { return callback(err); }
      return callback(null, components);
    });
  return null;
};

const listGraphs = function (componentDir, options, callback) {
  readdir(componentDir)
    .then(function (components) {
      const potential = components.filter(function (c) {
        let needle;
        return (needle = path.extname(c), [
          '.json',
          '.fbp'
        ].includes(needle));
      });
      return Promise.filter(potential, function (p) {
        const componentPath = path.resolve(componentDir, p);
        return stat(componentPath)
          .then(stats => stats.isFile());
      }).then(potential =>
        Promise.map(potential, function (p) {
          const componentPath = path.resolve(componentDir, p);
          const component = {
            name: null,
            path: path.relative(options.root, componentPath),
            source: path.relative(options.root, componentPath),
            elementary: false
          };
          return readfile(componentPath, 'utf-8')
            .then(function (source) {
              if (path.extname(component.path) === '.fbp') {
                component.name = utils.parseId(source, componentPath);
                component.runtime = utils.parsePlatform(source);
                return Promise.resolve(component);
              }
              const graph = JSON.parse(source);
              component.name = (graph.properties != null ? graph.properties.id : undefined) || utils.parseId(source, componentPath);
              component.runtime = __guard__(graph.properties != null ? graph.properties.environment : undefined, x => x.type) || null;
              if (graph.properties != null ? graph.properties.main : undefined) {
                if (!component.noflo) { component.noflo = {}; }
                component.noflo.main = graph.properties.main;
              }
              return Promise.resolve(component);
            }).then(function (component) {
              // Default to NoFlo on any platform
              if (['all', null].includes(component.runtime)) { component.runtime = 'noflo'; }
              return Promise.resolve(component);
            });
        })
      );
    }).then(components =>
      Promise.resolve(components.filter(function (c) {
      // Don't register "main" graphs as modules
        if (c.noflo != null ? c.noflo.main : undefined) { return false; }
        // Skip non-supported runtimes
        return Array.from(supportedRuntimes).includes(c.runtime);
      })
      )).nodeify(function (err, components) {
      if (err && (err.code === 'ENOENT')) { return callback(null, []); }
      if (err) { return callback(err); }
      return callback(null, components);
    });
  return null;
};

const getModuleInfo = function (baseDir, options, callback) {
  const packageFile = path.resolve(baseDir, 'package.json');
  return readfile(packageFile, 'utf-8')
    .catch(function (e) {
      if ((e != null ? e.code : undefined) !== 'ENOENT') { return Promise.reject(e); }
      // Fake package with just dirname
      return Promise.resolve({
        name: path.basename(baseDir),
        description: null
      });
    }).then(function (json) {
      if (typeof json === 'object') { return Promise.resolve(json); }
      return Promise.resolve(JSON.parse(json));
    }).then(function (packageData) {
      const module = {
        name: packageData.name,
        description: packageData.description
      };

      if (packageData.noflo != null ? packageData.noflo.icon : undefined) {
        module.icon = packageData.noflo.icon;
      }

      if (packageData.noflo != null ? packageData.noflo.loader : undefined) {
        if (!module.noflo) { module.noflo = {}; }
        module.noflo.loader = packageData.noflo.loader;
      }

      if (module.name === 'noflo') { module.name = ''; }
      if (module.name[0] === '@') { module.name = module.name.replace(/\@[a-z\-]+\//, ''); }
      module.name = module.name.replace('noflo-', '');

      return Promise.resolve(module);
    }).nodeify(function (err, module) {
      if (err && (err.code === 'ENOENT')) { return callback(null, null); }
      if (err) { return callback(err); }
      return callback(null, module);
    });
};

exports.list = function (baseDir, options, callback) {
  const listC = Promise.promisify(listComponents);
  const listG = Promise.promisify(listGraphs);
  const getModule = Promise.promisify(getModuleInfo);
  return Promise.all([
    getModule(baseDir, options),
    listC(path.resolve(baseDir, 'components/'), options),
    listG(path.resolve(baseDir, 'graphs/'), options)
  ])
    .then(function (...args) {
      const [module, components, graphs] = Array.from(args[0]);
      if (!module) { return Promise.resolve([]); }
      const runtimes = {};
      for (var c of Array.from(components)) {
        if (!runtimes[c.runtime]) { runtimes[c.runtime] = []; }
        runtimes[c.runtime].push(c);
        delete c.runtime;
      }
      for (c of Array.from(graphs)) {
        if (!runtimes[c.runtime]) { runtimes[c.runtime] = []; }
        runtimes[c.runtime].push(c);
        delete c.runtime;
      }

      const modules = [];
      for (let k in runtimes) {
        const v = runtimes[k];
        modules.push({
          name: module.name,
          description: module.description,
          runtime: k,
          noflo: module.noflo,
          base: path.relative(options.root, baseDir),
          icon: module.icon,
          components: v
        });
      }

      if ((graphs.length === 0) && (components.length === 0) && (module.noflo != null ? module.noflo.loader : undefined)) {
      // Component that only provides a custom loader, register for "noflo"
        modules.push({
          name: module.name,
          description: module.description,
          runtime: 'noflo',
          noflo: module.noflo,
          base: path.relative(options.root, baseDir),
          icon: module.icon,
          components: []});
      }

      return Promise.resolve(modules);
    }).nodeify(callback);
};

exports.listDependencies = function (baseDir, options, callback) {
  const depsDir = path.resolve(baseDir, 'node_modules/');
  return readdir(depsDir)
    .then(function (deps) {
      deps = deps.filter(d => d[0] !== '.');
      return Promise.map(deps, function (d) {
        const depsPath = path.resolve(depsDir, d);
        if (d[0] !== '@') {
          return Promise.resolve([depsPath]);
        }
        return readdir(depsPath)
          .then(subDeps => Promise.resolve(subDeps.map(s => path.resolve(depsPath, s))));
      }).then(function (depsPaths) {
        deps = [];
        for (let d of Array.from(depsPaths)) { deps = deps.concat(d); }
        return Promise.resolve(deps);
      });
    }).nodeify(function (err, deps) {
      if (err && (err.code === 'ENOENT')) { return callback(null, []); }
      if (err) { return callback(err); }
      return callback(null, deps);
    });
};

function __guard__ (value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
