const Promise = require('bluebird');
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

const runtimes = {
  noflo,
  msgflo,
};

exports.list = (baseDir, opts, callback) => {
  const options = opts;
  if (!options.root) { options.root = baseDir; }
  if (typeof options.subdirs === 'undefined') { options.subdirs = true; }

  if (!(options.runtimes != null ? options.runtimes.length : undefined)) {
    callback(new Error('No runtimes specified'));
    return;
  }

  const missingRuntimes = options.runtimes.filter((r) => typeof runtimes[r] === 'undefined');
  if (missingRuntimes.length) {
    callback(new Error(`Unsupported runtime types: ${missingRuntimes.join(', ')}`));
    return;
  }

  Promise.map(options.runtimes, (runtime) => {
    const lister = Promise.promisify(runtimes[runtime].list);
    return lister(baseDir, options);
  }).then((results) => {
    // Flatten
    let modules = [];
    results.forEach((r) => {
      modules = modules.concat(r);
    });
    if (!options.recursive) { return Promise.resolve(modules); }
    return Promise.map(options.runtimes, (runtime) => {
      const depLister = Promise.promisify(runtimes[runtime].listDependencies);
      return depLister(baseDir, options)
        .map((dep) => {
          const subLister = Promise.promisify(exports.list);
          return subLister(dep, options);
        }).then((subDeps) => {
          let subs = [];
          subDeps.forEach((s) => {
            subs = subs.concat(s);
          });
          return Promise.resolve(subs);
        });
    }).then((subDeps) => {
      let subs = [];
      subDeps.forEach((s) => {
        subs = subs.concat(s);
      });
      modules = modules.concat(subs);
      return Promise.resolve(modules);
    });
  }).nodeify(callback);
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

  return exports.list(program.args[0], program, (err, modules) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    const manifest = {
      version: 1,
      modules,
    };
    console.log(JSON.stringify(manifest, null, 2));
    return process.exit(0);
  });
};
