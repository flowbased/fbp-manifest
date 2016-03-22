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

exports.filterModules = (modules, components) ->
  filtered = []
  for m in modules
    continue unless m.components?.length
    foundInModule = []
    for c in m.components
      foundInModule.push c if c.name in components
      foundInModule.push c if "#{m.name}/#{c.name}" in components
    continue unless foundInModule.length
    newModule = clone m
    newModule.components = foundInModule
    filtered.push newModule
  return filtered

exports.find = (modules, component, options, callback) ->
  componentFound = exports.findComponent modules, component
  unless componentFound
    return callback new Error "Component #{component} not available"

  if componentFound.component.elementary
    callback null, exports.filterModules modules, [component]
    return

  unless componentFound.component.source
    return callback new Error "Graph source not available for #{component}"

  modulePath = path.resolve options.baseDir, componentFound.module.base
  graphPath = path.resolve modulePath, componentFound.component.source
  loadGraph graphPath, (err, graph) ->
    return callback err if err
    components = []
    for k, v of graph.processes
      components.push v.component
    components.push component
    callback null, exports.filterModules modules, components
