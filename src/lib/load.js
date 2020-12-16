const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const lister = require('./list');

const readFile = promisify(fs.readFile);

/**
 * @param {string} baseDir
 * @param {lister.FbpManifestOptions} opts
 * @returns {Promise<lister.FbpManifestDocument>}
 */
exports.load = (baseDir, opts) => {
  const options = opts;
  if (typeof options.discover === 'undefined') {
    options.discover = true;
  }
  if (!options.manifest) {
    options.manifest = 'fbp.json';
  }

  const manifestPath = path.resolve(baseDir, options.manifest);
  return readFile(manifestPath, 'utf-8')
    .catch((err) => {
      if (err && (err.code === 'ENOENT') && options.discover) {
        if (!options.silent) {
          console.warn(`${manifestPath} not found, running auto-discovery`);
        }
        return lister.list(baseDir, options)
          .then((modules) => JSON.stringify({
            version: 1,
            modules,
          }));
      }
      return Promise.reject(err);
    })
    .then((contents) => JSON.parse(contents));
};
