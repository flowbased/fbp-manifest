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
      [common] = modules.filter (m) -> m.runtime is 'noflo'
      chai.expect(common).to.be.an 'object'
      chai.expect(common.components[0].name).to.equal 'Foo'
      [nodejs] = modules.filter (m) -> m.runtime is 'noflo-nodejs'
      chai.expect(nodejs).to.be.an 'object'
      chai.expect(nodejs.components.length).to.equal 2
      chai.expect(nodejs.components[0].name).to.equal 'Bar'
      chai.expect(nodejs.components[0].elementary).to.equal true
      chai.expect(nodejs.components[1].name).to.equal 'Hello'
      chai.expect(nodejs.components[1].elementary).to.equal false
      done()
