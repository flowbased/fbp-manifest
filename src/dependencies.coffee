clone = require 'clone'
path = require 'path'
fs = require 'fs'
fbp = require 'fbp'
Promise = require 'bluebird'
loader = require './load'

loadGraph = (graphPath, callback) ->
  fs.readFile graphPath, 'utf-8', (err, content) ->
    return callback err if err
    if path.extname(graphPath) is '.fbp'
      try
        graph = fbp.parse content
      catch e
        return callback e
      return callback null, graph
    try
      graph = JSON.parse content
    catch e
      return callback e
    return callback null, graph

exports.findComponent = (modules, component) ->
  for m in modules
    continue unless m.components?.length
    for c in m.components
      if c.name is component or "#{m.name}/#{c.name}" is component
        return c
  null

exports.filterModules = (modules, components, callback) ->
  filtered = []
  for m in modules
    continue unless m.components?.length
    foundInModule = []
    for c in m.components
      if c.name in components
        foundInModule.push c
        components.splice components.indexOf(c.name), 1
        continue
      if "#{m.name}/#{c.name}" in components
        foundInModule.push c
        components.splice components.indexOf("#{m.name}/#{c.name}"), 1
        continue
    continue unless foundInModule.length
    newModule = clone m
    newModule.components = foundInModule
    filtered.push newModule

  if components.length
    return callback new Error "Missing components: #{components.join(', ')}"
  callback null, filtered

exports.resolve = (modules, component, options, callback) ->
  componentFound = exports.findComponent modules, component
  unless componentFound
    return callback new Error "Component #{component} not available"

  if componentFound.elementary
    callback null, [component]
    return

  unless componentFound.source
    return callback new Error "Graph source not available for #{component}"

  graphPath = path.resolve options.baseDir, componentFound.source
  loadGraph graphPath, (err, graph) ->
    return callback err if err
    components = []
    for k, v of graph.processes
      components.push v.component

    resolver = Promise.promisify exports.resolve
    Promise.map components, (c) ->
      resolver modules, c, options
    .nodeify (err, deps) ->
      return callback err.cause if err?.cause
      return callback err if err
      subs = [component]
      for s in deps
        for sc in s
          continue unless subs.indexOf(sc) is -1
          subs.push sc
      callback null, subs

exports.find = (modules, component, options, callback) ->
  exports.resolve modules, component, options, (err, components) ->
    return callback err if err
    exports.filterModules modules, components, callback

exports.loadAndFind = (baseDir, component, options, callback) ->
  loader.load baseDir, options, (err, manifest) ->
    return callback err if err
    exports.find manifest.modules, component, options, callback

exports.main = main = ->
  list = (val) -> val.split ','
  program = require 'commander'
  .option('--runtimes <runtimes>', "List components from runtimes", list)
  .option('--manifest <manifest>', "Manifest file to use. Default is fbp.json", 'fbp.json')
  .arguments '<basedir> <component>'
  .parse process.argv

  if program.args.length < 2
    program.args.unshift process.cwd()

  program.recursive = true
  program.baseDir = program.args[0]
  exports.loadAndFind program.args[0], program.args[1], program, (err, dependedModules) ->
    if err
      console.error err
      process.exit 1
    manifest =
      main: exports.findComponent dependedModules, program.args[1]
      version: 1
      modules: dependedModules
    console.log JSON.stringify manifest, null, 2
    process.exit 0
