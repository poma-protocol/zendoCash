import { Alchemy } from "alchemy-sdk";
import { DealsModel } from "../src/model/deals.js";
import { SmartContract } from "../src/smartContract/class.js";
import { DealsController } from "../src/controller/deals.js"
import Web3 from "web3";

export const smartContractMock = {
    web3: {} as Web3,
    alchemy: {} as Alchemy,
    isValidAddress: jest.fn(),
    createDeal: jest.fn(),
    doesUserHaveBalance: jest.fn(),
    join: jest.fn(),
    markDealEnded: jest.fn(),
    updateCount: jest.fn(),
    getAccount: jest.fn(),
    activate: jest.fn(),
    verifyActivateTransaction: jest.fn()
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
    hasActivationTransactionBeenUsed: jest.fn()
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
    updateCount: jest.fn()
} as DealsController