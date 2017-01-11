const path = require('path');
const port = 3002;
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
  const runTest = require('../test/run-tests.js');


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
// runTest(openBuy, openSell, transactionHistory, connect);

/** Invoke Event Listeners **/
events.initTransactionBuy(connect, openBuy, openSell, transactionHistory);
events.initTransactionSell(connect, openBuy, openSell, transactionHistory);
