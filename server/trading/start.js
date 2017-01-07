const _ = require('lodash');

/** Create OPEN and TRANSACTION HISTORY lists **/
// // Open Buy Orders
// let openBuy = connect.record.getList('openBuy');
// // Buy Transaction History
// // let histBuy = connect.record.getList('histBuy');
// // Open Sell Orders
// let openSell = connect.record.getList('openSell');
// // Sell Transaction History
// // let histSell = connect.record.getList('histSell');
// // Transaction History
// let transactionHistory = connect.record.getList('transactionHistory');


/** Delete both transaction histories **/
// transactionHistory.whenReady((hist1) => {
//   hist1.delete();
// });
// openBuy.whenReady((hist1) => {
//   hist1.delete();
// });
// openSell.whenReady((hist1) => {
//   hist1.delete();
// });


/** Create test open sell list **/
// openSell.whenReady((newList) => {
//   for (let h = 0; h < 2; h++) {
//     let unique = connect.getUid();
//     let newSellRecord = connect.record.getRecord(`transaction/sell/open/${unique}`);
//     newSellRecord.whenReady((newRec) => {
//       newRec.set({
//         sell: {
//           amount: Math.ceil(Math.random()*10),
//           price: Math.ceil(Math.random()*100)
//         }
//       }, err => {
//         if (err) {
//           console.log('Sell record set with error:', err)
//         } else {
//           console.log('Sell record set without error:');
//           newList.addEntry(`transaction/sell/open/${unique}`);
//         }
//       });
//     });
//   }
// });

/** Create test open buy list **/
// openBuy.whenReady((newList) => {
//   let random = 20;
//   for (let h = 0; h < 6; h++) {
//     let unique = connect.getUid();
//     let newBuyRecord = connect.record.getRecord(`transaction/buy/open/${unique}`);
//     newBuyRecord.whenReady((newRec) => {
//       newRec.set({
//         buy: {
//           amount: Math.ceil(Math.random()*10),
//           price: random--
//         }
//       }, err => {
//         if (err) {
//           console.log('Buy record set with error:', err)
//         } else {
//           console.log('Buy record set without error:');
//           newList.addEntry(`transaction/buy/open/${unique}`);
//         }
//       });
//     });
//   }
// });

// Buy Transaction Listener
const initTransactionBuy = (connect) => {
  connect.event.subscribe('transactionBuy', (data) => {
    let options = {
      userID: data.userID,
      currency: data.currency
    };
    connect.event.emit('checkBalance', options);
    connect.event.subscribe('returnBalance', (balance) => {
      console.log('bal', balance, 'data', data)
      if (balance.balance >= data.amount * data.price) {
        buy(data);
      } else {
        console.log('NOT ENOUGH MONEY!');
      }
    });
  });
}

// Sell Transaction Listener
const initTransactionSell = (connect) => {
  connect.event.subscribe('transactionSell', (data) => {
    let options = {
      userID: data.userID,
      currency: data.currency
    };
    console.log('sell options', data);
    connect.event.emit('checkBalance', options);
    connect.event.subscribe('returnBalance', (balance) => {
        console.log('bal', balance.balance, 'amount', data.amount * data.price);
      if (balance.balance >= data.amount * data.price) {
        console.log('fire', data);
        sell(data);
      } else {
        console.log('NOT ENOUGH MONEY!');
      }
    });
  });
}

// Define the buy method
const buy = (data) => {
  /** Create OPEN and TRANSACTION HISTORY lists **/
  // Open Buy Orders
  let openBuy = connect.record.getList('openBuy');
  // Open Sell Orders
  let openSell = connect.record.getList('openSell');
  // Transaction History
  let transactionHistory = connect.record.getList('transactionHistory');
  // Creates unique ID
  let unique = connect.getUid();
  // Creates new buy record
  const buy = connect.record.getRecord(`transaction/open/${unique}`);
  buy.whenReady((record) => {
    record.set({
      buy: {
        userID: data.userID,
        amount: +data.amount,
        price: +data.price,
        currency: data.currency,
        type: 'buy'
      }
    }, err => {
      if (err) {
        console.log('Buy record set with error:', err)
      } else {
        console.log('Buy record set without error');
        // Push record into open buy transactions
        openBuy.whenReady((list) => {
          list.addEntry(`transaction/open/${unique}`);
          let entries = list.getEntries();
          let tempArr = [];

          for (let i = 0; i < entries.length; i++) {
            connect.record.getRecord(entries[i]).whenReady((record) => {
              let buying = record.get('buy');
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

          let entres = list.getEntries();
          for (let i = 0; i < entres.length; i++) {
            connect.record.getRecord(entres[i]).whenReady((reco) => {
              let pr = reco.get('buy');
            });
          }
        });

        // Check sell orders to fulfill open buy order
        openSell.whenReady((sellList) => {
          // Get array of open sell orders
          let sellOrders = sellList.getEntries();
          var diff, noDuplicate = true;
          for (let n = 0; n < sellOrders.length; n++) {
            // Create new Transaction History records
            let newBuyHist = connect.record.getRecord(`transaction/closed/${connect.getUid()}`);
            let newSellHist = connect.record.getRecord(`transaction/closed/${connect.getUid()}`);
            connect.record.getRecord(sellOrders[n]).whenReady((sellRecord) => {
              transactionHistory.whenReady((transHist) => {
                openBuy.whenReady((buyList) => {
                  buy.whenReady((buyRecord) => {
                    newBuyHist.whenReady((newHistBuyRecord) => {
                      newSellHist.whenReady((newHistSellRecord) => {
                        if (sellRecord.get('sell') && sellRecord.get('sell.amount') && (sellRecord.get('sell.price') <= buyRecord.get('buy.price')) && noDuplicate) {
                          if ((sellRecord.get('sell.amount') == buyRecord.get('buy.amount')) && noDuplicate) {
                            // Supply == Demand
                            console.log('sell amount = buy amount');
                            buyRecord.set('buy.amount', buyRecord.get('buy.amount'));
                            sellRecord.set('sell.amount', buyRecord.get('buy.amount'));
                            newHistBuyRecord.set({
                              hist: {
                                userID: buyRecord.get('buy.userID'),
                                price: sellRecord.get('sell.price'),
                                currency: buyRecord.get('buy.currency'),
                                type: 'buy',
                                bought: buyRecord.get('buy.amount'),
                                from: sellRecord.name,
                                originalId: buyRecord.name
                              }
                            }, err => {
                              if (err) {
                                console.log('buy', err);
                              }
                            });
                            newHistSellRecord.set({
                              hist: {
                                userID: sellRecord.get('sell.userID'),
                                price: sellRecord.get('sell.price'),
                                currency: sellRecord.get('sell.currency'),
                                type: 'sell',
                                sold: sellRecord.get('sell.amount'),
                                to: buyRecord.name,
                                originalId: sellRecord.name
                              }
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
                          } else if (sellRecord.get('sell.amount') < buyRecord.get('buy.amount')) {
                            // Supply < Demand
                            diff = buyRecord.get('buy.amount') - sellRecord.get('sell.amount');
                            if (diff > 0) {
                              console.log('if amount supply < demand && diff > 0', diff);
                              console.log('buyrecord: ', buyRecord.name, buyRecord.get('buy'));
                              console.log('sellrecord: ', sellRecord.name, sellRecord.get('sell'));
                              // Setting new history records
                              newHistBuyRecord.set({
                                hist: {
                                 userID: buyRecord.get('buy.userID'),
                                 price: sellRecord.get('sell.price'),
                                 currency: buyRecord.get('buy.currency'),
                                 type: 'buy',
                                 bought: sellRecord.get('sell.amount'),
                                 from: sellRecord.name,
                                 originalId: buyRecord.name
                                }
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                } else {
                                  console.log('setting new buy', newHistBuyRecord.name);
                                  transHist.addEntry(newHistBuyRecord.name);
                                }
                              });
                              newHistSellRecord.set({
                                hist: {
                                 userID: sellRecord.get('sell.userID'),
                                 price: sellRecord.get('sell.price'),
                                 currency: sellRecord.get('sell.currency'),
                                 type: 'sell',
                                 sold: sellRecord.get('sell.amount'),
                                 to: buyRecord.name,
                                 originalId: sellRecord.name
                                }
                              }, err => {
                                if (err) {
                                  console.log('sell', err);
                                } else {
                                  transHist.addEntry(newHistSellRecord.name);
                                }
                              });
                              sellList.removeEntry(sellRecord.name);
                              buyRecord.set('buy.amount', diff);
                            }
                          } else if (sellRecord.get('sell.amount') > buyRecord.get('buy.amount')){
                            // Supply > Demand
                            diff = sellRecord.get('sell.amount') - buyRecord.get('buy.amount');
                            if (diff > 0) {
                              console.log('if amount supply > demand && diff > 0', diff);
                              newHistBuyRecord.set({
                                hist: {
                                  userID: buyRecord.get('buy.userID'),
                                  price: sellRecord.get('sell.price'),
                                  currency: buyRecord.get('buy.currency'),
                                  type: 'buy',
                                  bought: buyRecord.get('buy.amount'),
                                  from: sellRecord.name,
                                  originalId: buyRecord.name
                                }
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                }
                              });
                              newHistSellRecord.set({
                                hist: {
                                  userID: sellRecord.get('sell.userID'),
                                  price: sellRecord.get('sell.price'),
                                  currency: sellRecord.get('sell.currency'),
                                  type: 'sell',
                                  sold: buyRecord.get('buy.amount'),
                                  to: buyRecord.name,
                                  originalId: sellRecord.name
                                }
                              }, err => {
                                if (err) {
                                  console.log('sell', err);
                                }
                              });
                              // sellRecord.set('sell.amount', diff);
                              transHist.addEntry(newHistSellRecord.name);
                              transHist.addEntry(newHistBuyRecord.name);
                              buyList.removeEntry(buyRecord.name);
                              sellRecord.set('sell.amount', diff);
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
const sell = (data) => {
  /** Create OPEN and TRANSACTION HISTORY lists **/
  // Open Buy Orders
  let openBuy = connect.record.getList('openBuy');
  // Open Sell Orders
  let openSell = connect.record.getList('openSell');
  // Transaction History
  let transactionHistory = connect.record.getList('transactionHistory');
  // Creates unique ID
  let unique = connect.getUid();
  // Creates a new sell record
  const sell = connect.record.getRecord(`transaction/open/${unique}`);
  sell.whenReady((record) => {
    record.set({
      sell: {
        userID: data.userID,
        amount: +data.amount,
        price: +data.price,
        currency: data.currency,
        type: 'sell'
      }
    }, err => {
      if (err) {
        console.log('Sell record set with error:', err)
      } else {
        console.log('Sell record set without error');
        // Push record into open sell transactions
        openSell.whenReady((list) => {
          list.addEntry(`transaction/open/${unique}`);
          let entries = list.getEntries();

          let tempArr2 = [];

          for (let i = 0; i < entries.length; i++) {
            connect.record.getRecord(entries[i]).whenReady((record) => {
              let selling = record.get('sell');
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

          let entres = list.getEntries();
          console.log('list list', entres);
          for (let i = 0; i < entres.length; i++) {
            connect.record.getRecord(entres[i]).whenReady((reco) => {
              let pr = reco.get('sell');
              console.log('new list: ', pr, reco.name);
            });
          }
        });
        // Check buy orders to fulfill open sell order
        openBuy.whenReady((buyList) => {
          // Get list of open buy orders
          let buyOrders = buyList.getEntries();
          var diff, noDuplicate = true, maxDemand = true;
          for (let n = 0; n < buyOrders.length; n++) {
            // Create new transaction history records
            let newBuyHist = connect.record.getRecord(`transaction/buy/history/${connect.getUid()}`);
            let newSellHist = connect.record.getRecord(`transaction/sell/history/${connect.getUid()}`);
            connect.record.getRecord(buyOrders[n]).whenReady((buyRecord) => {
              transactionHistory.whenReady((transHist) => {
                openSell.whenReady((sellList) => {
                  sell.whenReady((sellRecord) => {
                    newBuyHist.whenReady((newHistBuyRecord) => {
                      newSellHist.whenReady((newHistSellRecord) => {
                        if (sellRecord.get('sell') && sellRecord.get('sell.amount') && (sellRecord.get('sell.price') <= buyRecord.get('buy.price')) && noDuplicate) {
                          console.log('pre if', sellRecord.get('sell.price'), buyRecord.get('buy.price'), (sellRecord.get('sell.price') <= buyRecord.get('buy.price')));
                          if (buyRecord.get('buy.amount') == sellRecord.get('sell.amount')) {
                            // Supply == Demand
                            console.log('sell amount = buy amount');
                            sellRecord.set('sell.amount', sellRecord.get('sell.amount'));
                            buyRecord.set('buy.amount', buyRecord.get('buy.amount'));
                            newHistBuyRecord.set({
                              hist: {
                                userID: buyRecord.get('buy.userID'),
                                price: buyRecord.get('buy.price'),
                                currency: buyRecord.get('buy.currency'),
                                type: 'buy',
                                bought: buyRecord.get('buy.amount'),
                                from: sellRecord.name,
                                originalId: buyRecord.name
                              }
                            }, err => {
                              if (err) {
                                console.log('buy', err);
                              }
                            });
                            newHistSellRecord.set({
                              hist: {
                                userID: sellRecord.get('sell.userID'),
                                price: buyRecord.get('buy.price'),
                                currency: sellRecord.get('sell.currency'),
                                type: 'sell',
                                sold: buyRecord.get('buy.amount'),
                                to: buyRecord.name,
                                originalId: sellRecord.name
                              }
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
                          } else if (buyRecord.get('buy.amount') < sellRecord.get('sell.amount')) {
                            // Supply < Demand
                            diff = sellRecord.get('sell.amount') - buyRecord.get('buy.amount');
                            if (diff > 0) {
                              console.log('if amount supply < demand && diff > 0', diff);
                              console.log('sellrecord: ', sellRecord.name, sellRecord.get('sell'));
                              console.log('buyrecord: ', buyRecord.name, buyRecord.get('buy'));
                              // Setting new history records
                              newHistBuyRecord.set({
                                hist: {
                                 userID: buyRecord.get('buy.userID'),
                                 price: buyRecord.get('buy.price'),
                                 currency: buyRecord.get('buy.currency'),
                                 type: 'buy',
                                 bought: buyRecord.get('buy.amount'),
                                 from: sellRecord.name,
                                 originalId: buyRecord.name
                                }
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                } else {
                                  console.log('setting new buy', newHistBuyRecord.name);
                                  transHist.addEntry(newHistBuyRecord.name);
                                }
                              });
                              newHistSellRecord.set({
                                hist: {
                                 userID: sellRecord.get('sell.userID'),
                                 price: buyRecord.get('buy.price'),
                                 currency: sellRecord.get('sell.currency'),
                                 type: 'sell',
                                 sold: buyRecord.get('buy.amount'),
                                 to: buyRecord.name,
                                 originalId: sellRecord.name
                                }
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                } else {
                                  transHist.addEntry(newHistSellRecord.name);
                                }
                              });
                              buyList.removeEntry(buyRecord.name);
                              sellRecord.set('sell.amount', diff);
                            }
                          } else if ((buyRecord.get('buy.amount') > sellRecord.get('sell.amount'))) {
                            // Supply > Demand
                            diff = buyRecord.get('buy.amount') - sellRecord.get('sell.amount');
                            if (diff > 0) {
                              console.log('if amount supply > demand && diff > 0', diff);
                              newHistBuyRecord.set({
                                hist: {
                                  userID: buyRecord.get('buy.userID'),
                                  price: buyRecord.get('buy.price'),
                                  currency: buyRecord.get('buy.currency'),
                                  type: 'buy',
                                  bought: sellRecord.get('sell.amount'),
                                  from: sellRecord.name,
                                  originalId: buyRecord.name
                                }
                              }, err => {
                                if (err) {
                                  console.log('buy', err);
                                }
                              });
                              newHistSellRecord.set({
                                hist: {
                                  userID: sellRecord.get('sell.userID'),
                                  price: buyRecord.get('buy.price'),
                                  currency: sellRecord.get('sell.currency'),
                                  type: 'sell',
                                  sold: sellRecord.get('sell.amount'),
                                  to: buyRecord.name,
                                  originalId: sellRecord.name
                                }
                              }, err => {
                                if (err) {
                                  console.log('sell', err);
                                }
                              });
                              // buyRecord.set('sell.amount', diff);
                              transHist.addEntry(newHistSellRecord.name);
                              transHist.addEntry(newHistBuyRecord.name);
                              sellList.removeEntry(sellRecord.name);
                              buyRecord.set('buy.amount', diff);
                              // maxDemand = false;
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



/** Test **/
// Open Buy Orders
// openBuy.whenReady((list) => {
//   // console.log('buy', list.getEntries());
//   var entries = list.getEntries();
//
//   for (var i = 0; i < entries.length; i++) {
//     connect.record.getRecord(entries[i]).whenReady((record) => {
//       // console.log('FJLEJLKJF', record);
//       let price = record.get('buy');
//       console.log('buy list: ', price, record.name);
//       // record.set('buy.amount', '423');
//     });
//   }
// });
//
// // Open Sell Orders
// openSell.whenReady((list) => {
//   // console.log('sell', list.getEntries());
//   const entries = list.getEntries();
//   // var prices = [];
//   for (var i = 0; i < entries.length; i++) {
//     connect.record.getRecord(entries[i]).whenReady((record) => {
//       // console.log('FJLEJLKJF', record);
//       let price = record.get('sell');
//       console.log('sell list: ', price, record.name);
//       // console.log('sell price: ', record.get('price'));
//     });
//   }
//   // console.log('sell array: ', prices);
// });
//
// // Transaction History Buy Orders
// transactionHistory.whenReady((list) => {
//   console.log('hist', list.getEntries());
//   var entries = list.getEntries();
//
//   for (var i = 0; i < entries.length; i++) {
//     connect.record.getRecord(entries[i]).whenReady((record) => {
//       // console.log('FJLEJLKJF', record);
//       let price = record.get('hist');
//       console.log('history: ', price);
//       // record.set('buy.amount', '423');
//     });
//   }
// });

module.exports = {
  initTransactionBuy: initTransactionBuy,
  initTransactionSell: initTransactionSell
}
