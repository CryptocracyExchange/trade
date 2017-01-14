const _ = require('lodash');

// Buy Transaction Listener
const initTransaction = (connect, openOrders, transactionHistory) => {
  connect.event.subscribe('transaction', (data) => {
    let options = {
      userID: data.userID,
      currency: data.currency,
      update: data.update,
      balanceType: 'available'
    };

    data.currFrom = 'BTC';
    data.currTo = 'LTC';
    connect.event.emit('checkBalance', options);
    connect.event.subscribe('returnBalance', (balance) => {
      // console.log('bal', balance, 'data', data)
      if (balance.balance >= data.amount * data.price) {
        connect.event.unsubscribe('transaction');
        connect.event.unsubscribe('returnBalance');
        buy(connect, data, openOrders, transactionHistory);
      } else {
        console.log('NOT ENOUGH MONEY!');
      }
    });
  });
}

// Define the buy method
const buy = (connect, data, openOrders, transactionHistory) => {
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
      currency: data.currency,
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
        data.balanceType = 'available';
        console.log('balance type', data.balanceType);
        connect.event.emit('updateBalance', data);

        // Push record into open buy transactions
        openOrders.whenReady((list) => {
          list.addEntry(`open/${unique}`);
          let entries = list.getEntries();
          let tempArr = [];

          for (let i = 0; i < entries.length; i++) {
            connect.record.getRecord(entries[i]).whenReady((record) => {
              let buying = record.get();
              buying.name = record.name;
              tempArr.push(buying);
            });
          }

          // Sort buy list
          tempArr = _.sortBy(tempArr, [function(rec){ return +rec.price; }]);
          _.forEach(entries, (entry) => {
            list.removeEntry(entry);
          });

          _.forEach(tempArr, (rec) => {
            list.addEntry(rec.name);
          });
        });
        /** Check sell orders to fulfill open buy order **/
        // Initiate the openOrders list
        openOrders.whenReady((orderList) => {
          // Get array of open sell orders
          let orders = orderList.getEntries();
          var diff,
              noDuplicate = true;
          // console.log("looking through the order list");
          // Iterate through every open order in the openOrders list
          for (let n = 0; n < orders.length; n++) {
            // Create new Transaction History records for each buy and sell
            let newBuyHist = connect.record.getRecord(`closed/${connect.getUid()}`);
            let newSellHist = connect.record.getRecord(`closed/${connect.getUid()}`);
            // Get each record info
            connect.record.getRecord(orders[n]).whenReady((order) => {
              // Filter currency that the buy order is exchanging to
              if ((order.get('currTo') === data.currFrom) && (order.get('currFrom') === data.currTo)) {
                // console.log('currency match!');
                // Initiate the transactionHistory list
                transactionHistory.whenReady((transHist) => {
                  // Initiate the new buy history record
                  newBuyHist.whenReady((newHistBuyRecord) => {
                    // Initiate the new sell history record
                    newSellHist.whenReady((newHistSellRecord) => {
                      // console.log('loop open orders', order.get());
                      // console.log('new orders', newRecord.get());
                      // console.log('hola!');
                      // Match each buy to a sell and vice versa
                      if (order.get('type') !== newRecord.get('type')){
                        // console.log('match', order.get());
                        // console.log('match2', newRecord.get());
                        if (order.get('type') === 'sell') {
                          if (order.get() && order.get('amount') && (order.get('price') <= newRecord.get('price')) && noDuplicate) {
                            if ((order.get('amount') == newRecord.get('amount')) && noDuplicate) {
                              // Supply == Demand
                              console.log('sell amount = buy amount');
                              newRecord.set('amount', newRecord.get('amount'));
                              order.set('amount', newRecord.get('amount'));
                              newHistBuyRecord.set({
                                userID: newRecord.get('userID'),
                                price: order.get('price'),
                                currency: newRecord.get('currency'),
                                type: 'buy',
                                currTo: newRecord.get('currTo'),
                                currFrom: newRecord.get('currFrom'),
                                amount: newRecord.get('amount'),
                                from: order.name,
                                originalId: newRecord.name
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                } else {
                                  data.balanceType = 'actual';
                                  data.userID = newRecord.get('userID');
                                  connect.event.emit('updateBalance', data);
                                  connect.record.getRecord(`rates/${newRecord.get('currFrom')}${newRecord.get('currTo')}`).whenReady((rateRec) => {
                                    rateRec.set('rate', order.get('price'));
                                  });
                                }
                              });
                              newHistSellRecord.set({
                                userID: order.get('userID'),
                                price: order.get('price'),
                                currency: order.get('currency'),
                                type: 'sell',
                                currTo: order.get('currTo'),
                                currFrom: order.get('currFrom'),
                                amount: order.get('amount'),
                                to: newRecord.name,
                                originalId: order.name
                              }, err => {
                                if (err) {
                                  console.log('sell', err);
                                } else {
                                  data.balanceType = 'actual';
                                  data.userID = order.get('userID');
                                  connect.event.emit('updateBalance', data);
                                }
                              });
                              transHist.addEntry(newHistSellRecord.name);
                              transHist.addEntry(newHistBuyRecord.name);
                              orderList.removeEntry(order.name);
                              orderList.removeEntry(newRecord.name);
                              noDuplicate = false;

                              // // Alert closed sale
                              connect.event.emit('closedSale', {
                                userID: newRecord.get('userID'),
                                price: order.get('price'),
                                currency: newRecord.get('currency'),
                                type: 'buy',
                                amount: newRecord.get('amount'),
                                from: order.name,
                                originalId: newRecord.name
                              });

                            } else if (order.get('amount') < newRecord.get('amount')) {
                              // Supply < Demand
                              diff = newRecord.get('amount') - order.get('amount');
                              if (diff > 0) {
                                console.log('if amount supply < demand && diff > 0', diff);
                                console.log('buyrecord: ', newRecord.name, newRecord.get());
                                console.log('sellrecord: ', order.name, order.get());
                                // Setting new history records
                                newHistBuyRecord.set({
                                  userID: newRecord.get('userID'),
                                  price: order.get('price'),
                                  currency: newRecord.get('currency'),
                                  type: 'buy',
                                  currTo: newRecord.get('currTo'),
                                  currFrom: newRecord.get('currFrom'),
                                  amount: order.get('amount'),
                                  from: order.name,
                                  originalId: newRecord.name
                                }, err => {
                                  if (err) {
                                    console.log('buy', err);
                                  } else {
                                    data.balanceType = 'actual';
                                    data.userID = newRecord.get('userID');
                                    connect.event.emit('updateBalance', data);
                                    console.log('setting new buy', newHistBuyRecord.name);
                                    connect.record.getRecord(`rates/${newRecord.get('currFrom')}${newRecord.get('currTo')}`).whenReady((rateRec) => {
                                      rateRec.set('rate', order.get('price'));
                                    });
                                  }
                                });
                                newHistSellRecord.set({
                                  userID: order.get('userID'),
                                  price: order.get('price'),
                                  currency: order.get('currency'),
                                  type: 'sell',
                                  currTo: order.get('currTo'),
                                  currFrom: order.get('currFrom'),
                                  amount: order.get('amount'),
                                  to: newRecord.name,
                                  originalId: order.name
                                }, err => {
                                  if (err) {
                                    console.log('sell', err);
                                  } else {
                                    data.balanceType = 'actual';
                                    data.userID = order.get('userID');
                                    connect.event.emit('updateBalance', data);
                                    console.log('setting new sell', newHistSellRecord.name);
                                  }
                                });
                                transHist.addEntry(newHistBuyRecord.name);
                                transHist.addEntry(newHistSellRecord.name);
                                orderList.removeEntry(order.name);
                                newRecord.set('amount', diff);
                                // // Alert closed sale
                                connect.event.emit('closedSale', {
                                  userID: order.get('userID'),
                                  price: order.get('price'),
                                  currency: order.get('currency'),
                                  type: 'sell',
                                  amount: order.get('amount'),
                                  to: newRecord.name,
                                  originalId: order.name
                                });
                              }
                            } else if (order.get('amount') > newRecord.get('amount')){
                              // Supply > Demand
                              diff = order.get('amount') - newRecord.get('amount');
                              if (diff > 0) {
                                console.log('if amount supply > demand && diff > 0', diff);
                                newHistBuyRecord.set({
                                  userID: newRecord.get('userID'),
                                  price: order.get('price'),
                                  currency: newRecord.get('currency'),
                                  type: 'buy',
                                  currTo: newRecord.get('currTo'),
                                  currFrom: newRecord.get('currFrom'),
                                  amount: newRecord.get('amount'),
                                  from: order.name,
                                  originalId: newRecord.name
                                }, err => {
                                  if (err) {
                                    console.log('buy', err);
                                  } else {
                                    data.balanceType = 'actual';
                                    data.userID = newRecord.get('userID');
                                    connect.event.emit('updateBalance', data);
                                    connect.record.getRecord(`rates/${newRecord.get('currFrom')}${newRecord.get('currTo')}`).whenReady((rateRec) => {
                                      rateRec.set('rate', order.get('price'));
                                    });
                                  }
                                });
                                newHistSellRecord.set({
                                  userID: order.get('userID'),
                                  price: order.get('price'),
                                  currency: order.get('currency'),
                                  type: 'sell',
                                  currTo: order.get('currTo'),
                                  currFrom: order.get('currFrom'),
                                  amount: newRecord.get('amount'),
                                  to: newRecord.name,
                                  originalId: order.name
                                }, err => {
                                  if (err) {
                                    console.log('sell', err);
                                  } else {
                                    data.balanceType = 'actual';
                                    data.userID = order.get('userID');
                                    connect.event.emit('updateBalance', data);
                                  }
                                });
                                transHist.addEntry(newHistSellRecord.name);
                                transHist.addEntry(newHistBuyRecord.name);
                                orderList.removeEntry(newRecord.name);
                                order.set('amount', diff);
                                // // Alert closed sale
                                connect.event.emit('closedSale', {
                                  userID: newRecord.get('userID'),
                                  price: order.get('price'),
                                  currency: newRecord.get('currency'),
                                  type: 'buy',
                                  amount: newRecord.get('amount'),
                                  from: order.name,
                                  originalId: newRecord.name
                                });
                              }
                            }
                          }
                        } else {
                          if (
                            order.get() &&
                            order.get('amount') &&
                            (order.get('price') >= newRecord.get('price')) &&
                            noDuplicate)
                            {
                            if ((order.get('amount') == newRecord.get('amount')) && noDuplicate) {
                              // Supply == Demand
                              console.log('sell amount = buy amount');
                              newRecord.set('amount', newRecord.get('amount'));
                              order.set('amount', newRecord.get('amount'));
                              newHistBuyRecord.set({
                                userID: newRecord.get('userID'),
                                price: order.get('price'),
                                currency: newRecord.get('currency'),
                                type: 'buy',
                                currTo: newRecord.get('currTo'),
                                currFrom: newRecord.get('currFrom'),
                                amount: newRecord.get('amount'),
                                from: order.name,
                                originalId: newRecord.name
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                } else {
                                  data.balanceType = 'actual';
                                  data.userID = newRecord.get('userID');
                                  connect.event.emit('updateBalance', data);
                                }
                              });
                              newHistSellRecord.set({
                                userID: order.get('userID'),
                                price: order.get('price'),
                                currency: order.get('currency'),
                                type: 'sell',
                                currTo: order.get('currTo'),
                                currFrom: order.get('currFrom'),
                                amount: order.get('amount'),
                                to: newRecord.name,
                                originalId: order.name
                              }, err => {
                                if (err) {
                                  console.log('sell', err);
                                } else {
                                  data.balanceType = 'actual';
                                  data.userID = order.get('userID');
                                  connect.event.emit('updateBalance', data);
                                }
                              });
                              transHist.addEntry(newHistSellRecord.name);
                              transHist.addEntry(newHistBuyRecord.name);
                              orderList.removeEntry(order.name);
                              orderList.removeEntry(newRecord.name);
                              noDuplicate = false;

                              // // Alert closed sale
                              connect.event.emit('closedSale', {
                                userID: newRecord.get('userID'),
                                price: order.get('price'),
                                currency: newRecord.get('currency'),
                                type: 'buy',
                                amount: newRecord.get('amount'),
                                from: order.name,
                                originalId: newRecord.name
                              });

                            } else if (order.get('amount') < newRecord.get('amount')) {
                              // Supply < Demand
                              diff = newRecord.get('amount') - order.get('amount');
                              if (diff > 0) {
                                console.log('if amount supply < demand && diff > 0', diff);
                                console.log('buyrecord: ', newRecord.name, newRecord.get());
                                console.log('sellrecord: ', order.name, order.get());
                                // Setting new history records
                                newHistBuyRecord.set({
                                  userID: newRecord.get('userID'),
                                  price: order.get('price'),
                                  currency: newRecord.get('currency'),
                                  type: 'buy',
                                  currTo: newRecord.get('currTo'),
                                  currFrom: newRecord.get('currFrom'),
                                  amount: order.get('amount'),
                                  from: order.name,
                                  originalId: newRecord.name
                                }, err => {
                                  if (err) {
                                    console.log('buy', err);
                                  } else {
                                    data.balanceType = 'actual';
                                    data.userID = newRecord.get('userID');
                                    connect.event.emit('updateBalance', data);
                                    console.log('setting new buy', newHistBuyRecord.name);
                                  }
                                });
                                newHistSellRecord.set({
                                  userID: order.get('userID'),
                                  price: order.get('price'),
                                  currency: order.get('currency'),
                                  type: 'sell',
                                  currTo: order.get('currTo'),
                                  currFrom: order.get('currFrom'),
                                  amount: order.get('amount'),
                                  to: newRecord.name,
                                  originalId: order.name
                                }, err => {
                                  if (err) {
                                    console.log('sell', err);
                                  } else {
                                    data.balanceType = 'actual';
                                    data.userID = order.get('userID');
                                    connect.event.emit('updateBalance', data);
                                    console.log('setting new sell', newHistSellRecord.name);
                                  }
                                });
                                transHist.addEntry(newHistBuyRecord.name);
                                transHist.addEntry(newHistSellRecord.name);
                                orderList.removeEntry(order.name);
                                newRecord.set('amount', diff);
                                // // Alert closed sale
                                connect.event.emit('closedSale', {
                                  userID: order.get('userID'),
                                  price: order.get('price'),
                                  currency: order.get('currency'),
                                  type: 'sell',
                                  amount: order.get('amount'),
                                  to: newRecord.name,
                                  originalId: order.name
                                });
                              }
                            } else if (order.get('amount') > newRecord.get('amount')) {
                              // Supply > Demand
                              diff = order.get('amount') - newRecord.get('amount');
                              if (diff > 0) {
                                console.log('if amount supply > demand && diff > 0', diff);
                                newHistBuyRecord.set({
                                  userID: newRecord.get('userID'),
                                  price: order.get('price'),
                                  currency: newRecord.get('currency'),
                                  type: 'buy',
                                  currTo: newRecord.get('currTo'),
                                  currFrom: newRecord.get('currFrom'),
                                  amount: newRecord.get('amount'),
                                  from: order.name,
                                  originalId: newRecord.name
                                }, err => {
                                  if (err) {
                                    console.log('buy', err);
                                  } else {
                                    data.balanceType = 'actual';
                                    data.userID = newRecord.get('userID');
                                    connect.event.emit('updateBalance', data);
                                  }
                                });
                                newHistSellRecord.set({
                                  userID: order.get('userID'),
                                  price: order.get('price'),
                                  currency: order.get('currency'),
                                  type: 'sell',
                                  currTo: order.get('currTo'),
                                  currFrom: order.get('currFrom'),
                                  amount: newRecord.get('amount'),
                                  to: newRecord.name,
                                  originalId: order.name
                                }, err => {
                                  if (err) {
                                    console.log('sell', err);
                                  } else {
                                    data.balanceType = 'actual';
                                    data.userID = order.get('userID');
                                    connect.event.emit('updateBalance', data);
                                  }
                                });
                                transHist.addEntry(newHistSellRecord.name);
                                transHist.addEntry(newHistBuyRecord.name);
                                orderList.removeEntry(newRecord.name);
                                order.set('amount', diff);
                                // // Alert closed sale
                                connect.event.emit('closedSale', {
                                  userID: newRecord.get('userID'),
                                  price: order.get('price'),
                                  currency: newRecord.get('currency'),
                                  type: 'buy',
                                  amount: newRecord.get('amount'),
                                  from: order.name,
                                  originalId: newRecord.name
                                });
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

module.exports = {
  buy: buy,
  initTransaction: initTransaction
};
