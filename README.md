## Transactions
[![CircleCI](https://circleci.com/gh/CryptocracyExchange/trade.svg?style=svg)](https://circleci.com/gh/CryptocracyExchange/trade)

# MVP

X Send open orders based on price in ordered set in rethinkDB as each value is an array consisting of order objects
X Fulfill existing open orders with new orders that match transaction criteria
X Allow for partial order transactions to be fulfilled
X When an order is fulfilled, new closed transaction records are created for that order.  

# Post-MVP

X Check balance before transaction (UserID and currency type)
- Check if the order is market or limit. Buy or sell.
- Marge openBuy and openSell into openMarket
- Add exchange rates before/after each transactions
X Add userID and currency in each transaction
X Merge HistSell and HistBuy into TransactionHistory
- Write tests for scaling

# Edge Cases
