path = require 'path'
fs = require 'fs'
lister = require './list'

exports.load = (baseDir, options, callback) ->
  options.discover = true if typeof options.discover is 'undefined'
  options.manifest = 'fbp.json' unless options.manifest

  manifestPath = path.resolve baseDir, options.manifest
  fs.readFile manifestPath, 'utf-8', (err, contents) ->
    if err and err.code is 'ENOENT' and options.discover
      console.log "#{manifestPath} not found, running auto-discovery"
      return lister.list baseDir, options, callback
    return callback err if err
    try
      manifest = JSON.parse contents
    catch e
      return callback e
    callback null, manifest
