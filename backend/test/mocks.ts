import { DealsModel } from "../src/model/deals.js";
import { SmartContract } from "../src/smartContract/class.js";
import { DealsController } from "../src/controller/deals.js"

export const smartContractMock = {
    getAlchemy: jest.fn(),
    getRPCURL: jest.fn(),
    getWeb3: jest.fn(),
    isValidAddress: jest.fn(),
    createDeal: jest.fn(),
    doesUserHaveBalance: jest.fn(),
    join: jest.fn(),
    markDealEnded: jest.fn(),
    updateCount: jest.fn(),
    getAccount: jest.fn(),
    activate: jest.fn(),
    getTokenPrice: jest.fn(),
    getTokenDetails: jest.fn(),
    getAPIKey: jest.fn()
} as SmartContract

export const dealsModelMock = {
    storeDealInDBAndContract: jest.fn(),
    get: jest.fn(),
    getMany: jest.fn(),
    markDealActivatedInDB: jest.fn(),
    hasUserJoinedDeal: jest.fn(),
    updateDBAndContractOnJoin: jest.fn(),
    markDealEnded: jest.fn(),
    resetCount: jest.fn(),
    hasActivationTransactionBeenUsed: jest.fn(),
    hasCommissinTransactionBeenUsed: jest.fn(),
    markCommissionPaid: jest.fn(),
    activeDeals: jest.fn()
} as DealsModel

export const dealsControllerMock = {
    get: jest.fn(),
    getMany: jest.fn(),
    mainFunctionDeals: jest.fn(),
    markAsActivated: jest.fn(),
    join: jest.fn(),
    create: jest.fn(),
    markEnded: jest.fn(),
    resetCount: jest.fn(),
    storeCommission: jest.fn(),
    updateCount: jest.fn(),
    numActiveDeals: jest.fn()
} as DealsController