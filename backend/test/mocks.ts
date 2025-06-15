import { DealsModel } from "../src/model/deals.js";
import { SmartContract } from "../src/smartContract/class.js";

export const smartContractMock = {
    isValidAddress: jest.fn(),
    createDeal: jest.fn()
} as SmartContract

export const dealsModelMock = {
    storeDealInDBAndContract: jest.fn()
} as DealsModel