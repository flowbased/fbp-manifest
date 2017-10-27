path = require 'path'

exports.parseId = (source, filepath) ->
  id = source.match /@name ([A-Za-z0-9]+)/
  return id[1] if id
  path.basename filepath, path.extname filepath

exports.parsePlatform = (source) ->
  runtimeType = source.match /@runtime ([a-z\-]+)/
  return runtimeType[1] if runtimeType
  null
