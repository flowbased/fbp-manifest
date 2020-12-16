const program = require('commander');
const loader = require('./load');

/**
 * @typedef FbpManifestStats
 * @property {number} local
 * @property {number} deps
 */

/**
 * @param {string} baseDir
 * @param {import("./list").FbpManifestOptions} options
 * @returns {Promise<FbpManifestStats>}
 */
function countStats(baseDir, options) {
  const opts = {
    ...options,
    recursive: true,
  };
  return loader.load(baseDir, opts)
    .then((manifest) => {
      let local = 0;
      let deps = 0;
      manifest.modules.forEach((module) => {
        if (module.base === '') {
          local += module.components.length;
          return;
        }
        deps += module.components.length;
      });
      return {
        local,
        deps,
      };
    });
}

exports.main = () => {
  /**
   * @param {string} val
   */
  const list = (val) => val.split(',');
  program
    .option('--runtimes <runtimes>', 'List components from runtimes', list)
    .option('--manifest <manifest>', 'Manifest file to use. Default is fbp.json', 'fbp.json')
    .arguments('<basedir>')
    .parse(process.argv);

  if (!program.args.length) {
    program.args.push(process.cwd());
  }

  return countStats(program.args[0], {
    runtimes: program.runtimes,
    manifest: program.manifest,
  })
    .then((stats) => {
      let reuse;
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
    }, (err) => {
      console.log(err);
      process.exit(1);
    });
};
