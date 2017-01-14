const chai = require('chai');
const should = chai.should();
const assert = chai.assert;
const expect = chai.expect;

// DS.io
const Deepstream = require('deepstream.io');
const server = new Deepstream({port:6104});
const TradeProvider = require('../server/trading/start');
var ds, openOrders, transactionHistory;

const trade = new TradeProvider({
  logLevel: 3,
  deepstreamUrl: 'localhost:6104',
  deepstreamCredentials: {}
});

before(function(done) {
  server.start();
  trade.start();
  trade.on('ready', () => {
    openOrders = trade._deepstreamClient.record.getList('openOrders');
    transactionHistory = trade._deepstreamClient.record.getList('transactionHistory');
    // Creates Sample Open Buy and Sell List
    openOrders.whenReady(function(newList) {
      let newSellRecord1 = trade._deepstreamClient.record.getRecord(`open/1`);
      newSellRecord1.whenReady((newRec) => {
        newRec.set({
          userID: 'nick',
          amount: 5,
          price: 20,
          currency: 'BTC',
          type: 'sell',
          currFrom: 'BTC',
          currTo: 'LTC'
        }, function(err) {
          newList.addEntry(`open/1`);
          done();
        });
      });
    });
  });
});

after(function(done) {
  trade._deepstreamClient.close();
  server.stop();
  done();
});

describe('Transactions', function() {
  describe('Init', function() {
    it('should create a new record', function() {
      let newBuyRecord = trade._deepstreamClient.record.getRecord('test');
      newBuyRecord.whenReady(function(newRec) {
        newRec.set('test', 'test');
        let test = newRec.get('test');
        expect(test).to.be.equal('test');
      });
    });
    it('openOrders list should have 1 openOrders record', function() {
      let buyEnts = openOrders.getEntries();
      expect(buyEnts.length).to.be.equal(1);
    });
    it('Transaction History should display empty list', function() {
      let transHist = transactionHistory.getEntries();
      expect(transHist.length).to.be.equal([].length);
    });
  });


  describe('Buy', function() {
    it('should create a new buy order and store into openBuy list', function(done) {
      let buyData = {
        userID: 'mikel',
        amount: 2,
        price: 50,
        currency: 'BTC',
        type: 'sell',
        currFrom: 'BTC',
        currTo: 'LTC'
      };
      trade._buy(trade._deepstreamClient, buyData, openOrders, transactionHistory);
      setTimeout(function() {
        expect(openOrders.getEntries().length).to.be.equal(2);
        done();
      }, 20);
    });
    it('should fulfill a sell order if the amount matches the buy order', function(done) {
      let buyData = {
        userID: 'harry',
        amount: 5,
        price: 20,
        currency: 'LTC',
        type: 'buy',
        currFrom: 'LTC',
        currTo: 'BTC'
      };
      trade._buy(trade._deepstreamClient, buyData, openOrders, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(2);
        expect(openOrders.getEntries().length).to.be.equal(1);
        done();
      }, 20);
    });
    it('if sell supply < buy demand', function(done) {
      let buyData = {
        userID: 'harry',
        amount: 6,
        price: 52,
        currency: 'BTC',
        type: 'buy',
        currFrom: 'LTC',
        currTo: 'BTC'
      };
      let sellData = {
        userID: 'harry',
        amount: 6,
        price: 70,
        currency: 'BTC',
        type: 'sell',
        currFrom: 'BTC',
        currTo: 'LTC'
      };

      trade._buy(trade._deepstreamClient, buyData, openOrders, transactionHistory);
      trade._buy(trade._deepstreamClient, sellData, openOrders, transactionHistory);

      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(4);
        expect(openOrders.getEntries().length).to.be.equal(2);
        done();
      }, 30);
    });
    it('if sell supply > buy demand', function(done) {
      let buyData = {
        userID: 'mikel',
        amount: 4,
        price: 72,
        currency: 'BTC',
        type: 'buy',
        currFrom: 'LTC',
        currTo: 'BTC'
      };
      trade._buy(trade._deepstreamClient, buyData, openOrders, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(6);
        expect(openOrders.getEntries().length).to.be.equal(2);
        done();
      }, 30);
    });
  });
  describe('Sell', function() {
    it('should create a new sell order and store into openSell list', function(done) {
      let sellData = {
        userID: 'harry',
        amount: 2,
        price: 500,
        currency: 'BTC',
        type: 'sell',
        currFrom: 'BTC',
        currTo: 'LTC'
      };
      trade._buy(trade._deepstreamClient, sellData, openOrders, transactionHistory);
      setTimeout(function() {
        expect(openOrders.getEntries().length).to.be.equal(3);
        done();
      }, 5);
    });
    it('should fulfill a buy order if the amount matches the sell order', function(done) {
      let sellData = {
        userID: 'kyle',
        amount: 2,
        price: 80,
        currency: 'BTC',
        type: 'buy',
        currFrom: 'LTC',
        currTo: 'BTC'
      };
    trade._buy(trade._deepstreamClient, sellData, openOrders, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(8);
        expect(openOrders.getEntries().length).to.be.equal(2);
        done();
      }, 30);
    });
    it('if buy supply < sell demand', function(done) {
      let sellData = {
        userID: 'harry',
        amount: 8,
        price: 51,
        currency: 'BTC',
        type: 'sell',
        currFrom: 'BTC',
        currTo: 'LTC'
      };
      let buyData = {
        userID: 'nick',
        amount: 4,
        price: 60,
        currency: 'BTC',
        type: 'buy',
        currFrom: 'BTC',
        currTo: 'LTC'
      };
      trade._buy(trade._deepstreamClient, sellData, openOrders, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(10);
        expect(openOrders.getEntries().length).to.be.equal(2);
        trade._buy(trade._deepstreamClient, buyData, openOrders, transactionHistory);
        done();
      }, 20);
    });
    it('if buy supply > sell demand', function(done) {

      let sellData = {
        userID: 'harry',
        amount: 2,
        price: 56,
        currency: 'BTC',
        type: 'sell',
        currFrom: 'LTC',
        currTo: 'BTC'
      };
      trade._buy(trade._deepstreamClient, sellData, openOrders, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(12);
        expect(openOrders.getEntries().length).to.be.equal(3);
        done();
      }, 20);
    });
  });
});
