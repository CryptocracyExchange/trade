const chai = require('chai');
const should = chai.should();
const assert = chai.assert;
const expect = chai.expect;

// DS.io
const Deepstream = require('deepstream.io');
const server = new Deepstream({port:6104});
const trade = require('../server/trading/start.js');
var connect, ds, openBuy, openSell, transactionHistory;

before(function(done) {
  server.start();
  setTimeout(function() {
    ds = require('deepstream.io-client-js');
    connect = ds('localhost:6104').login();
    openBuy = connect.record.getList('openBuy');
    openSell = connect.record.getList('openSell');
    transactionHistory = connect.record.getList('transactionHistory');

    // Creates Sample Open Buy and Sell List
    openBuy.whenReady(function(newBuyList) {
      openSell.whenReady((newList) => {
        let newSellRecord1 = connect.record.getRecord(`open/1`);
        let newSellRecord2 = connect.record.getRecord(`open/2`);
        let newSellRecord3 = connect.record.getRecord(`open/3`);
        let newSellRecord4 = connect.record.getRecord(`open/4`);
        let newSellRecord5 = connect.record.getRecord(`open/5`);
        let newBuyRecord1 = connect.record.getRecord(`open/6`);
        let newBuyRecord2 = connect.record.getRecord(`open/7`);
        let newBuyRecord3 = connect.record.getRecord(`open/8`);
        let newBuyRecord4 = connect.record.getRecord(`open/9`);
        newSellRecord1.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 20,
            currency: 'BTC'
          }, function(err) {
            newList.addEntry(`open/1`);
          });
        });
        newSellRecord2.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 21,
            currency: 'BTC'
          }, function(err) {
            newList.addEntry(`open/2`);
          });
        });
        newSellRecord3.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 22,
            currency: 'BTC'
          }, function(err) {
            newList.addEntry(`open/3`);
          });
        });
        newSellRecord4.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 23,
            currency: 'BTC'
          }, function(err) {
            newList.addEntry(`open/4`);
          });
        });
        newSellRecord5.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 24,
            currency: 'BTC'
          }, function(err) {
            newList.addEntry(`open/5`);
          });
        });

        newBuyRecord1.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 60,
            currency: 'BTC'
          }, function(err) {
            newBuyList.addEntry(`open/6`);
          });
        });
        newBuyRecord2.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 59,
            currency: 'BTC'
          }, function(err) {
            newBuyList.addEntry(`open/7`);
          });
        });
        newBuyRecord3.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 58,
            currency: 'BTC'
          }, function(err) {
            newBuyList.addEntry(`open/8`);
          });
        });
        newBuyRecord4.whenReady((newRec) => {
          newRec.set({
            userID: 'nick',
            amount: 5,
            price: 57,
            currency: 'BTC'
          }, function(err) {
            newBuyList.addEntry(`open/9`);
          });
        });
        done();
      });
    });
  },1500);
});

after(function(done) {
  connect.close();
  server.stop();
  done();
});

describe('Transactions', function() {
  describe('Init', function() {
    it('should create a new record', function() {
      let newBuyRecord = connect.record.getRecord('test');
      newBuyRecord.whenReady(function(newRec) {
        newRec.set('test', 'test');
        let test = newRec.get('test');
        expect(test).to.be.equal('test');
      });
    });
    it('openBuy list should have 4 initial records', function() {
      let buyEnts = openBuy.getEntries();
      expect(buyEnts.length).to.be.equal(4);
    });
    it('openSell list should have 5 initial records', function() {
      let sellEnts = openSell.getEntries();
      expect(sellEnts.length).to.be.equal(5);
    });
    it('Transaction History should display empty list', function() {
      let transHist = transactionHistory.getEntries();
      expect(transHist.length).to.be.equal([].length);
    });
  });


  describe('Buy', function() {
    this.timeout(800);

    it('should create a new buy order and store into openBuy list', function(done) {
      let buyData = {
        userID: 'harry',
        amount: 2,
        price: 5,
        currency: 'BTC'
      };
      trade.buy(connect, buyData, openBuy, openSell, transactionHistory);
      setTimeout(function() {
        expect(openBuy.getEntries().length).to.be.equal(5);
        done();
      }, 5);
    });
    it('should fulfill a sell order if the amount matches the buy order', function(done) {
      let buyData = {
        userID: 'harry',
        amount: 5,
        price: 20,
        currency: 'BTC'
      };
      trade.buy(connect, buyData, openBuy, openSell, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(2);
        expect(openSell.getEntries().length).to.be.equal(4);
        expect(openBuy.getEntries().length).to.be.equal(5);
        done();
      }, 50);
    });
    it('if sell supply < buy demand', function(done) {
      let buyData = {
        userID: 'harry',
        amount: 6,
        price: 22,
        currency: 'BTC'
      };
      trade.buy(connect, buyData, openBuy, openSell, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(6);
        expect(openSell.getEntries().length).to.be.equal(3);
        expect(openBuy.getEntries().length).to.be.equal(5);
        done();
      }, 50);
    });
    it('if sell supply > buy demand', function(done) {
      let buyData = {
        userID: 'harry',
        amount: 2,
        price: 22,
        currency: 'BTC'
      };
      trade.buy(connect, buyData, openBuy, openSell, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(8);
        expect(openSell.getEntries().length).to.be.equal(3);
        expect(openBuy.getEntries().length).to.be.equal(5);
        done();
      }, 50);
    });
  });
  describe('Sell', function() {
    it('should create a new sell order and store into openSell list', function(done) {
      let sellData = {
        userID: 'harry',
        amount: 2,
        price: 500,
        currency: 'BTC'
      };
      trade.sell(connect, sellData, openBuy, openSell, transactionHistory);
      setTimeout(function() {
        expect(openSell.getEntries().length).to.be.equal(4);
        done();
      }, 5);
    });
    it('should fulfill a buy order if the amount matches the sell order', function(done) {
      let sellData = {
        userID: 'harry',
        amount: 5,
        price: 60,
        currency: 'BTC'
      };
    trade.sell(connect, sellData, openBuy, openSell, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(10);
        expect(openSell.getEntries().length).to.be.equal(4);
        expect(openBuy.getEntries().length).to.be.equal(4);
        done();
      }, 50);
    });
    it('if buy supply < sell demand', function(done) {
      let sellData = {
        userID: 'harry',
        amount: 7,
        price: 57,
        currency: 'BTC'
      };
      trade.buy(connect, sellData, openBuy, openSell, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(14);
        expect(openSell.getEntries().length).to.be.equal(2);
        expect(openBuy.getEntries().length).to.be.equal(4);
        done();
      }, 50);
    });
    it('if buy supply > sell demand', function(done) {
      let sellData = {
        userID: 'harry',
        amount: 2,
        price: 57,
        currency: 'BTC'
      };
      trade.buy(connect, sellData, openBuy, openSell, transactionHistory);
      setTimeout(function() {
        expect(transactionHistory.getEntries().length).to.be.equal(16);
        expect(openSell.getEntries().length).to.be.equal(2);
        expect(openBuy.getEntries().length).to.be.equal(4);
        done();
      }, 50);
    });
  });
});
