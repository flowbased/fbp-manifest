path = require 'path'
fs = require 'fs'
Promise = require 'bluebird'

runtimes =
  noflo: require './runtimes/noflo'
  msgflo: require './runtimes/msgflo'

exports.list = (baseDir, options, callback) ->
  options.root = baseDir unless options.root

  unless options.runtimes?.length
    return callback new Error "No runtimes specified"

  missingRuntimes = options.runtimes.filter (r) -> typeof runtimes[r] is 'undefined'
  if missingRuntimes.length
    return callback new Error "Unsupported runtime types: #{missingRuntimes.join(', ')}"

  Promise.map options.runtimes, (runtime) ->
    lister = Promise.promisify runtimes[runtime].list
    lister baseDir, options
  .then (results) ->
    # Flatten
    modules = []
    modules = modules.concat r for r in results
    Promise.resolve
      version: 1
      modules: modules
  .nodeify callback

exports.main = main = ->
  program = require 'commander'
  .option('--recursive', 'List also from dependencies')
  .option('--runtimes <runtimes>', 'List of runtimes to list components for', (val) -> val.split(','))
  .arguments '<basedir>'
  .parse process.argv

  unless program.args.length
    program.args.push process.cwd()

  exports.list program.args[0], program, (err, components) ->
    if err
      console.log err
      process.exit 1
    console.log JSON.stringify components, null, 2
    process.exit 0
