loader = require './load'

countStats = (baseDir, options, callback) ->
  options.recursive = true
  loader.load baseDir, options, (err, manifest) ->
    return callback err if err
    local = 0
    deps = 0
    for module in manifest.modules
      if module.base is ''
        local += module.components.length
        continue
      deps += module.components.length
    callback null,
      local: local
      deps: deps

exports.main = main = ->
  list = (val) -> val.split ','
  program = require 'commander'
  .option('--runtimes <runtimes>', "List components from runtimes", list)
  .option('--manifest <manifest>', "Manifest file to use. Default is fbp.json", 'fbp.json')
  .arguments '<basedir>'
  .parse process.argv

  unless program.args.length
    program.args.push process.cwd()

  countStats program.args[0], program, (err, stats) ->
    if err
      console.log err
      process.exit 1
    total = stats.local + stats.deps
    if total
      reuse = Math.round (stats.deps / total) * 100
    else
      reuse = 0
    console.log "  Local components: #{stats.local}"
    console.log "Library components: #{stats.deps}"
    console.log "       Reuse ratio: #{reuse}%"
    process.exit 0
