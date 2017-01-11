## Transactions
[![CircleCI](https://circleci.com/gh/CryptocracyExchange/trade.svg?style=svg)](https://circleci.com/gh/CryptocracyExchange/trade)

# MVP

- Send open orders based on price in ordered set in rethinkDB as each value is an array consisting of order objects X
- Fulfill existing open orders with new orders that match transaction criteria X
- Allow for partial order transactions to be fulfilled X
- When an order is fulfilled, new closed transaction records are created for that order X

# Post-MVP

- Check balance before transaction (UserID and currency type) X
- Check if the order is market or limit. Buy or sell.
- Merge openBuy and openSell into openMarket
- Check available/actual balance and update appropriately
- Add exchange rates based on market value
- Make sure transactions happen cross-currency and never on the same currency (i.e. BTC:BTC)
- Add userID and currency in each transaction X
- Merge HistSell and HistBuy into TransactionHistory X
- Write tests for scaling

# Edge Cases
