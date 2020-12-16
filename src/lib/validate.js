const tv4 = require('tv4');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const program = require('commander');

const readdir = promisify(fs.readdir);
const readfile = promisify(fs.readFile);

/**
 * @returns {Promise<Array<Object>>}
 */
function loadSchemas() {
  const schemaPath = path.resolve(__dirname, '../schema');
  return readdir(schemaPath)
    .then((files) => Promise.all(files.map((file) => {
      const filePath = path.resolve(schemaPath, file);
      return readfile(filePath, 'utf-8')
        .then((content) => JSON.parse(content));
    })));
}

/**
 * @param {Object} json
 * @returns {Promise<Object>}
 */
exports.validateJSON = (json) => loadSchemas()
  .then((schemas) => {
    schemas.forEach((schema) => tv4.addSchema(schema.id, schema));
    const result = tv4.validateResult(json, 'manifest.json');
    if (!result.valid) {
      return Promise.reject(result.error);
    }
    return Promise.resolve(result);
  });

/**
 * @param {string} file
 * @returns {Promise<Object>}
 */
exports.validateFile = (file) => readfile(file, 'utf-8')
  .then((contents) => JSON.parse(contents))
  .then((manifest) => exports.validateJSON(manifest));

exports.main = () => {
  program
    .arguments('<fbp.json>')
    .parse(process.argv);

  if (!program.args.length) {
    console.log('Usage: fbp-manifest-validate fbp.json');
    process.exit(1);
  }

  const fileName = path.resolve(process.cwd(), program.args[0]);
  exports.validateFile(fileName)
    .then(() => {
      console.log(`${fileName} is valid FBP Manifest`);
      process.exit(0);
    }, (err) => {
      console.log(err);
      process.exit(1);
    });
};
