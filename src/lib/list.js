const program = require('commander');
const noflo = require('./runtimes/noflo');
const msgflo = require('./runtimes/msgflo');

/**
 * @typedef FbpManifestPort
 * @property {string} name
 * @property {string} [description]
 * @property {string} type
 * @property {boolean} addressable
 * @property {boolean} [required]
 */

/**
 * @typedef FbpManifestComponent
 * @property {string} name
 * @property {string} [description]
 * @property {string} [path]
 * @property {string} [source]
 * @property {string} [tests]
 * @property {string} [exec]
 * @property {boolean} [elementary]
 * @property {Array<FbpManifestPort>} [inports]
 * @property {Array<FbpManifestPort>} [outports]
 */

/**
 * @typedef FbpManifestModule
 * @property {string} name
 * @property {string} [description]
 * @property {string} runtime
 * @property {string} base
 * @property {string} [icon]
 * @property {Array<FbpManifestComponent>} components
 * @property {Object<string, any>} [noflo]
 * @property {Object<string, any>} [msgflo]
 */

/**
 * @typedef FbpManifestDocument
 * @property {number} version
 * @property {Array<FbpManifestModule>} modules
 */

/**
 * @typedef FbpManifestOptions
 * @property {string[]} runtimes
 * @property {string} [root]
 * @property {string} [manifest]
 * @property {string} [baseDir]
 * @property {boolean} [subdirs]
 * @property {boolean} [recursive]
 * @property {boolean} [discover]
 * @property {boolean} [silent]
 */

const runtimes = {
  noflo,
  msgflo,
};

/**
 * @param {string} baseDir
 * @param {FbpManifestOptions} opts
 * @returns {Promise<Array<FbpManifestModule>>}
 */
exports.list = (baseDir, opts) => {
  const options = opts;
  if (!options.root) {
    options.root = baseDir;
  }
  if (typeof options.subdirs === 'undefined') {
    options.subdirs = true;
  }

  if (!(options.runtimes != null ? options.runtimes.length : undefined)) {
    return Promise.reject(new Error('No runtimes specified'));
  }

  const missingRuntimes = options.runtimes.filter((r) => typeof runtimes[r] === 'undefined');
  if (missingRuntimes.length) {
    return Promise.reject(new Error(`Unsupported runtime types: ${missingRuntimes.join(', ')}`));
  }

  return options.runtimes
    .reduce((chain, runtime) => chain
      .then((currentList) => runtimes[runtime]
        .list(baseDir, options)
        .then((result) => currentList.concat(result))), Promise.resolve([]))
    .then((results) => {
      // Flatten
      let modules = [];
      results.forEach((r) => {
        modules = modules.concat(r);
      });
      if (!options.recursive) {
        return Promise.resolve(modules);
      }
      return options.runtimes
        .reduce((chain, runtime) => chain
          .then((currentList) => runtimes[runtime]
            .listDependencies(baseDir, options)
            .then((result) => currentList.concat(result))), Promise.resolve([]))
        .then((deps) => deps
          .reduce((depChain, dep) => depChain
            .then((currentList) => exports
              .list(dep, options)
              .then((subDeps) => currentList.concat(subDeps))), Promise.resolve([])))
        .then((subDeps) => {
          let subs = [];
          subDeps.forEach((s) => {
            subs = subs.concat(s);
          });
          modules = modules.concat(subs);
          return modules;
        });
    });
};

exports.main = () => {
  const availableRuntimes = Object.keys(runtimes);
  const list = (val) => val.split(',');
  program
    .option('--recursive', 'List also from dependencies', true)
    .option('--subdirs', 'List also from subdirectories of the primary component locations', true)
    .option('--runtimes <runtimes>', `List components from runtimes, including ${availableRuntimes.join(', ')}`, list)
    .arguments('<basedir>')
    .parse(process.argv);

  if (!program.args.length) {
    program.args.push(process.cwd());
  }

  exports.list(program.args[0], {
    recursive: program.recursive,
    subdirs: program.subdirs,
    runtimes: program.runtimes,
  })
    .then((modules) => {
      const manifest = {
        version: 1,
        modules,
      };
      console.log(JSON.stringify(manifest, null, 2));
      return process.exit(0);
    }, (err) => {
      console.log(err);
      process.exit(1);
    });
};
