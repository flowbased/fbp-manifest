tv4 = require 'tv4'
path = require 'path'
fs = require 'fs'
Promise = require 'bluebird'

readdir = Promise.promisify fs.readdir
readfile = Promise.promisify fs.readFile

loadSchemas = (callback) ->
  schemaPath = path.resolve __dirname, '../schema'
  readdir schemaPath
  .then (files) ->
    Promise.map files, (file) ->
      filePath = path.resolve schemaPath, file
      readfile filePath, 'utf-8'
      .then (content) ->
        Promise.resolve JSON.parse content
  .nodeify callback

exports.validateJSON = (json, callback) ->
  load = Promise.promisify loadSchemas
  load()
  .then (schemas) ->
    tv4.addSchema schema.id, schema for schema in schemas
    result = tv4.validateResult json, 'manifest.json'
    return Promise.reject result.error unless result.valid
    Promise.resolve result
  .nodeify callback

exports.validateFile = (file, callback) ->
  readfile file, 'utf-8'
  .then (contents) ->
    Promise.resolve JSON.parse contents
  .nodeify (err, manifest) ->
    return callback err if err
    exports.validateJSON manifest, callback

exports.main = main = ->
  program = require 'commander'
  .arguments '<fbp.json>'
  .parse process.argv

  unless program.args.length
    console.log "Usage: fbp-manifest-validate fbp.json"
    process.exit 1

  fileName = path.resolve process.cwd(), program.args[0]
  exports.validateFile fileName, (err, valid) ->
    if err
      console.log err
      process.exit 1
    console.log "#{fileName} is valid FBP Manifest"
    process.exit 0

main() if not module.parent
