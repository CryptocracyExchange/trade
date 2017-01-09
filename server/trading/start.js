const _ = require('lodash');

// Buy Transaction Listener
const initTransactionBuy = (connect, openBuy, openSell, transactionHistory) => {
  connect.event.subscribe('transactionBuy', (data) => {
    let options = {
      userID: data.userID,
      currency: data.currency
    };
    // connect.event.emit('checkBalance', options);
    // connect.event.subscribe('returnBalance', (balance) => {
    //   console.log('bal', balance, 'data', data)
    //   if (balance.balance >= data.amount * data.price) {
        buy(connect, data, openBuy, openSell, transactionHistory);
    //   } else {
    //     console.log('NOT ENOUGH MONEY!');
    //   }
    // });
  });
}

// Sell Transaction Listener
const initTransactionSell = (connect, openBuy, openSell, transactionHistory) => {
  connect.event.subscribe('transactionSell', (data) => {
    let options = {
      userID: data.userID,
      currency: data.currency
    };
    // console.log('sell options', data);
    // connect.event.emit('checkBalance', options);
    // connect.event.subscribe('returnBalance', (balance) => {
    //     console.log('bal', balance.balance, 'amount', data.amount * data.price);
    //   if (balance.balance >= data.amount * data.price) {
    //     console.log('fire', data);
        sell(connect, data, openBuy, openSell, transactionHistory);
    //   } else {
    //     console.log('NOT ENOUGH MONEY!');
    //   }
    // });
  });
}

// Define the buy method
const buy = (connect, data, openBuy, openSell, transactionHistory) => {
  // Creates unique ID
  let unique = connect.getUid();
  // Creates new buy record
  const buy = connect.record.getRecord(`open/${unique}`);
  buy.whenReady((record) => {
    record.set({
      userID: data.userID,
      amount: +data.amount,
      price: +data.price,
      currency: data.currency,
      type: 'buy'
    }, err => {
      if (err) {
        console.log('Buy record set with error:', err)
      } else {
        console.log('Buy record set without error');
        // Push record into open buy transactions
        openBuy.whenReady((list) => {
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

          tempArr = _.sortBy(tempArr, [function(rec){ return +rec.price; }]);
          _.forEach(entries, (entry) => {
            list.removeEntry(entry);
          });

          _.forEach(tempArr, (rec) => {
            list.addEntry(rec.name);
          });
        });

        // Check sell orders to fulfill open buy order
        openSell.whenReady((sellList) => {
          // Get array of open sell orders
          let sellOrders = sellList.getEntries();
          var diff, noDuplicate = true;
          for (let n = 0; n < sellOrders.length; n++) {
            // Create new Transaction History records
            let newBuyHist = connect.record.getRecord(`closed/${connect.getUid()}`);
            let newSellHist = connect.record.getRecord(`closed/${connect.getUid()}`);
            connect.record.getRecord(sellOrders[n]).whenReady((sellRecord) => {
              transactionHistory.whenReady((transHist) => {
                openBuy.whenReady((buyList) => {
                  buy.whenReady((buyRecord) => {
                    newBuyHist.whenReady((newHistBuyRecord) => {
                      newSellHist.whenReady((newHistSellRecord) => {
                        if (sellRecord.get() && sellRecord.get('amount') && (sellRecord.get('price') <= buyRecord.get('price')) && noDuplicate) {
                          if ((sellRecord.get('amount') == buyRecord.get('amount')) && noDuplicate) {
                            // Supply == Demand
                            console.log('sell amount = buy amount');
                            buyRecord.set('amount', buyRecord.get('amount'));
                            sellRecord.set('amount', buyRecord.get('amount'));
                            newHistBuyRecord.set({
                              userID: buyRecord.get('userID'),
                              price: sellRecord.get('price'),
                              currency: buyRecord.get('currency'),
                              type: 'buy',
                              amount: buyRecord.get('amount'),
                              from: sellRecord.name,
                              originalId: buyRecord.name
                            }, err => {
                              if (err) {
                                console.log('buy', err);
                              }
                            });
                            newHistSellRecord.set({
                              userID: sellRecord.get('userID'),
                              price: sellRecord.get('price'),
                              currency: sellRecord.get('currency'),
                              type: 'sell',
                              amount: sellRecord.get('amount'),
                              to: buyRecord.name,
                              originalId: sellRecord.name
                            }, err => {
                              if (err) {
                                console.log('sell', err);
                              }
                            });
                            sellList.removeEntry(sellRecord.name);
                            buyList.removeEntry(buyRecord.name);
                            transHist.addEntry(newHistSellRecord.name);
                            transHist.addEntry(newHistBuyRecord.name);
                            noDuplicate = false;
                          } else if (sellRecord.get('amount') < buyRecord.get('amount')) {
                            // Supply < Demand
                            diff = buyRecord.get('amount') - sellRecord.get('amount');
                            if (diff > 0) {
                              console.log('if amount supply < demand && diff > 0', diff);
                              console.log('buyrecord: ', buyRecord.name, buyRecord.get());
                              console.log('sellrecord: ', sellRecord.name, sellRecord.get());
                              // Setting new history records
                              newHistBuyRecord.set({
                                userID: buyRecord.get('userID'),
                                price: sellRecord.get('price'),
                                currency: buyRecord.get('currency'),
                                type: 'buy',
                                amount: sellRecord.get('amount'),
                                from: sellRecord.name,
                                originalId: buyRecord.name
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                } else {
                                  console.log('setting new buy', newHistBuyRecord.name);
                                }
                              });
                              newHistSellRecord.set({
                                userID: sellRecord.get('userID'),
                                price: sellRecord.get('price'),
                                currency: sellRecord.get('currency'),
                                type: 'sell',
                                amount: sellRecord.get('amount'),
                                to: buyRecord.name,
                                originalId: sellRecord.name
                              }, err => {
                                if (err) {
                                  console.log('sell', err);
                                } else {
                                  console.log('setting new sell', newHistSellRecord.name);
                                }
                              });
                              transHist.addEntry(newHistBuyRecord.name);
                              transHist.addEntry(newHistSellRecord.name);
                              sellList.removeEntry(sellRecord.name);
                              buyRecord.set('amount', diff);
                            }
                          } else if (sellRecord.get('amount') > buyRecord.get('amount')){
                            // Supply > Demand
                            diff = sellRecord.get('amount') - buyRecord.get('amount');
                            if (diff > 0) {
                              console.log('if amount supply > demand && diff > 0', diff);
                              newHistBuyRecord.set({
                                userID: buyRecord.get('userID'),
                                price: sellRecord.get('price'),
                                currency: buyRecord.get('currency'),
                                type: 'buy',
                                amount: buyRecord.get('amount'),
                                from: sellRecord.name,
                                originalId: buyRecord.name
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                }
                              });
                              newHistSellRecord.set({
                                userID: sellRecord.get('userID'),
                                price: sellRecord.get('price'),
                                currency: sellRecord.get('currency'),
                                type: 'sell',
                                amount: buyRecord.get('amount'),
                                to: buyRecord.name,
                                originalId: sellRecord.name
                              }, err => {
                                if (err) {
                                  console.log('sell', err);
                                }
                              });
                              transHist.addEntry(newHistSellRecord.name);
                              transHist.addEntry(newHistBuyRecord.name);
                              buyList.removeEntry(buyRecord.name);
                              sellRecord.set('amount', diff);
                            }
                          }
                        }
                      });
                    });
                  });
                });
              });
            });
          }
        });
      }
    });
  });
};

// Define the sell method
const sell = (connect, data, openBuy, openSell, transactionHistory) => {
  // Creates unique ID
  let unique = connect.getUid();
  // Creates a new sell record
  const sell = connect.record.getRecord(`open/${unique}`);
  sell.whenReady((record) => {
    record.set({
      userID: data.userID,
      amount: +data.amount,
      price: +data.price,
      currency: data.currency,
      type: 'sell'
    }, err => {
      if (err) {
        console.log('Sell record set with error:', err)
      } else {
        console.log('Sell record set without error');
        // Push record into open sell transactions
        openSell.whenReady((list) => {
          list.addEntry(`open/${unique}`);
          let entries = list.getEntries();

          let tempArr2 = [];

          for (let i = 0; i < entries.length; i++) {
            connect.record.getRecord(entries[i]).whenReady((record) => {
              let selling = record.get();
              selling.name = record.name;
              tempArr2.push(selling);
            });
          }
          tempArr2 = _.sortBy(tempArr2, [function(rec){ return +rec.price; }]);
          _.forEach(entries, (entry) => {
            list.removeEntry(entry);
          });

          _.forEach(tempArr2, (rec) => {
            list.addEntry(rec.name);
          });
        });
        // Check buy orders to fulfill open sell order
        openBuy.whenReady((buyList) => {
          // Get list of open buy orders
          let buyOrders = buyList.getEntries();
          var diff, noDuplicate = true, maxDemand = true;
          for (let n = 0; n < buyOrders.length; n++) {
            // Create new transaction history records
            let newBuyHist = connect.record.getRecord(`closed/${connect.getUid()}`);
            let newSellHist = connect.record.getRecord(`closed/${connect.getUid()}`);
            connect.record.getRecord(buyOrders[n]).whenReady((buyRecord) => {
              transactionHistory.whenReady((transHist) => {
                openSell.whenReady((sellList) => {
                  sell.whenReady((sellRecord) => {
                    newBuyHist.whenReady((newHistBuyRecord) => {
                      newSellHist.whenReady((newHistSellRecord) => {
                        if (sellRecord.get() && sellRecord.get('amount') && (sellRecord.get('price') <= buyRecord.get('price')) && noDuplicate) {
                          console.log('pre if', sellRecord.get('price'), buyRecord.get('price'), (sellRecord.get('price') <= buyRecord.get('price')));
                          if (buyRecord.get('amount') == sellRecord.get('amount')) {
                            // Supply == Demand
                            console.log('sell amount = buy amount');
                            sellRecord.set('amount', sellRecord.get('amount'));
                            buyRecord.set('amount', buyRecord.get('amount'));
                            newHistBuyRecord.set({
                              userID: buyRecord.get('userID'),
                              price: buyRecord.get('price'),
                              currency: buyRecord.get('currency'),
                              type: 'buy',
                              amount: buyRecord.get('amount'),
                              from: sellRecord.name,
                              originalId: buyRecord.name
                            }, err => {
                              if (err) {
                                console.log('buy', err);
                              }
                            });
                            newHistSellRecord.set({
                              userID: sellRecord.get('userID'),
                              price: buyRecord.get('price'),
                              currency: sellRecord.get('currency'),
                              type: 'sell',
                              amount: buyRecord.get('amount'),
                              to: buyRecord.name,
                              originalId: sellRecord.name
                            }, err => {
                              if (err) {
                                console.log('sell', err);
                              }
                            });
                            buyList.removeEntry(buyRecord.name);
                            sellList.removeEntry(sellRecord.name);
                            transHist.addEntry(newHistSellRecord.name);
                            transHist.addEntry(newHistBuyRecord.name);
                            noDuplicate = false;
                          } else if (buyRecord.get('amount') < sellRecord.get('amount')) {
                            // Supply < Demand
                            diff = sellRecord.get('amount') - buyRecord.get('amount');
                            if (diff > 0) {
                              console.log('if amount supply < demand && diff > 0', diff);
                              console.log('sellrecord: ', sellRecord.name, sellRecord.get());
                              console.log('buyrecord: ', buyRecord.name, buyRecord.get());
                              // Setting new history records
                              newHistBuyRecord.set({
                                userID: buyRecord.get('userID'),
                                price: buyRecord.get('price'),
                                currency: buyRecord.get('currency'),
                                type: 'buy',
                                amount: buyRecord.get('amount'),
                                from: sellRecord.name,
                                originalId: buyRecord.name
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                } else {
                                  console.log('setting new buy', newHistBuyRecord.name);
                                  transHist.addEntry(newHistBuyRecord.name);
                                }
                              });
                              newHistSellRecord.set({
                                userID: sellRecord.get('userID'),
                                price: buyRecord.get('price'),
                                currency: sellRecord.get('currency'),
                                type: 'sell',
                                amount: buyRecord.get('amount'),
                                to: buyRecord.name,
                                originalId: sellRecord.name
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                } else {
                                  transHist.addEntry(newHistSellRecord.name);
                                }
                              });
                              buyList.removeEntry(buyRecord.name);
                              sellRecord.set('amount', diff);
                            }
                          } else if ((buyRecord.get('amount') > sellRecord.get('amount'))) {
                            // Supply > Demand
                            diff = buyRecord.get('amount') - sellRecord.get('amount');
                            if (diff > 0) {
                              console.log('if amount supply > demand && diff > 0', diff);
                              newHistBuyRecord.set({
                                userID: buyRecord.get('userID'),
                                price: buyRecord.get('price'),
                                currency: buyRecord.get('currency'),
                                type: 'buy',
                                amount: sellRecord.get('amount'),
                                from: sellRecord.name,
                                originalId: buyRecord.name
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                }
                              });
                              newHistSellRecord.set({
                                userID: sellRecord.get('userID'),
                                price: buyRecord.get('price'),
                                currency: sellRecord.get('currency'),
                                type: 'sell',
                                amount: sellRecord.get('amount'),
                                to: buyRecord.name,
                                originalId: sellRecord.name
                              }, err => {
                                if (err) {
                                  console.log('sell', err);
                                }
                              });
                              transHist.addEntry(newHistSellRecord.name);
                              transHist.addEntry(newHistBuyRecord.name);
                              sellList.removeEntry(sellRecord.name);
                              buyRecord.set('amount', diff);
                            }
                          }
                        }
                      });
                    });
                  });
                });
              });
            });
          }
        });
      }
    });
  });
};

module.exports = {
  initTransactionBuy: initTransactionBuy,
  initTransactionSell: initTransactionSell,
  buy: buy,
  sell: sell
}
