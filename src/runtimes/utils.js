/* eslint-disable
    no-useless-escape,
*/
// TODO: This file was updated by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const path = require('path');

exports.parseId = function (source, filepath) {
  const id = source.match(/@name ([A-Za-z0-9]+)/);
  if (id) { return id[1]; }
  return path.basename(filepath, path.extname(filepath));
};

exports.parsePlatform = function (source) {
  const runtimeType = source.match(/@runtime ([a-z\-]+)/);
  if (runtimeType) { return runtimeType[1]; }
  return null;
};
