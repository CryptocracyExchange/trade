const chai = require('chai');
const should = chai.should();
const assert = chai.assert;
const expect = chai.expect;

// DS.io
const Deepstream = require('deepstream.io');
const server = new Deepstream({port:6104});
const trade = require('../server/trading/start.js');
let connect, ds, openBuy, openSell, transactionHistory;

beforeEach(function(done) {
  server.start();
  setTimeout(function() {
    ds = require('deepstream.io-client-js');
    connect = ds('localhost:6104').login();
    openBuy = connect.record.getList('openBuy');
    openSell = connect.record.getList('openSell');
    transactionHistory = connect.record.getList('transactionHistory');

    // Wipe previous data
    transactionHistory.whenReady((hist1) => {
      hist1.delete();
    });
    openBuy.whenReady((hist1) => {
      hist1.delete();
    });
    openSell.whenReady((hist1) => {
      hist1.delete();
    });

    done();
  },1500);

});

afterEach(function(done) {
  connect.close();
  server.stop();
  done();
});

describe('Transactions', function() {
  it('testing', function() {
    expect(true).to.be.true;
  });
});
