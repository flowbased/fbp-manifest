const path = require('path');
const fs = require('fs');
const lister = require('./list');

exports.load = (baseDir, opts, callback) => {
  const options = opts;
  if (typeof options.discover === 'undefined') { options.discover = true; }
  if (!options.manifest) { options.manifest = 'fbp.json'; }

  const manifestPath = path.resolve(baseDir, options.manifest);
  return fs.readFile(manifestPath, 'utf-8', (err, contents) => {
    let manifest;
    if (err && (err.code === 'ENOENT') && options.discover) {
      if (!options.silent) { console.warn(`${manifestPath} not found, running auto-discovery`); }
      lister.list(baseDir, options, (error, modules) => {
        if (error) {
          callback(error);
          return;
        }
        callback(null, {
          version: 1,
          modules,
        });
      });
      return;
    }
    if (err) {
      callback(err);
      return;
    }
    try {
      manifest = JSON.parse(contents);
    } catch (e) {
      callback(e);
      return;
    }
    callback(null, manifest);
  });
};
