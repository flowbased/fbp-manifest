chai = require 'chai'
manifest = require '../index.js'
path = require 'path'

describe 'Listing components', ->
  it 'should fail without provided runtimes', (done) ->
    baseDir = path.resolve __dirname, 'fixtures/noflo-basic'
    manifest.list.list baseDir, {}, (err, components) ->
      chai.expect(err).to.be.an 'error'
      done()

  it 'should find NoFlo components', (done) ->
    baseDir = path.resolve __dirname, 'fixtures/noflo-basic'
    manifest.list.list baseDir,
      runtimes: ['noflo']
      recursive: true
    , (err, modules) ->
      return done err if err
      chai.expect(modules.length).to.equal 2
      common = modules.filter (m) -> m.runtime is 'noflo'
      chai.expect(common.length).to.equal 1
      chai.expect(common[0].components[0].name).to.equal 'Foo'
      nodejs = modules.filter (m) -> m.runtime is 'noflo-nodejs'
      chai.expect(nodejs.length).to.equal 1
      chai.expect(nodejs[0].components[0].name).to.equal 'Bar'
      done()
