/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was updated by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let main;
const loader = require('./load');

const countStats = function (baseDir, options, callback) {
  options.recursive = true;
  return loader.load(baseDir, options, function (err, manifest) {
    if (err) { return callback(err); }
    let local = 0;
    let deps = 0;
    for (let module of Array.from(manifest.modules)) {
      if (module.base === '') {
        local += module.components.length;
        continue;
      }
      deps += module.components.length;
    }
    return callback(null, {
      local,
      deps
    }
    );
  });
};

exports.main = (main = function () {
  const list = val => val.split(',');
  const program = require('commander')
    .option('--runtimes <runtimes>', 'List components from runtimes', list)
    .option('--manifest <manifest>', 'Manifest file to use. Default is fbp.json', 'fbp.json')
    .arguments('<basedir>')
    .parse(process.argv);

  if (!program.args.length) {
    program.args.push(process.cwd());
  }

  return countStats(program.args[0], program, function (err, stats) {
    let reuse;
    if (err) {
      console.log(err);
      process.exit(1);
    }
    const total = stats.local + stats.deps;
    if (total) {
      reuse = Math.round((stats.deps / total) * 100);
    } else {
      reuse = 0;
    }
    console.log(`  Local components: ${stats.local}`);
    console.log(`Library components: ${stats.deps}`);
    console.log(`       Reuse ratio: ${reuse}%`);
    return process.exit(0);
  });
});
