module.exports = function(b, s, t, connect) {
  /** TEST **/

  /** Create test open sell list **/
  // s.whenReady((newList) => {
  //   for (let h = 0; h < 2; h++) {
  //     let unique = connect.getUid();
  //     let newSellRecord = connect.record.getRecord(`transaction/sell/open/${unique}`);
  //     newSellRecord.whenReady((newRec) => {
  //       newRec.set({
  //           amount: Math.ceil(Math.random()*10),
  //           price: Math.ceil(Math.random()*100)
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
  // b.whenReady((newList) => {
  //   let random = 20;
  //   for (let h = 0; h < 6; h++) {
  //     let unique = connect.getUid();
  //     let newBuyRecord = connect.record.getRecord(`transaction/buy/open/${unique}`);
  //     newBuyRecord.whenReady((newRec) => {
  //       newRec.set({
  //           amount: Math.ceil(Math.random()*10),
  //           price: random--
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

  // Open Buy Orders
  b.whenReady((list) => {
    // console.log('buy', list.getEntries());
    var entries = list.getEntries();

    for (var i = 0; i < entries.length; i++) {
      connect.record.getRecord(entries[i]).whenReady((record) => {
        // console.log('FJLEJLKJF', record);
        let price = record.get();
        console.log('buy list: ', price, record.name);
        // record.set('buy.amount', '423');
      });
    }
  });

  // Open Sell Orders
  s.whenReady((list) => {
    // console.log('sell', list.getEntries());
    const entries = list.getEntries();
    // var prices = [];
    for (var i = 0; i < entries.length; i++) {
      connect.record.getRecord(entries[i]).whenReady((record) => {
        // console.log('FJLEJLKJF', record);
        let price = record.get();
        console.log('sell list: ', price, record.name);
        // console.log('sell price: ', record.get('price'));
      });
    }
    // console.log('sell array: ', prices);
  });

  // Transaction History Buy Orders
  t.whenReady((list) => {
    console.log('hist', list.getEntries());
    var entries = list.getEntries();

    for (var i = 0; i < entries.length; i++) {
      connect.record.getRecord(entries[i]).whenReady((record) => {
        // console.log('FJLEJLKJF', record);
        let price = record.get();
        console.log('transaction history: ', price);
        // record.set('buy.amount', '423');
      });
    }
  });

  // /** Delete both transaction histories **/
  // t.whenReady((hist1) => {
  //   hist1.delete();
  // });
  // b.whenReady((hist1) => {
  //   hist1.delete();
  // });
  // s.whenReady((hist1) => {
  //   hist1.delete();
  // });

  /** END OF TEST **/
};
