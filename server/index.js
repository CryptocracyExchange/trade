const path = require('path');
const port = 3002;
const runTest = require('./run-tests.js');
const deepstream = require('deepstream.io-client-js');
const deepstreamServer = process.env.NODE_ENV === 'prod' ? 'deepstream' : 'localhost';
const auth = process.env.NODE_ENV === 'prod' ? {
  role: process.env.DEEPSTREAM_AUTH_ROLE,
  username: process.env.DEEPSTREAM_AUTH_USERNAME,
  password: process.env.DEEPSTREAM_AUTH_PASSWORD } : {};

const connect = deepstream(`${deepstreamServer}:6020`).login(auth);
const events = require('./trading/start.js');

// Dev dependencies
if (process.env.NODE_ENV === 'dev') {
  const express = require('express');
  const app = express();
  const path = require('path');
  const port = 3002;

  app.use(express.static(path.join(__dirname, '../client')));

  app.listen(port);
  console.log(`Listening on ${port}`);
}

/** Create OPEN and TRANSACTION HISTORY lists **/

// Open Buy Orders
let openBuy = connect.record.getList('openBuy');
// Open Sell Orders
let openSell = connect.record.getList('openSell');
// Transaction History
let transactionHistory = connect.record.getList('transactionHistory');

// Run sample tests
runTest(openBuy, openSell, transactionHistory, connect);

// const newItem1 = connect.record.getRecord('shoes/air');
// const newItem2 = connect.record.getRecord('shoes/classics');
// const newItem3 = connect.record.getRecord('shoes/liga');
//
// newItem1.whenReady((item1) => {
//   newItem2.whenReady((item2) => {
//     newItem3.whenReady((item3) => {
//       item1.set({color: 'red', brand: 'Nike', price: 100});
//       item2.set({color: 'white', brand: 'Reebok', price: 90});
//       item3.set({color: 'green', brand: 'Puma', price: 110});
//     });
//   });
// });


// const priceString = JSON.stringify({
//   table: 'shoes',
//   query: [
//     [ 'price', 'ne', '90' ]
//   ]
// });
// // setTimeout(function(){
//   connect.record.getList('search?' + priceString).whenReady(function(list) {
//     console.log(list.getEntries());
//   });
// }, 2000);


// setTimeout(function() {
//   console.log(`search?${priceString}`)
//   var results = connect.record.getList('search?' + priceString);
//   console.log('hello', results.getEntries());
//   // priceString.delete();
// }, 1000);


/** Invoke Event Listeners **/
events.initTransactionBuy(connect, openBuy, openSell, transactionHistory);
events.initTransactionSell(connect, openBuy, openSell, transactionHistory);

// newItem1.whenReady((item1) => {
//   newItem2.whenReady((item2) => {
//     newItem3.whenReady((item3) => {
//       console.log('newItem1', item1.get());
//       console.log('newItem2', item2.get());
//       console.log('newItem3', item3.get());
//     });
//   });
// });

// connect.record.getList('search?' + priceString).delete();
