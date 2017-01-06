const deepstream = require('deepstream.io-client-js');
const connect = deepstream('localhost:6020').login();
const _ = require('lodash');


/** Create OPEN and TRANSACTION HISTORY lists **/

// Open Buy Orders
let openBuy = connect.record.getList('openBuy');
// Buy Transaction History
let histBuy = connect.record.getList('histBuy');
// Open Sell Orders
let openSell = connect.record.getList('openSell');
// Sell Transaction History
let histSell = connect.record.getList('histSell');

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

// Balancer Listener
const initTransactionBuy = () => {
  connect.event.subscribe('transactionBuy', (data) => {
    let options = {
      userID: data.userID,
      currency: data.currency
    };
    connect.event.emit('checkBalance', options);
    connect.event.subscribe('returnBalance', (balance) => {
      if ((balance.userID === data.userID) && (balance.amount > data.amount)) {
        buy(data);
      } else {
        console.log('NOT ENOUGH MONEY!');
      }
    });
  });
}

const initTransactionSell = () => {
  connect.event.subscribe('transactionSell', (data) => {
    let options = {
      userID: data.userID,
      currency: data.currency
    };
    connect.event.emit('checkBalance', options);
    connect.event.subscribe('returnBalance', (balance) => {
      if ((balance.userID === data.userID) && (balance.amount > data.amount)) {
        sell(data);
      } else {
        console.log('NOT ENOUGH MONEY!');
      }
    });
  });
}

// Define the buy method
const buy = (data) => {
    // Creates unique ID
    let unique = connect.getUid();
    // Creates new buy record
    const buy = connect.record.getRecord(`transaction/buy/open/${unique}`);
    buy.whenReady((record) => {
      record.set({
        buy: {
          amount: +data.amount,
          price: +data.price
        }
      }, err => {
        if (err) {
          console.log('Buy record set with error:', err)
        } else {
          console.log('Buy record set without error');
          // Push record into open buy transactions
          openBuy.whenReady((list) => {
            list.addEntry(`transaction/buy/open/${unique}`);
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
            let buyOrders = sellList.getEntries();
            var diff, newSellRecord, noDuplicate = true;
            for (let n = 0; n < buyOrders.length; n++) {
              let newBuyHist = connect.record.getRecord(`transaction/buy/history/${connect.getUid()}`);
              let newSellHist = connect.record.getRecord(`transaction/sell/history/${connect.getUid()}`);
              connect.record.getRecord(buyOrders[n]).whenReady((sellRecord) => {
                newSellRecord = sellRecord;
                histBuy.whenReady((histBuyList) => {
                  openBuy.whenReady((buyList) => {
                    histSell.whenReady((histSellList) => {
                      buy.whenReady((buyRecord) => {
                        // let amount = buyRecord.get('buy.amount');
                        // let pricing = buyRecord.get('buy.price');
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
                                    price: sellRecord.get('sell.price'),
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
                                    price: sellRecord.get('sell.price'),
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
                                histSellList.addEntry(newHistSellRecord.name);
                                histBuyList.addEntry(newHistBuyRecord.name);
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
                                     price: sellRecord.get('sell.price'),
                                     bought: sellRecord.get('sell.amount'),
                                     from: sellRecord.name,
                                     originalId: buyRecord.name
                                    }
                                  }, err => {
                                    if (err) {
                                      console.log('buy', err);
                                    } else {
                                      console.log('setting new buy', newHistBuyRecord.name);
                                      histBuyList.addEntry(newHistBuyRecord.name);
                                    }
                                  });
                                  newHistSellRecord.set({
                                    hist: {
                                     price: sellRecord.get('sell.price'),
                                     sold: sellRecord.get('sell.amount'),
                                     to: buyRecord.name,
                                     originalId: sellRecord.name
                                    }
                                  }, err => {
                                    if (err) {
                                      console.log('sell', err);
                                    } else {
                                      histSellList.addEntry(newHistSellRecord.name);
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
                                      price: sellRecord.get('sell.price'),
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
                                      price: sellRecord.get('sell.price'),
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
                                  histSellList.addEntry(newHistSellRecord.name);
                                  histBuyList.addEntry(newHistBuyRecord.name);
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
              });
            }
          });
        }
      });
    });
};

// Define the sell method
const sell = () => {
  connect.event.subscribe('transactionSell', (data) => {
    // Creates unique ID
    let unique = connect.getUid();
    // Creates a new sell record
    const sell = connect.record.getRecord(`transaction/sell/open/${unique}`);
    sell.whenReady((record) => {
      record.set({
        sell: {
          amount: +data.amount,
          price: +data.price,
        }
      }, err => {
        if (err) {
          console.log('Sell record set with error:', err)
        } else {
          console.log('Sell record set without error');
          // Push record into open sell transactions
          openSell.whenReady((list) => {
            list.addEntry(`transaction/sell/open/${unique}`);
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
            let buyOrders = buyList.getEntries();
            var diff, noDuplicate = true, maxDemand = true;
            for (let n = 0; n < buyOrders.length; n++) {
              let newBuyHist = connect.record.getRecord(`transaction/buy/history/${connect.getUid()}`);
              let newSellHist = connect.record.getRecord(`transaction/sell/history/${connect.getUid()}`);
              connect.record.getRecord(buyOrders[n]).whenReady((buyRecord) => {
                histBuy.whenReady((histBuyList) => {
                  openSell.whenReady((sellList) => {
                    histSell.whenReady((histSellList) => {
                      sell.whenReady((sellRecord) => {
                        newBuyHist.whenReady((newHistBuyRecord) => {
                          newSellHist.whenReady((newHistSellRecord) => {
                            if (sellRecord.get('sell') &&
                                sellRecord.get('sell.amount') &&
                                (sellRecord.get('sell.price') <= buyRecord.get('buy.price')) &&
                                noDuplicate
                                ) {
                              console.log('pre if', sellRecord.get('sell.price'), buyRecord.get('buy.price'), (sellRecord.get('sell.price') <= buyRecord.get('buy.price')));
                              if (buyRecord.get('buy.amount') == sellRecord.get('sell.amount')) {
                                // Supply == Demand
                                console.log('sell amount = buy amount');
                                sellRecord.set('sell.amount', sellRecord.get('sell.amount'));
                                buyRecord.set('buy.amount', buyRecord.get('buy.amount'));
                                newHistBuyRecord.set({
                                  hist: {
                                    price: buyRecord.get('buy.price'),
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
                                    price: buyRecord.get('buy.price'),
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
                                histSellList.addEntry(newHistSellRecord.name);
                                histBuyList.addEntry(newHistBuyRecord.name);
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
                                     price: buyRecord.get('buy.price'),
                                     bought: buyRecord.get('buy.amount'),
                                     from: sellRecord.name,
                                     originalId: buyRecord.name
                                    }
                                  }, err => {
                                    if (err) {
                                      console.log('buy', err);
                                    } else {
                                      console.log('setting new buy', newHistBuyRecord.name);
                                      histBuyList.addEntry(newHistBuyRecord.name);
                                    }
                                  });
                                  newHistSellRecord.set({
                                    hist: {
                                     price: buyRecord.get('buy.price'),
                                     sold: buyRecord.get('buy.amount'),
                                     to: buyRecord.name,
                                     originalId: sellRecord.name
                                    }
                                  }, err => {
                                    if (err) {
                                      console.log('buy', err);
                                    } else {
                                      histSellList.addEntry(newHistSellRecord.name);
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
                                      price: buyRecord.get('buy.price'),
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
                                      price: buyRecord.get('buy.price'),
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
                                  histSellList.addEntry(newHistSellRecord.name);
                                  histBuyList.addEntry(newHistBuyRecord.name);
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
              });
            }
          });
        }
      });
    });
  });
};



/** Test **/
// Open Buy Orders
openBuy.whenReady((list) => {
  // console.log('buy', list.getEntries());
  var entries = list.getEntries();

  for (var i = 0; i < entries.length; i++) {
    connect.record.getRecord(entries[i]).whenReady((record) => {
      // console.log('FJLEJLKJF', record);
      let price = record.get('buy');
      console.log('buy list: ', price, record.name);
      // record.set('buy.amount', '423');
    });
  }
});

// Open Sell Orders
openSell.whenReady((list) => {
  // console.log('sell', list.getEntries());
  const entries = list.getEntries();
  // var prices = [];
  for (var i = 0; i < entries.length; i++) {
    connect.record.getRecord(entries[i]).whenReady((record) => {
      // console.log('FJLEJLKJF', record);
      let price = record.get('sell');
      console.log('sell list: ', price, record.name);
      // console.log('sell price: ', record.get('price'));
    });
  }
  // console.log('sell array: ', prices);
});

// Transaction History Buy Orders
histBuy.whenReady((list) => {
  // console.log('histBuy', list.getEntries());
  var entries = list.getEntries();

  for (var i = 0; i < entries.length; i++) {
    connect.record.getRecord(entries[i]).whenReady((record) => {
      // console.log('FJLEJLKJF', record);
      let price = record.get('hist');
      console.log('buy history: ', price);
      // record.set('buy.amount', '423');
    });
  }
});

// Transaction History Sell Orders
histSell.whenReady((list) => {
  // console.log('histSell', list.getEntries());
  var entries = list.getEntries();

  for (var i = 0; i < entries.length; i++) {
    connect.record.getRecord(entries[i]).whenReady((record) => {
      // console.log('FJLEJLKJF', record);
      let price = record.get('hist');
      console.log('sell history: ', price);
      // record.set('buy.amount', '423');
    });
  }
});

module.exports = {
  initTransactionBuy: initTransactionBuy,
  initTransactionSell: initTransactionSell
}
