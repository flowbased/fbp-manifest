clone = require 'clone'
path = require 'path'
fs = require 'fs'
fbp = require 'fbp'

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
        return found =
          component: c
          module: m
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

exports.find = (modules, component, options, callback) ->
  componentFound = exports.findComponent modules, component
  unless componentFound
    return callback new Error "Component #{component} not available"

  if componentFound.component.elementary
    exports.filterModules modules, [component], callback
    return

  unless componentFound.component.source
    return callback new Error "Graph source not available for #{component}"

  graphPath = path.resolve options.baseDir, componentFound.component.source
  loadGraph graphPath, (err, graph) ->
    return callback err if err
    components = []
    for k, v of graph.processes
      components.push v.component
    components.push component
    exports.filterModules modules, components, callback
