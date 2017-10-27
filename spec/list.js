/* eslint-disable
    no-undef,
*/
const chai = require('chai');
const manifest = require('../index.js');
const path = require('path');

describe('Listing components', function () {
  it('should fail without provided runtimes', function (done) {
    const baseDir = path.resolve(__dirname, 'fixtures/noflo-basic');
    return manifest.list.list(baseDir, {}, function (err, components) {
      chai.expect(err).to.be.an('error');
      return done();
    });
  });

  return it('should find NoFlo components', function (done) {
    const baseDir = path.resolve(__dirname, 'fixtures/noflo-basic');
    return manifest.list.list(baseDir, {
      runtimes: ['noflo'],
      recursive: true
    }
      , function (err, modules) {
      if (err) { return done(err); }
      chai.expect(modules.length).to.equal(2);
      const [common] = Array.from(modules.filter(m => m.runtime === 'noflo'));
      chai.expect(common).to.be.an('object');
      chai.expect(common.components[0].name).to.equal('Foo');
      const [nodejs] = Array.from(modules.filter(m => m.runtime === 'noflo-nodejs'));
      chai.expect(nodejs).to.be.an('object');
      chai.expect(nodejs.components.length).to.equal(2);
      chai.expect(nodejs.components[0].name).to.equal('Bar');
      chai.expect(nodejs.components[0].elementary).to.equal(true);
      chai.expect(nodejs.components[1].name).to.equal('Hello');
      chai.expect(nodejs.components[1].elementary).to.equal(false);
      return done();
    });
  });
});
