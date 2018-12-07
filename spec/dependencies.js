/* eslint-disable
    no-undef,
*/
const chai = require('chai');
const path = require('path');
const manifest = require('../index.js');

describe('Finding component dependencies', () => {
  describe('with NoFlo module without dependecies', () => {
    let modules = null;
    let baseDir = null;
    before((done) => {
      baseDir = path.resolve(__dirname, 'fixtures/noflo-basic');
      return manifest.list.list(baseDir, {
        runtimes: ['noflo'],
        recursive: true,
      },
      (err, mods) => {
        if (err) { return done(err); }
        modules = mods;
        return done();
      });
    });
    describe('with elementary component', () => {
      it('should fail on missing component', done => manifest.dependencies.find(modules, 'basic/Baz',
        { baseDir },
        (err) => {
          chai.expect(err).to.be.an('error');
          done();
        }));
      return it('should only find the component itself', done => manifest.dependencies.find(modules, 'basic/Foo',
        { baseDir },
        (err, dependedModules) => {
          if (err) {
            done(err);
            return;
          }
          chai.expect(dependedModules.length).to.equal(1);
          const dep = dependedModules[0];
          chai.expect(dep.name).to.equal('basic');
          chai.expect(dep.components.length).to.equal(1);
          chai.expect(dep.components[0].name).to.equal('Foo');
          done();
        }));
    });
    return describe('with component that is a graph', () => it('should find all dependencies', done => manifest.dependencies.find(modules, 'basic/Hello',
      { baseDir },
      (err, dependedModules) => {
        if (err) { return done(err); }
        chai.expect(dependedModules.length).to.equal(2);
        const dep1 = dependedModules[0];
        chai.expect(dep1.name).to.equal('basic');
        const names = dep1.components.map(d => d.name);
        chai.expect(names).to.contain('Bar', 'Hello');
        const dep2 = dependedModules[1];
        chai.expect(dep2.name).to.equal('basic');
        chai.expect(dep2.components.length).to.equal(1);
        chai.expect(dep2.components[0].name).to.equal('Foo');
        return done();
      })));
  });
  describe('with NoFlo module with components in a subdirectory', () => {
    let modules = null;
    let baseDir = null;
    before((done) => {
      baseDir = path.resolve(__dirname, 'fixtures/noflo-subdirs');
      return manifest.list.list(baseDir, {
        runtimes: ['noflo'],
        recursive: true,
      },
      (err, mods) => {
        if (err) { return done(err); }
        modules = mods;
        return done();
      });
    });
    describe('with elementary component', () => {
      it('should fail on missing component', done => manifest.dependencies.find(modules, 'subdirs/Baz',
        { baseDir },
        (err) => {
          chai.expect(err).to.be.an('error');
          return done();
        }));
      it('should only find the component itself', done => manifest.dependencies.find(modules, 'subdirs/Foo',
        { baseDir },
        (err, dependedModules) => {
          if (err) { return done(err); }
          chai.expect(dependedModules.length).to.equal(1);
          const dep = dependedModules[0];
          chai.expect(dep.name).to.equal('subdirs');
          chai.expect(dep.components.length).to.equal(1);
          chai.expect(dep.components[0].name).to.equal('Foo');
          return done();
        }));
      return it('should also find from a subdir', done => manifest.dependencies.find(modules, 'subdirs/Bar',
        { baseDir },
        (err, dependedModules) => {
          if (err) { return done(err); }
          chai.expect(dependedModules.length).to.equal(1);
          const dep = dependedModules[0];
          chai.expect(dep.name).to.equal('subdirs');
          chai.expect(dep.components.length).to.equal(1);
          chai.expect(dep.components[0].name).to.equal('Bar');
          return done();
        }));
    });
    return describe('with component that is a graph', () => it('should find all dependencies', done => manifest.dependencies.find(modules, 'subdirs/Hello',
      { baseDir },
      (err, dependedModules) => {
        if (err) { return done(err); }
        chai.expect(dependedModules.length).to.equal(2);
        const dep1 = dependedModules[1];
        chai.expect(dep1.name).to.equal('subdirs');
        const names = dep1.components.map(d => d.name);
        chai.expect(names).to.contain('Bar', 'Hello');
        const dep2 = dependedModules[0];
        chai.expect(dep2.name).to.equal('subdirs');
        chai.expect(dep2.components.length).to.equal(1);
        chai.expect(dep2.components[0].name).to.equal('Foo');
        return done();
      })));
  });
  return describe('with NoFlo module with dependecies', () => {
    let modules = null;
    let baseDir = null;
    before((done) => {
      baseDir = path.resolve(__dirname, 'fixtures/noflo-deps');
      return manifest.list.list(baseDir, {
        runtimes: ['noflo'],
        recursive: true,
      },
      (err, mods) => {
        if (err) { return done(err); }
        modules = mods;
        return done();
      });
    });
    describe('with elementary component', () => {
      it('should fail on missing component', done => manifest.dependencies.find(modules, 'deps/Baz',
        { baseDir },
        (err) => {
          chai.expect(err).to.be.an('error');
          chai.expect(err.message).to.contain('deps/Baz');
          return done();
        }));
      it('should only find the component itself', done => manifest.dependencies.find(modules, 'deps/Foo',
        { baseDir },
        (err, dependedModules) => {
          if (err) { return done(err); }
          chai.expect(dependedModules.length).to.equal(1);
          const dep = dependedModules[0];
          chai.expect(dep.name).to.equal('deps');
          chai.expect(dep.base).to.equal('');
          chai.expect(dep.components.length).to.equal(1);
          chai.expect(dep.components[0].name).to.equal('Foo');
          return done();
        }));
      it('should also find a component from the depended module', done => manifest.dependencies.find(modules, 'dep/Foo',
        { baseDir },
        (err, dependedModules) => {
          if (err) { return done(err); }
          chai.expect(dependedModules.length).to.equal(1);
          const dep = dependedModules[0];
          chai.expect(dep.name).to.equal('dep');
          chai.expect(dep.base).to.equal(path.normalize('node_modules/noflo-dep'));
          chai.expect(dep.components.length).to.equal(1);
          chai.expect(dep.components[0].name).to.equal('Foo');
          return done();
        }));
      return it('should also find a component from a subdependency', done => manifest.dependencies.find(modules, 'subdep/SubSubComponent',
        { baseDir },
        (err, dependedModules) => {
          if (err) { return done(err); }
          chai.expect(dependedModules.length).to.equal(1);
          const dep = dependedModules[0];
          chai.expect(dep.name).to.equal('subdep');
          chai.expect(dep.base).to.equal(path.normalize('node_modules/noflo-dep/node_modules/noflo-subdep'));
          chai.expect(dep.components.length).to.equal(1);
          chai.expect(dep.components[0].name).to.equal('SubSubComponent');
          return done();
        }));
    });
    describe('with component that is a graph', () => {
      it('should fail on missing dependencies', done => manifest.dependencies.find(modules, 'deps/Missing',
        { baseDir },
        (err) => {
          chai.expect(err).to.be.an('error');
          chai.expect(err.message).to.contain('deps/Baz');
          return done();
        }));
      return it('should find all dependencies, also from subgraph', done => manifest.dependencies.find(modules, 'deps/Hello',
        { baseDir },
        (err, dependedModules) => {
          if (err) { return done(err); }
          chai.expect(dependedModules.length).to.equal(2);
          let dep = dependedModules[0];
          chai.expect(dep.name).to.equal('deps');
          let names = dep.components.map(d => d.name);
          chai.expect(names).to.eql(['Bar', 'Hello']);
          [, dep] = dependedModules;
          chai.expect(dep.name).to.equal('dep');
          names = dep.components.map(d => d.name);
          chai.expect(names).to.eql(['Bar', 'Foo', 'Baz']);
          return done();
        }));
    });
    return describe('with a graph that depends on components from a dynamic component loader', () => it('should find the dependencies and register the loader', done => manifest.dependencies.find(modules, 'deps/WithLoader',
      { baseDir },
      (err, dependedModules) => {
        if (err) { return done(err); }
        chai.expect(dependedModules.length).to.equal(3);
        const [withLoader] = Array.from(dependedModules.filter(m => m.name === 'loader'));
        chai.expect(withLoader.noflo.loader).to.equal('lib/ComponentLoader');
        chai.expect(withLoader.components).to.eql([]);
        return done();
      })));
  });
});
