const express = require('express');
const app = express();
const events = require('./trading/start.js');
const path = require('path');
const port = 3000;

app.use(express.static(path.join(__dirname, '../client')));

app.listen(port);
console.log(`Listening on ${port}`);

// client.rpc.provide( 'add-two-numbers', ( data, response ) => {
//     response.send( data.numA + data.numB );
// });
events.initTransactionBuy();
events.initTransactionSell();
