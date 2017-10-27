path = require 'path'
fs = require 'fs'
Promise = require 'bluebird'
utils = require './utils'

readdir = Promise.promisify fs.readdir
readfile = Promise.promisify fs.readFile
stat = Promise.promisify fs.stat

supportedRuntimes = [
  'noflo'
  'noflo-nodejs'
  'noflo-browser'
]

listComponents = (componentDir, options, callback) ->
  readdir componentDir
  .then (entries) ->
    potential = entries.filter (c) -> path.extname(c) in [
      '.coffee'
      '.js'
      '.litcoffee'
    ]
    Promise.filter potential, (p) ->
      componentPath = path.resolve componentDir, p
      stat componentPath
      .then (stats) ->
        stats.isFile()
    .then (potential) ->
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
      potentialDirs = entries.filter (entry) -> entry not in potential
      return Promise.resolve components unless potentialDirs.length
      return Promise.resolve components unless options.subdirs
      # Seek from subdirectories
      Promise.filter potentialDirs, (d) ->
        dirPath = path.resolve componentDir, d
        stat dirPath
        .then (stats) ->
          stats.isDirectory()
      .then (directories) ->
        Promise.map directories, (d) ->
          dirPath = path.resolve componentDir, d
          listComponents = Promise.promisify listComponents
          listComponents dirPath, options
      .then (subDirs) ->
        for subComponents in subDirs
          components = components.concat subComponents
        Promise.resolve components
  .then (components) ->
    Promise.resolve components.filter (c) ->
      c.runtime in supportedRuntimes
  .nodeify (err, components) ->
    return callback null, [] if err and err.code is 'ENOENT'
    return callback err if err
    callback null, components
  null

listGraphs = (componentDir, options, callback) ->
  readdir componentDir
  .then (components) ->
    potential = components.filter (c) -> path.extname(c) in [
      '.json'
      '.fbp'
    ]
    Promise.filter potential, (p) ->
      componentPath = path.resolve componentDir, p
      stat componentPath
      .then (stats) ->
        stats.isFile()
    .then (potential) ->
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
          if graph.properties?.main
            component.noflo = {} unless component.noflo
            component.noflo.main = graph.properties.main
          Promise.resolve component
        .then (component) ->
          # Default to NoFlo on any platform
          component.runtime = 'noflo' if component.runtime in ['all', null]
          Promise.resolve component
  .then (components) ->
    Promise.resolve components.filter (c) ->
      # Don't register "main" graphs as modules
      return false if c.noflo?.main
      # Skip non-supported runtimes
      c.runtime in supportedRuntimes
  .nodeify (err, components) ->
    return callback null, [] if err and err.code is 'ENOENT'
    return callback err if err
    callback null, components
  null

getModuleInfo = (baseDir, options, callback) ->
  packageFile = path.resolve baseDir, 'package.json'
  readfile packageFile, 'utf-8'
  .catch (e) ->
    return Promise.reject e unless e?.code is 'ENOENT'
    # Fake package with just dirname
    Promise.resolve
      name: path.basename baseDir
      description: null
  .then (json) ->
    return Promise.resolve json if typeof json is 'object'
    Promise.resolve JSON.parse json
  .then (packageData) ->
    module =
      name: packageData.name
      description: packageData.description

    if packageData.noflo?.icon
      module.icon = packageData.noflo.icon

    if packageData.noflo?.loader
      module.noflo = {} unless module.noflo
      module.noflo.loader = packageData.noflo.loader

    module.name = '' if module.name is 'noflo'
    module.name = module.name.replace /\@[a-z\-]+\//, '' if module.name[0] is '@'
    module.name = module.name.replace 'noflo-', ''

    Promise.resolve module
  .nodeify (err, module) ->
    return callback null, null if err and err.code is 'ENOENT'
    return callback err if err
    callback null, module

exports.list = (baseDir, options, callback) ->
  listC = Promise.promisify listComponents
  listG = Promise.promisify listGraphs
  getModule = Promise.promisify getModuleInfo
  Promise.all [
    getModule baseDir, options
    listC path.resolve(baseDir, 'components/'), options
    listG path.resolve(baseDir, 'graphs/'), options
  ]
  .then ([module, components, graphs]) ->
    return Promise.resolve [] unless module
    runtimes = {}
    for c in components
      runtimes[c.runtime] = [] unless runtimes[c.runtime]
      runtimes[c.runtime].push c
      delete c.runtime
    for c in graphs
      runtimes[c.runtime] = [] unless runtimes[c.runtime]
      runtimes[c.runtime].push c
      delete c.runtime

    modules = []
    for k, v of runtimes
      modules.push
        name: module.name
        description: module.description
        runtime: k
        noflo: module.noflo
        base: path.relative options.root, baseDir
        icon: module.icon
        components: v

    if graphs.length is 0 and components.length is 0 and module.noflo?.loader
      # Component that only provides a custom loader, register for "noflo"
      modules.push
        name: module.name
        description: module.description
        runtime: 'noflo'
        noflo: module.noflo
        base: path.relative options.root, baseDir
        icon: module.icon
        components: []

    Promise.resolve modules
  .nodeify callback

exports.listDependencies = (baseDir, options, callback) ->
  depsDir = path.resolve baseDir, 'node_modules/'
  readdir depsDir
  .then (deps) ->
    deps = deps.filter (d) -> d[0] isnt '.'
    Promise.map deps, (d) ->
      depsPath = path.resolve depsDir, d
      unless d[0] is '@'
        return Promise.resolve [depsPath]
      readdir depsPath
      .then (subDeps) ->
        Promise.resolve subDeps.map (s) -> path.resolve depsPath, s
    .then (depsPaths) ->
      deps = []
      deps = deps.concat d for d in depsPaths
      Promise.resolve deps
  .nodeify (err, deps) ->
    return callback null, [] if err and err.code is 'ENOENT'
    return callback err if err
    callback null, deps
