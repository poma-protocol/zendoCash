import { DealsModel } from "../src/model/deals.js";
import { SmartContract } from "../src/smartContract/class.js";

export const smartContractMock = {
    isValidAddress: jest.fn(),
    createDeal: jest.fn()
} as SmartContract

export const dealsModelMock = {
    storeDealInDBAndContract: jest.fn(),
    get: jest.fn(),
    getMany: jest.fn(),
    markDealActivatedInDB: jest.fn()
} as DealsModel