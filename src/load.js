/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const path = require('path');
const fs = require('fs');
const lister = require('./list');

exports.load = function (baseDir, options, callback) {
  if (typeof options.discover === 'undefined') { options.discover = true; }
  if (!options.manifest) { options.manifest = 'fbp.json'; }

  const manifestPath = path.resolve(baseDir, options.manifest);
  return fs.readFile(manifestPath, 'utf-8', function (err, contents) {
    let manifest;
    if (err && (err.code === 'ENOENT') && options.discover) {
      if (!options.silent) { console.warn(`${manifestPath} not found, running auto-discovery`); }
      lister.list(baseDir, options, function (err, modules) {
        if (err) { return callback(err); }
        const manifest = {
          version: 1,
          modules
        };
        return callback(null, manifest);
      });
      return;
    }
    if (err) { return callback(err); }
    try {
      manifest = JSON.parse(contents);
    } catch (e) {
      return callback(e);
    }
    return callback(null, manifest);
  });
};
