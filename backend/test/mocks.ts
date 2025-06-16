import { Alchemy } from "alchemy-sdk";
import { DealsModel } from "../src/model/deals.js";
import { SmartContract } from "../src/smartContract/class.js";

export const smartContractMock = {
    alchemy: {} as Alchemy,
    isValidAddress: jest.fn(),
    createDeal: jest.fn(),
    doesUserHaveBalance: jest.fn(),
    join: jest.fn()
} as SmartContract

export const dealsModelMock = {
    storeDealInDBAndContract: jest.fn(),
    get: jest.fn(),
    getMany: jest.fn(),
    markDealActivatedInDB: jest.fn(),
    hasUserJoinedDeal: jest.fn(),
    updateDBAndContract: jest.fn()
} as DealsModel