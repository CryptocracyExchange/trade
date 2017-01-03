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

// Define the buy method
module.exports.buy = () => {
  connect.event.subscribe('transaction/buy', (data) => {
    // Creates unique ID
    let unique = connect.getUid();
    // Creates new buy record
    const buy = connect.record.getRecord(`transaction/buy/${unique}`);

    buy.whenReady((record) => {
      record.set({
        buy: {
          amount: data.amount,
          price: data.price
        }
      }, err => {
        if (err) {
          console.log('Buy record set with error:', err)
        } else {
          console.log('Buy record set without error');
          // Push record into open buy transactions
          openBuy.whenReady((list) => {
            list.addEntry(`transaction/buy/${unique}`);
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
            console.log('list list', entres);
            for (let i = 0; i < entres.length; i++) {
              connect.record.getRecord(entres[i]).whenReady((reco) => {
                let pr = reco.get('buy');
                console.log('new list: ', pr, reco.name);
              });
            }
          });
        }
      });
      // Check sell orders to fulfill open buy order
      openSell.whenReady((sellList) => {
        let sellOrders = sellList.getEntries();
        // console.log(sellOrders);
        for (let n = 0; n < sellOrders.length; n++) {
          connect.record.getRecord(sellOrders[i]).whenReady((recon) => {
            let sellRecord = recon.get('sell');
            if (sellRecord.price <= data.price) {
              
            }
          });
        }
      });
    });
  });
};

// Define the sell method
module.exports.sell = () => {
  connect.event.subscribe('transaction/sell', (data) => {
    // Creates unique ID
    let unique = connect.getUid();
    // Creates a new sell record
    const sell = connect.record.getRecord(`transaction/sell/${unique}`);
    sell.whenReady((record) => {
      record.set({
        sell: {
          amount: data.amount,
          price: data.price
        }
      }, err => {
        if (err) {
          console.log('Sell record set with error:', err)
        } else {
          console.log('Sell record set without error');
          // Push record into open sell transactions
          openSell.whenReady((list) => {
            list.addEntry(`transaction/sell/${unique}`);
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
        }
      });
    });
  });
};

// Test
openBuy.whenReady((list) => {
  console.log('buy', list.getEntries());
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

openSell.whenReady((list) => {
  console.log('sell', list.getEntries());
  const entries = list.getEntries();
  var prices = [];
  for (var i = 0; i < entries.length; i++) {

    connect.record.getRecord(entries[i]).whenReady((record) => {
      // console.log('FJLEJLKJF', record);
      let price = record.get('sell');
      console.log('sell list: ', price);
      // console.log('sell price: ', record.get('price'));
    });
  }
  // console.log('sell array: ', prices);

});
