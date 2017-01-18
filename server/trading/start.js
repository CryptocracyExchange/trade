const _ = require('lodash');
const DeepstreamClient = require('deepstream.io-client-js');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

const Provider = function (config) {
  this.isReady = false;
  this._config = config;
  this._logLevel = config.logLevel !== undefined ? config.logLevel : 1;
  this._deepstreamClient = null;
};

util.inherits(Provider, EventEmitter);

Provider.prototype.start = function () {
  this._initialiseDeepstreamClient();
};

Provider.prototype.stop = function () {
  this._deepstreamClient.close();
};

Provider.prototype.log = function (message, level) {
  if (this._logLevel < level) {
    return;
  }

  const date = new Date();
  const time = `${date.toLocaleTimeString()}:${date.getMilliseconds()}`;

  console.log(`${time}::Trade::${message}`);
};

Provider.prototype._initialiseDeepstreamClient = function () {
  this.log('Initialising Deepstream connection', 1);

  if (this._config.deepstreamClient) {
    this._deepstreamClient = this._config.deepstreamClient;
    this.log('Deepstream connection established', 1);
    this._ready();
  } else {
    if (!this._config.deepstreamUrl) {
      throw new Error('Can\'t connect to deepstream, neither deepstreamClient nor deepstreamUrl were provided', 1);
    }

    if (!this._config.deepstreamCredentials) {
      throw new Error('Missing configuration parameter deepstreamCredentials', 1);
    }

    this._deepstreamClient = new DeepstreamClient(this._config.deepstreamUrl);
    this._deepstreamClient.on('error', (error) => {
      console.log(error);
    });
    this._deepstreamClient.login(
      this._config.deepstreamCredentials,
      this._onDeepstreamLogin.bind(this)
      );
  }
};

Provider.prototype._onDeepstreamLogin = function (success, error, message) {
  if (success) {
    this.log('Connection to deepstream established', 1);
    this._ready();
  } else {
    this.log(`Can't connect to deepstream: ${message}`, 1);
  }
};

Provider.prototype._ready = function () {
  /** Create OPEN and TRANSACTION HISTORY lists **/
  // Open Orders
  let openOrders = this._deepstreamClient.record.getList('openOrders');
  // Transaction History
  let transactionHistory = this._deepstreamClient.record.getList('transactionHistory');
  /** Invoke Event Listener **/
  this._initTransaction(openOrders, transactionHistory);

  this.log('trade provider ready', 1);
  this.isReady = true;
  this.emit('ready');
};

// Buy Transaction Listener
Provider.prototype._initTransaction = function (openOrders, transactionHistory) {
  this._deepstreamClient.event.subscribe('transaction', (data) => {
    let options = {
      userID: data.userID,
      currency: data.currFrom,
      update: data.update,
      balanceType: 'available'
    };
    this._deepstreamClient.event.emit('checkBalance', options);
    this._deepstreamClient.event.subscribe('returnBalance', (balance) => {
      if (balance.balance && (balance.balance >= data.amount * data.price)) {
        console.log('balance returned');
        this._deepstreamClient.event.unsubscribe('returnBalance');
        this._buy(this._deepstreamClient, data, openOrders, transactionHistory);
      } else {
        console.log('NOT ENOUGH MONEY!');
      }
    });
  });
}

// Define the buy method
Provider.prototype._buy = function (connect, data, openOrders, transactionHistory) {

  let updateBalanceEmit = (connect, data, updated, type, isExternal, rec) => {
    data.currency = updated;
    if (isExternal) {
      data.isExternal = true;
      connect.event.emit('updateBalance', data);
    } else {
      data.balanceType = type;
      connect.event.emit('updateBalance', data);
    }
    connect.event.subscribe('returnBalance', (data) => {
      if (data.success === false) {
        console.log('data not success');
        rec.delete();
        connect.event.emit('tradeFailed', data);
      }
    });
  };

  let settingBuyHistRecord = (master, newRecord, order, diff, connect, data) => {
    master.set({
      userID: newRecord.get('userID'),
      price: order.get('price'),
      currency: newRecord.get('currency'),
      type: 'buy',
      currTo: newRecord.get('currTo'),
      currFrom: newRecord.get('currFrom'),
      amount: diff.get('amount'),
      from: order.name,
      originalId: newRecord.name
    }, err => {
      if (err) {
        console.log('There was an error setting the transaction buy record', err);
      } else {
        data.userID = newRecord.get('userID');
        data.update = -(+newRecord.get('price') * +diff.get('amount'));
        updateBalanceEmit(connect, data, data.currFrom, 'actual');
        data.update = +diff.get('amount');
        updateBalanceEmit(connect, data, data.currTo, 'actual', true);
        connect.record.getRecord(`rates/${newRecord.get('currFrom')}${newRecord.get('currTo')}`).whenReady((rateRec) => {
          rateRec.set('rate', order.get('price'));
        });
      }
    });
  };

  let settingSellHistRecord = (master, newRecord, order, diff, connect, data) => {
    master.set({
      userID: order.get('userID'),
      price: order.get('price'),
      currency: order.get('currency'),
      type: 'sell',
      currTo: order.get('currTo'),
      currFrom: order.get('currFrom'),
      amount: diff.get('amount'),
      to: newRecord.name,
      originalId: order.name
    }, err => {
      if (err) {
        console.log('There was an error setting the transaction sell record', err);
      } else {
        data.userID = order.get('userID');
        data.update = -(+order.get('price') * +diff.get('amount'));
        updateBalanceEmit(connect, data, data.currFrom, 'actual');
        data.update = +diff.get('amount');
        updateBalanceEmit(connect, data, data.currTo, 'actual', true);
      }
    });
  };

  let emitClosedBuy = (connect, newRecord, order) => {
    connect.event.emit('closedSale', {
      userID: newRecord.get('userID'),
      price: order.get('price'),
      currency: newRecord.get('currency'),
      type: 'buy',
      amount: newRecord.get('amount'),
      from: order.name,
      originalId: newRecord.name,
      date: newRecord.get('date')
    });
  };

  let emitClosedSell = (connect, newRecord, order) => {
    connect.event.emit('closedSale', {
      userID: order.get('userID'),
      price: order.get('price'),
      currency: order.get('currency'),
      type: 'sell',
      amount: order.get('amount'),
      to: newRecord.name,
      originalId: order.name,
      date: newRecord.get('date')
    });
  };

  // Creates unique ID
  let unique = connect.getUid();
  // Creates new buy record
  const buy = connect.record.getRecord(`open/${unique}`);
  let newToday = new Date();
  buy.whenReady((newRecord) => {
    newRecord.set({
      userID: data.userID,
      amount: +data.amount,
      price: +data.price,
      currency: data.currFrom,
      currFrom: data.currFrom,
      currTo: data.currTo,
      type: data.type,
      date: newToday
    }, err => {
      if (err) {
        console.log('Open record set with error:', err)
      } else {
        console.log('Open record set without error');

        // Update user balance after buy order
        data.update = -(+data.amount * +data.price);
        updateBalanceEmit(connect, data, data.currFrom, 'available', false, newRecord);

        // Push record into open buy transactions
        openOrders.whenReady((list) => {
          list.addEntry(`open/${unique}`);
          let entries = list.getEntries();
          let tempArr = [];

          // Push openOrders records to a temporary array
          for (let i = 0, len = entries.length; i < len; i++) {
            connect.record.getRecord(entries[i]).whenReady((record) => {
              let buying = record.get();
              buying.name = record.name;
              tempArr.push(buying);
            });
          }

          // Sort the temporary array
          tempArr = _.sortBy(tempArr, [function(rec){ return +rec.price; }]);

          // Remove the entries from the openOrders
          _.forEach(entries, (entry) => {
            list.removeEntry(entry);
          });

          // Add all of temporary array to openOrders
          _.forEach(tempArr, (rec) => {
            list.addEntry(rec.name);
          });
        });
        /** Check sell orders to fulfill open buy order **/
        // Initiate the openOrders list
        openOrders.whenReady((orderList) => {
          // Get array of open sell orders
          let orders = orderList.getEntries();
          var diff, noDuplicate = true;
          // Iterate through every open order in the openOrders list
          for (let n = 0; n < orders.length; n++) {
            // Create new Transaction History records for each buy and sell
            let newBuyHist = connect.record.getRecord(`closed/${connect.getUid()}`);
            let newSellHist = connect.record.getRecord(`closed/${connect.getUid()}`);
            // Get each record info
            connect.record.getRecord(orders[n]).whenReady((order) => {
              // Filter currency that the buy order is exchanging to
              if ((order.get('currTo') === data.currFrom) && (order.get('currFrom') === data.currTo)) {
                // Initiate the transactionHistory list
                transactionHistory.whenReady((transHist) => {
                  // Initiate the new buy history record
                  newBuyHist.whenReady((newHistBuyRecord) => {
                    // Initiate the new sell history record
                    newSellHist.whenReady((newHistSellRecord) => {
                      // Match each buy to a sell and vice versa
                      if (order.get('type') !== newRecord.get('type')){
                        if (order.get('type') === 'sell') {
                          if (order.get() && order.get('amount') && (order.get('price') <= newRecord.get('price')) && noDuplicate) {
                            if ((order.get('amount') == newRecord.get('amount')) && noDuplicate) {
                              // Supply == Demand
                              console.log('sell amount = buy amount');
                              newRecord.set('amount', newRecord.get('amount'));
                              order.set('amount', newRecord.get('amount'));
                              settingBuyHistRecord(newHistBuyRecord, newRecord, order, newRecord, connect, data);
                              settingSellHistRecord(newHistSellRecord, newRecord, order, order, connect, data);
                              transHist.addEntry(newHistSellRecord.name);
                              transHist.addEntry(newHistBuyRecord.name);
                              orderList.removeEntry(order.name);
                              orderList.removeEntry(newRecord.name);
                              noDuplicate = false;
                              // // Alert closed sale
                              emitClosedBuy(connect, newRecord, order);
                            } else if (order.get('amount') < newRecord.get('amount')) {
                              // Supply < Demand
                              diff = newRecord.get('amount') - order.get('amount');
                              if (diff > 0) {
                                console.log('if amount supply < demand && diff > 0', diff);
                                // console.log('buyrecord: ', newRecord.name, newRecord.get());
                                // console.log('sellrecord: ', order.name, order.get());
                                // Setting new history records
                                settingBuyHistRecord(newHistBuyRecord, newRecord, order, order, connect, data);
                                settingSellHistRecord(newHistSellRecord, newRecord, order, order, connect, data);
                                transHist.addEntry(newHistBuyRecord.name);
                                transHist.addEntry(newHistSellRecord.name);
                                orderList.removeEntry(order.name);
                                newRecord.set('amount', diff);
                                // // Alert closed sale
                                emitClosedSell(connect, newRecord, order);
                              }
                            } else if (order.get('amount') > newRecord.get('amount')) {
                              // Supply > Demand
                              diff = order.get('amount') - newRecord.get('amount');
                              if (diff > 0) {
                                console.log('if amount supply > demand && diff > 0', diff);
                                settingBuyHistRecord(newHistBuyRecord, newRecord, order, newRecord, connect, data);
                                settingSellHistRecord(newHistSellRecord, newRecord, order, newRecord, connect, data);
                                transHist.addEntry(newHistSellRecord.name);
                                transHist.addEntry(newHistBuyRecord.name);
                                orderList.removeEntry(newRecord.name);
                                order.set('amount', diff);
                                // // Alert closed sale
                                emitClosedBuy(connect, newRecord, order);
                              }
                            }
                          }
                        } else {
                          if (order.get() && order.get('amount') && (order.get('price') >= newRecord.get('price')) && noDuplicate) {
                            if ((order.get('amount') == newRecord.get('amount')) && noDuplicate) {
                              // Supply == Demand
                              console.log('sell amount = buy amount');
                              newRecord.set('amount', newRecord.get('amount'));
                              order.set('amount', newRecord.get('amount'));
                              settingBuyHistRecord(newHistBuyRecord, newRecord, order, newRecord, connect, data);
                              settingSellHistRecord(newHistSellRecord, newRecord, order, order, connect, data);
                              transHist.addEntry(newHistSellRecord.name);
                              transHist.addEntry(newHistBuyRecord.name);
                              orderList.removeEntry(order.name);
                              orderList.removeEntry(newRecord.name);
                              noDuplicate = false;
                              // // Alert closed sale
                              emitClosedBuy(connect, newRecord, order);
                            } else if (order.get('amount') < newRecord.get('amount')) {
                              // Supply < Demand
                              diff = newRecord.get('amount') - order.get('amount');
                              if (diff > 0) {
                                console.log('if amount supply < demand && diff > 0', diff);
                                // console.log('buyrecord: ', newRecord.name, newRecord.get());
                                // console.log('sellrecord: ', order.name, order.get());
                                // Setting new history records
                                settingBuyHistRecord(newHistBuyRecord, newRecord, order, order, connect, data);
                                settingSellHistRecord(newHistSellRecord, newRecord, order, order, connect, data);
                                transHist.addEntry(newHistBuyRecord.name);
                                transHist.addEntry(newHistSellRecord.name);
                                orderList.removeEntry(order.name);
                                newRecord.set('amount', diff);
                                // // Alert closed sale
                                emitClosedSell(connect, newRecord, order);
                              }
                            } else if (order.get('amount') > newRecord.get('amount')) {
                              // Supply > Demand
                              diff = order.get('amount') - newRecord.get('amount');
                              if (diff > 0) {
                                console.log('if amount supply > demand && diff > 0', diff);
                                settingBuyHistRecord(newHistBuyRecord, newRecord, order, newRecord, connect, data);
                                settingSellHistRecord(newHistSellRecord, newRecord, order, newRecord, connect, data);
                                transHist.addEntry(newHistSellRecord.name);
                                transHist.addEntry(newHistBuyRecord.name);
                                orderList.removeEntry(newRecord.name);
                                order.set('amount', diff);
                                // // Alert closed sale
                                emitClosedBuy(connect, newRecord, order);
                              }
                            }
                          }
                        }
                      }
                    });
                  });
                });
              }
            });
          }
        });
      }
    });
  });
};

module.exports = Provider;
