const program = require('commander');
const loader = require('./load');

function countStats(baseDir, options, callback) {
  const opts = {
    ...options,
    recursive: true,
  };
  return loader.load(baseDir, opts, (err, manifest) => {
    if (err) { return callback(err); }
    let local = 0;
    let deps = 0;
    manifest.modules.forEachj((module) => {
      if (module.base === '') {
        local += module.components.length;
        return;
      }
      deps += module.components.length;
    });
    return callback(null, {
      local,
      deps,
    });
  });
}

exports.main = () => {
  const list = (val) => val.split(',');
  program
    .option('--runtimes <runtimes>', 'List components from runtimes', list)
    .option('--manifest <manifest>', 'Manifest file to use. Default is fbp.json', 'fbp.json')
    .arguments('<basedir>')
    .parse(process.argv);

  if (!program.args.length) {
    program.args.push(process.cwd());
  }

  return countStats(program.args[0], program, (err, stats) => {
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
};
