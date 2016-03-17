path = require 'path'
fs = require 'fs'
Promise = require 'bluebird'

readfile = Promise.promisify fs.readFile

replaceMarker = (str, marker, value) ->
  marker = '#'+marker.toUpperCase()
  str.replace(marker, value)

replaceVariables = (str, variables) ->
  for marker, value of variables
    str = replaceMarker str, marker, value
  return str

componentsFromConfig = (config) ->
  variables = config.variables or {}
  config.components = {} if not config.components

  components = {}
  for component, cmd of config.components
    componentName = component.split('/')[1]
    componentName = component if not componentName
    variables['COMPONENTNAME'] = componentName
    variables['COMPONENT'] = component

    components[component] = replaceVariables cmd, variables
  return components

exports.list = (baseDir, options, callback) ->
  packageFile = path.resolve baseDir, 'package.json'
  readfile packageFile, 'utf-8'
  .then (json) ->
    packageData = JSON.parse json
    return Promise.resolve [] unless packageData.msgflo

    module =
      name: packageData.name
      description: packageData.description
      runtime: 'msgflo'
      base: path.relative options.root, baseDir
      components: []

    if packageData.msgflo?.icon
      module.icon = packageData.msgflo.icon

    for name, definition of componentsFromConfig packageData.msgflo
      componentName = name.split('/')[1]
      componentName = name if not componentName
      module.components.push
        name: componentName
        exec: definition
        elementary: false

    Promise.resolve [module]
  .nodeify callback
