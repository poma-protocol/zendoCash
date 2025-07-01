export enum Errors {
    ROUTE_NOT_FOUND="Route not found",
    INVALID_COIN_OWNER="Coin owner address is not valid",
    INVALID_CONTRACT_ADDRESS="Invalid contract address",
    INVALID_END_DATE="End date should be at least a day after start date",
    DEAL_DOES_NOT_EXIST="Deal does not exist",
    INVALID_ADDRESS="Invalid address",
    ALREADY_JOINED="User has already joined the deal",
    NOT_GET_MAIN_DEALS="Could not get deals for main function",
    INVALID_DATE="Start and end date must be at least today",
    INVALID_TRANSACTION_HASH="Transaction needs to have the correct reward amount sent and to the correct contract address",
    TRANSACTION_USED_BEFORE="Activation transaction has been used before",
    COIN_NOT_EXIST = "Coin does not exist",
    INTERNAL_SERVER_ERROR="Internal server error"
}