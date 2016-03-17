path = require 'path'
fs = require 'fs'
Promise = require 'bluebird'
utils = require './utils'

readdir = Promise.promisify fs.readdir
readfile = Promise.promisify fs.readFile

supportedRuntimes = [
  'noflo'
  'noflo-nodejs'
  'noflo-browser'
]

listComponents = (baseDir, options, callback) ->
  componentDir = path.resolve baseDir, 'components/'
  readdir componentDir
  .then (components) ->
    potential = components.filter (c) -> path.extname(c) in [
      '.coffee'
      '.js'
      '.litcoffee'
    ]
    Promise.map potential, (p) ->
      componentPath = path.resolve componentDir, p
      component =
        name: null
        path: path.relative options.root, componentPath
        source: path.relative options.root, componentPath
        elementary: true
      readfile componentPath, 'utf-8'
      .then (source) ->
        component.name = utils.parseId source, componentPath
        component.runtime = utils.parsePlatform source
        # Default to NoFlo on any platform
        component.runtime = 'noflo' if component.runtime in ['all', null]
        Promise.resolve component
  .then (components) ->
    Promise.resolve components.filter (c) ->
      c.runtime in supportedRuntimes
  .nodeify (err, components) ->
    if err
      if err.code is 'ENOENT'
        return callback null, []
      return callback err
    callback null, components

listGraphs = (baseDir, options, callback) ->
  componentDir = path.resolve baseDir, 'graphs/'
  readdir componentDir
  .then (components) ->
    potential = components.filter (c) -> path.extname(c) in [
      '.json'
      '.fbp'
    ]
    Promise.map potential, (p) ->
      componentPath = path.resolve componentDir, p
      component =
        name: null
        path: path.relative options.root, componentPath
        source: path.relative options.root, componentPath
        elementary: false
      readfile componentPath, 'utf-8'
      .then (source) ->
        if path.extname(component.path) is '.fbp'
          component.name = utils.parseId source, componentPath
          component.runtime = utils.parsePlatform source
          return Promise.resolve component
        graph = JSON.parse source
        component.name = graph.properties?.id or utils.parseId source, componentPath
        component.runtime = graph.properties?.environment?.type or null
        Promise.resolve component
      .then (component) ->
        # Default to NoFlo on any platform
        component.runtime = 'noflo' if component.runtime in ['all', null]
        Promise.resolve component
  .then (components) ->
    Promise.resolve components.filter (c) ->
      c.runtime in supportedRuntimes
  .nodeify (err, components) ->
    if err
      if err.code is 'ENOENT'
        return callback null, []
      return callback err
    callback null, components

exports.list = (baseDir, options, callback) ->
  listComponents baseDir, options, (err, components) ->
    return callback err if err
    listGraphs baseDir, options, (err, graphs) ->
      return callback err if err
      callback null, components.concat graphs
