const tv4 = require('tv4');
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const program = require('commander');

const readdir = Promise.promisify(fs.readdir);
const readfile = Promise.promisify(fs.readFile);

function loadSchemas(callback) {
  const schemaPath = path.resolve(__dirname, '../schema');
  return readdir(schemaPath)
    .then(files => Promise.map(files, (file) => {
      const filePath = path.resolve(schemaPath, file);
      return readfile(filePath, 'utf-8')
        .then(content => Promise.resolve(JSON.parse(content)));
    })).nodeify(callback);
}

exports.validateJSON = (json, callback) => {
  const load = Promise.promisify(loadSchemas);
  return load()
    .then((schemas) => {
      schemas.forEach(schema => tv4.addSchema(schema.id, schema));
      const result = tv4.validateResult(json, 'manifest.json');
      if (!result.valid) { return Promise.reject(result.error); }
      return Promise.resolve(result);
    }).nodeify(callback);
};

exports.validateFile = (file, callback) => readfile(file, 'utf-8')
  .then(contents => Promise.resolve(JSON.parse(contents))).nodeify((err, manifest) => {
    if (err) { return callback(err); }
    return exports.validateJSON(manifest, callback);
  });

exports.main = () => {
  program
    .arguments('<fbp.json>')
    .parse(process.argv);

  if (!program.args.length) {
    console.log('Usage: fbp-manifest-validate fbp.json');
    process.exit(1);
  }

  const fileName = path.resolve(process.cwd(), program.args[0]);
  return exports.validateFile(fileName, (err) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    console.log(`${fileName} is valid FBP Manifest`);
    return process.exit(0);
  });
};
