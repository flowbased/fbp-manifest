/* eslint-disable
    no-undef,
*/
const chai = require('chai');
const path = require('path');
const manifest = require('../src/index.js');

describe('Listing components', () => {
  it('should fail without provided runtimes', () => {
    const baseDir = path.resolve(__dirname, 'fixtures/noflo-basic');
    return manifest.list
      .list(baseDir, {})
      .then(
        () => Promise.reject(new Error('Unexpected success')),
        (err) => {
          chai.expect(err).to.be.an('error');
        },
      );
  });

  it('should find NoFlo components', () => {
    const baseDir = path.resolve(__dirname, 'fixtures/noflo-basic');
    return manifest.list
      .list(baseDir, {
        runtimes: ['noflo'],
        recursive: true,
      })
      .then((modules) => {
        chai.expect(modules.length).to.equal(3);
        const [common] = Array.from(modules.filter((m) => m.runtime === 'noflo'));
        chai.expect(common).to.be.an('object');
        chai.expect(common.components[0].name).to.equal('Foo');
        chai.expect(common.components[0].tests).to.include('spec');
        chai.expect(common.components[0].tests).to.include('Foo.yaml');
        const [nodejs] = Array.from(modules.filter((m) => m.runtime === 'noflo-nodejs'));
        chai.expect(nodejs).to.be.an('object');
        chai.expect(nodejs.components.length).to.equal(4);
        chai.expect(nodejs.components[0].name).to.equal('Bar');
        chai.expect(nodejs.components[0].elementary).to.equal(true);
        chai.expect(nodejs.components[1].name).to.equal('Baz');
        chai.expect(nodejs.components[1].elementary).to.equal(true);
        chai.expect(nodejs.components[2].name).to.equal('ExampleSubgraph');
        chai.expect(nodejs.components[2].elementary).to.equal(false);
        chai.expect(nodejs.components[2].tests).to.include('spec');
        chai.expect(nodejs.components[2].tests).to.include('ExampleSubgraph.yaml');
        chai.expect(nodejs.components[3].name).to.equal('Hello');
        chai.expect(nodejs.components[3].elementary).to.equal(false);
      });
  });
});
