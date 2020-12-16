const path = require('path');

/**
 * @param {string} source
 * @param {string} filepath
 * @returns {string}
 */
exports.parseId = (source, filepath) => {
  const id = source.match(/@name ([A-Za-z0-9]+)/);
  if (id) { return id[1]; }
  return path.basename(filepath, path.extname(filepath));
};

/**
 * @param {string} source
 * @returns {string|null}
 */
exports.parsePlatform = (source) => {
  const runtimeType = source.match(/@runtime ([a-z-]+)/);
  if (runtimeType) { return runtimeType[1]; }
  return null;
};
