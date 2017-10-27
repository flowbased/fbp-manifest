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
const tv4 = require('tv4');
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');

const readdir = Promise.promisify(fs.readdir);
const readfile = Promise.promisify(fs.readFile);

const loadSchemas = function (callback) {
  const schemaPath = path.resolve(__dirname, '../schema');
  return readdir(schemaPath)
    .then(files =>
      Promise.map(files, function (file) {
        const filePath = path.resolve(schemaPath, file);
        return readfile(filePath, 'utf-8')
          .then(content => Promise.resolve(JSON.parse(content)));
      })).nodeify(callback);
};

exports.validateJSON = function (json, callback) {
  const load = Promise.promisify(loadSchemas);
  return load()
    .then(function (schemas) {
      for (let schema of Array.from(schemas)) { tv4.addSchema(schema.id, schema); }
      const result = tv4.validateResult(json, 'manifest.json');
      if (!result.valid) { return Promise.reject(result.error); }
      return Promise.resolve(result);
    }).nodeify(callback);
};

exports.validateFile = (file, callback) =>
  readfile(file, 'utf-8')
    .then(contents => Promise.resolve(JSON.parse(contents))).nodeify(function (err, manifest) {
      if (err) { return callback(err); }
      return exports.validateJSON(manifest, callback);
    })
;

exports.main = (main = function () {
  const program = require('commander')
    .arguments('<fbp.json>')
    .parse(process.argv);

  if (!program.args.length) {
    console.log('Usage: fbp-manifest-validate fbp.json');
    process.exit(1);
  }

  const fileName = path.resolve(process.cwd(), program.args[0]);
  return exports.validateFile(fileName, function (err, valid) {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    console.log(`${fileName} is valid FBP Manifest`);
    return process.exit(0);
  });
});
