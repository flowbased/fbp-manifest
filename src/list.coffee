path = require 'path'
fs = require 'fs'
Promise = require 'bluebird'

runtimes =
  noflo: require './runtimes/noflo'
  msgflo: require './runtimes/msgflo'

exports.list = (baseDir, options, callback) ->
  options.root = baseDir unless options.root
  options.subdirs = true if typeof options.subdirs is 'undefined'

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
    return Promise.resolve modules unless options.recursive
    Promise.map options.runtimes, (runtime) ->
      depLister = Promise.promisify runtimes[runtime].listDependencies
      depLister baseDir, options
      .map (dep) ->
        subLister = Promise.promisify exports.list
        subLister dep, options
      .then (subDeps) ->
        subs = []
        subs = subs.concat s for s in subDeps
        Promise.resolve subs
    .then (subDeps) ->
      subs = []
      subs = subs.concat s for s in subDeps
      modules = modules.concat subs
      Promise.resolve modules
  .nodeify callback

exports.main = main = ->
  availableRuntimes = Object.keys runtimes
  list = (val) -> val.split ','
  program = require 'commander'
  .option('--recursive', 'List also from dependencies', true)
  .option('--subdirs', 'List also from subdirectories of the primary component locations', true)
  .option('--runtimes <runtimes>', "List components from runtimes, including #{availableRuntimes.join(', ')}", list)
  .arguments '<basedir>'
  .parse process.argv

  unless program.args.length
    program.args.push process.cwd()

  exports.list program.args[0], program, (err, modules) ->
    if err
      console.log err
      process.exit 1
    manifest =
      version: 1
      modules: modules
    console.log JSON.stringify manifest, null, 2
    process.exit 0
