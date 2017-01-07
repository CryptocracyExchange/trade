const path = require('path');
const port = 3002;
const deepstream = require('deepstream.io-client-js');
const connect = deepstream('localhost:6020').login();
const events = require('./trading/start.js');


if (process.env.NODE_ENV === 'dev') {
  const express = require('express');
  const app = express();
  const path = require('path');
  const port = 3002;

  app.use(express.static(path.join(__dirname, '../client')));

  app.listen(port);
  console.log(`Listening on ${port}`);
}

// client.rpc.provide( 'add-two-numbers', ( data, response ) => {
//     response.send( data.numA + data.numB );
// });
events.initTransactionBuy(connect);
events.initTransactionSell(connect);
