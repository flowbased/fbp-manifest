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
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');

const runtimes = {
  noflo: require('./runtimes/noflo'),
  msgflo: require('./runtimes/msgflo')
};

exports.list = function (baseDir, options, callback) {
  if (!options.root) { options.root = baseDir; }
  if (typeof options.subdirs === 'undefined') { options.subdirs = true; }

  if (!(options.runtimes != null ? options.runtimes.length : undefined)) {
    return callback(new Error('No runtimes specified'));
  }

  const missingRuntimes = options.runtimes.filter(r => typeof runtimes[r] === 'undefined');
  if (missingRuntimes.length) {
    return callback(new Error(`Unsupported runtime types: ${missingRuntimes.join(', ')}`));
  }

  Promise.map(options.runtimes, function (runtime) {
    const lister = Promise.promisify(runtimes[runtime].list);
    return lister(baseDir, options);
  }).then(function (results) {
    // Flatten
    let modules = [];
    for (let r of Array.from(results)) { modules = modules.concat(r); }
    if (!options.recursive) { return Promise.resolve(modules); }
    return Promise.map(options.runtimes, function (runtime) {
      const depLister = Promise.promisify(runtimes[runtime].listDependencies);
      return depLister(baseDir, options)
        .map(function (dep) {
          const subLister = Promise.promisify(exports.list);
          return subLister(dep, options);
        }).then(function (subDeps) {
          let subs = [];
          for (let s of Array.from(subDeps)) { subs = subs.concat(s); }
          return Promise.resolve(subs);
        });
    }).then(function (subDeps) {
      let subs = [];
      for (let s of Array.from(subDeps)) { subs = subs.concat(s); }
      modules = modules.concat(subs);
      return Promise.resolve(modules);
    });
  }).nodeify(callback);
};

exports.main = (main = function () {
  const availableRuntimes = Object.keys(runtimes);
  const list = val => val.split(',');
  const program = require('commander')
    .option('--recursive', 'List also from dependencies', true)
    .option('--subdirs', 'List also from subdirectories of the primary component locations', true)
    .option('--runtimes <runtimes>', `List components from runtimes, including ${availableRuntimes.join(', ')}`, list)
    .arguments('<basedir>')
    .parse(process.argv);

  if (!program.args.length) {
    program.args.push(process.cwd());
  }

  return exports.list(program.args[0], program, function (err, modules) {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    const manifest = {
      version: 1,
      modules
    };
    console.log(JSON.stringify(manifest, null, 2));
    return process.exit(0);
  });
});
