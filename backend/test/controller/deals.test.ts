import { DealsController } from "../../src/controller/deals"
import { Errors } from "../../src/errors/messages";
import { MyError } from "../../src/errors/type";
import { dealsModelMock, smartContractMock } from "../mocks";

describe("Deal Controller Tests", () => {
    describe("Create deal tests", () => {
        const invalidAddress = "invalid";
        const validAddress = "valid";

        const testDealController = new DealsController();
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const createdDealID = 100;

        const createArgs = {
            contract_address: validAddress,
            minimum_amount_hold: 1,
            minimum_days_hold: 1,
            reward: 1,
            max_rewards_give_out: 1,
            coin_owner_address: validAddress,
            start_date: today,
            end_date: tomorrow
        }

        beforeEach(() => {
            smartContractMock.isValidAddress = jest.fn().mockImplementation((address) => {
                if (address === validAddress) {
                    return true;
                } else {
                    return false;
                }
            });

            dealsModelMock.storeDealInDBAndContract = jest.fn().mockImplementation(() => {
                return new Promise((res, rej) => {
                    res(createdDealID);
                })
            })
        })


        it("Should fail if coin owner address address is not valid", async () => {
            try {
                await testDealController.create({ ...createArgs, coin_owner_address: invalidAddress }, smartContractMock, dealsModelMock);
                expect(false).toBe(true);
            } catch (err) {
                if (err instanceof MyError) {
                    if (err.message === Errors.INVALID_COIN_OWNER) {
                        expect(true).toBe(true);
                        return;
                    }
                }

                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        });

        it("Should fail if contract address address is not valid", async () => {
            try {
                await testDealController.create({ ...createArgs, contract_address: invalidAddress }, smartContractMock, dealsModelMock);
                expect(false).toBe(true);
            } catch (err) {
                if (err instanceof MyError) {
                    if (err.message === Errors.INVALID_CONTRACT_ADDRESS) {
                        expect(true).toBe(true);
                        return;
                    }
                }

                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        });

        it("Should fail if end date is not atleast a day after start date", async () => {
            try {
                await testDealController.create({ ...createArgs, end_date: today }, smartContractMock, dealsModelMock);
                expect(false).toBe(true);
            } catch (err) {
                if (err instanceof MyError) {
                    if (err.message === Errors.INVALID_END_DATE) {
                        expect(true).toBe(true);
                        return;
                    }
                }

                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        });

        it("Should create deal", async() => {
            try {
                const dealID = await testDealController.create(createArgs, smartContractMock, dealsModelMock);
                expect(dealID).toBe(createdDealID);
            } catch(err) {
                console.error("Error creating deal", err);
                expect(false).toBe(true);
            }
        })
    })
})