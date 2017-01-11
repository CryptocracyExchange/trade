const colors = require('colors/safe');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

module.exports = function(b, s, t, connect) {
  const createList = (x, type, num, user) => {
    x.whenReady((newList) => {
      for (let h = 0; h < num; h++) {
        let unique = connect.getUid();
        let newRecord = connect.record.getRecord(`open/${unique}`);
        newRecord.whenReady((newRec) => {
          newRec.set({
              amount: Math.ceil(Math.random()*10),
              price: Math.ceil(Math.random()*100),
              userID: user,
              currency: 'BTC',
              type: type
          }, err => {
            if (err) {
              console.log(`${type} record set with error:`, err)
            } else {
              console.log(`${type} record set without error`);
              newList.addEntry(`open/${unique}`);
            }
          });
        });
      }
    });
  };

  const dispList = (x, type, color) => {
    x.whenReady((list) => {
      // console.log('buy', list.getEntries());
      var entries = list.getEntries();

      for (var i = 0; i < entries.length; i++) {
        connect.record.getRecord(entries[i]).whenReady((record) => {
          // console.log('FJLEJLKJF', record);
          let price = record.get();
          console.log(color(`${type} list: ${record.name}`), price);
          // record.set('buy.amount', '423');
        });
      }
    });
  };

  const del = (x) => {
    x.whenReady((hist1) => {
      hist1.delete();
    });
  };


  /** TEST **/

  // createList(b, 'buy', 5, 'harry');
  // createList(s, 'sell', 5, 'nick');

  dispList(b, 'buy', colors.info);
  dispList(s, 'sell', colors.warn);
  dispList(t, 'transactions', colors.silly);

  // /** Delete both transaction histories **/

  // del(t);
  // del(b);
  // del(s);

  /** END TEST **/
};
