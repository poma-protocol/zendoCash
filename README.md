# Zendocash
Zendocash is a system that incentivizes coin holders to hold specific tokens by rewarding them for holding a specific amount of tokens over a given period of time.

## Backend Documentation
The backend is an ExpressJS REST API server and a cron job worker. The backend has access to an Arbitrum account that it uses to interact with the smart contract.

### REST API
The REST API has routes for doing the following:

#### Creating Deals
This route accepts requests from our frontend for creating a deal. The function that handles creating deals is found [here](https://github.com/poma-protocol/zendoCash/blob/995614dee78eaaa9b50309f57b0ab84dc3ec7085/backend/src/controller/deals.ts#L85-L129) . The following happens when creating a deal:

1. The joining period is validated (the joining period must start at least today and end on another day in the future)
2. Verify that the address of the coin and the deal creator are valid using Web3JS validator functions
3. The backend creates the deals in the smart contract
4. The deal is stored in our database.

#### Joining Deal
This route allows a user to join a deal. The function that handles it is found [here](https://github.com/poma-protocol/zendoCash/blob/995614dee78eaaa9b50309f57b0ab84dc3ec7085/backend/src/controller/deals.ts#L279-L323). The function does the following:

1. Checks if the address of the user is valid using Web3JS validation tools
2. Check if the deal exists and that it has been activated
3. Checks if the user has already joined the deal
4. The backend sends a transaction joining the user to the deal
5. The backend stores users details

#### Activating Deal
This route activates a deal. A user can only join a deal that has been activated and only activated deals are processed by the worker. The route accepts the transaction hash of the transaction that locks the deal's reward in the smartcontract. It also checks if the commission for the deal has already been paid. The function is described [here](https://github.com/poma-protocol/zendoCash/blob/995614dee78eaaa9b50309f57b0ab84dc3ec7085/backend/src/controller/deals.ts#L194-L251)

#### Fetching deals
There are multiple routes for fetching the featured deals for the platform, deals to show in the explore page, deals that have been created by a user and deals that a user has joined.

### Worker
The worker is responsible for checking the coin balances of all users that have joined deals and updating the count of how many days they've held a coin. This worker runs every hour. It is implemented [here](backend/src/listener/main.ts). It does the following:

1. Fetches all active deals
2. Checks if deal has ended, if it has the backend sends a transaction to the smartcontract indicating that deal has ended and remaining rewards are sent back to deal creator.
3. For each player in the deal
4. Cheks if the user has maintained coin balance
5. If player doesn't have coin balance their count is reset
6. Otherwise count is incremeneted
7. If count has reached the number of days to hold coin for the backend sends a transaction to the smartcontract indicating that user has met goal of deal
8. The backend sends the user reward
