chai = require 'chai'
manifest = require '../index.js'
path = require 'path'

describe 'Finding component dependencies', ->
  describe 'with NoFlo module without dependecies', ->
    modules = null
    baseDir = null
    before (done) ->
      baseDir = path.resolve __dirname, 'fixtures/noflo-basic'
      manifest.list.list baseDir,
        runtimes: ['noflo']
        recursive: true
      , (err, mods) ->
        return done err if err
        modules = mods
        done()
    describe 'with elementary component', ->
      it 'should fail on missing component', (done) ->
        manifest.dependencies.find modules, 'basic/Baz',
          baseDir: baseDir
        , (err, dependedModules) ->
          chai.expect(err).to.be.an 'error'
          done()
      it 'should only find the component itself', (done) ->
        manifest.dependencies.find modules, 'basic/Foo',
          baseDir: baseDir
        , (err, dependedModules) ->
          return done err if err
          chai.expect(dependedModules.length).to.equal 1
          dep = dependedModules[0]
          chai.expect(dep.name).to.equal 'basic'
          chai.expect(dep.components.length).to.equal 1
          chai.expect(dep.components[0].name).to.equal 'Foo'
          done()
    describe 'with component that is a graph', ->
      it 'should find all dependencies', (done) ->
        manifest.dependencies.find modules, 'basic/Hello',
          baseDir: baseDir
        , (err, dependedModules) ->
          return done err if err
          chai.expect(dependedModules.length).to.equal 2
          dep1 = dependedModules[0]
          chai.expect(dep1.name).to.equal 'basic'
          chai.expect(dep1.components.length).to.equal 2
          chai.expect(dep1.components[0].name).to.equal 'Bar'
          chai.expect(dep1.components[1].name).to.equal 'Hello'
          dep2 = dependedModules[1]
          chai.expect(dep2.name).to.equal 'basic'
          chai.expect(dep2.components.length).to.equal 1
          chai.expect(dep2.components[0].name).to.equal 'Foo'
          done()
  describe 'with NoFlo module with dependecies', ->
    modules = null
    baseDir = null
    before (done) ->
      baseDir = path.resolve __dirname, 'fixtures/noflo-deps'
      manifest.list.list baseDir,
        runtimes: ['noflo']
        recursive: true
      , (err, mods) ->
        return done err if err
        modules = mods
        done()
    describe 'with elementary component', ->
      it 'should fail on missing component', (done) ->
        manifest.dependencies.find modules, 'deps/Baz',
          baseDir: baseDir
        , (err, dependedModules) ->
          chai.expect(err).to.be.an 'error'
          done()
      it 'should only find the component itself', (done) ->
        manifest.dependencies.find modules, 'deps/Foo',
          baseDir: baseDir
        , (err, dependedModules) ->
          return done err if err
          chai.expect(dependedModules.length).to.equal 1
          dep = dependedModules[0]
          chai.expect(dep.name).to.equal 'deps'
          chai.expect(dep.base).to.equal ''
          chai.expect(dep.components.length).to.equal 1
          chai.expect(dep.components[0].name).to.equal 'Foo'
          done()
      it 'should also find a component from the depended module', (done) ->
        manifest.dependencies.find modules, 'dep/Foo',
          baseDir: baseDir
        , (err, dependedModules) ->
          return done err if err
          chai.expect(dependedModules.length).to.equal 1
          dep = dependedModules[0]
          chai.expect(dep.name).to.equal 'dep'
          chai.expect(dep.base).to.equal 'node_modules/noflo-dep'
          chai.expect(dep.components.length).to.equal 1
          chai.expect(dep.components[0].name).to.equal 'Foo'
          done()
    describe 'with component that is a graph', ->
      it 'should find all dependencies', (done) ->
        manifest.dependencies.find modules, 'deps/Hello',
          baseDir: baseDir
        , (err, dependedModules) ->
          return done err if err
          chai.expect(dependedModules.length).to.equal 2
          dep = dependedModules[0]
          chai.expect(dep.name).to.equal 'deps'
          chai.expect(dep.components.length).to.equal 2
          chai.expect(dep.components[0].name).to.equal 'Bar'
          chai.expect(dep.components[1].name).to.equal 'Hello'
          dep = dependedModules[1]
          chai.expect(dep.name).to.equal 'dep'
          chai.expect(dep.components.length).to.equal 1
          chai.expect(dep.components[0].name).to.equal 'Foo'
          done()
