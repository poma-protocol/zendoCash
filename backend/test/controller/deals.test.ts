import { DealsController } from "../../src/controller/deals"
import { Errors } from "../../src/errors/messages";
import { MyError } from "../../src/errors/type";
import { JoinSchemaType } from "../../src/types";
import { dealsModelMock, smartContractMock } from "../mocks";

describe("Deal Controller Tests", () => {
    const invalidAddress = "invalid";
    const validAddress = "valid";
    const validAddress2 = "valid2";
    const alreadyJoinedAddress = "alreadyJoined";

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

    const joinArgs = {
        address: validAddress,
        deal_id: createdDealID
    } as JoinSchemaType

    beforeEach(() => {
        smartContractMock.isValidAddress = jest.fn().mockImplementation((address) => {
            if (address === validAddress || address === alreadyJoinedAddress || address === validAddress2) {
                return true;
            } else {
                return false;
            }
        });

        smartContractMock.doesUserHaveBalance = jest.fn().mockImplementation((address: string, coinAddress: string) => {
            return new Promise((res, rej) => {
                if (address === validAddress) {
                    res(true);
                } else {
                    res(false);
                }
            });
        })

        dealsModelMock.storeDealInDBAndContract = jest.fn().mockImplementation(() => {
            return new Promise((res, rej) => {
                res(createdDealID);
            })
        });

        dealsModelMock.get = jest.fn().mockImplementation((id: number) => {
            return new Promise((res, rej) => {
                if (id === createdDealID) {
                    res(createArgs);
                } else {
                    res(null);
                }
            })
        });

        dealsModelMock.hasUserJoinedDeal = jest.fn().mockImplementation((deal_id: number, address: string) => {
            return new Promise((res, rej) => {
                if (address === alreadyJoinedAddress) {
                    res(true);
                } else {
                    res(false);
                }
            })
        });
    })

    describe("Create deal tests", () => {
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

        it("Should create deal", async () => {
            try {
                const dealID = await testDealController.create(createArgs, smartContractMock, dealsModelMock);
                expect(dealID).toBe(createdDealID);
                expect(dealsModelMock.storeDealInDBAndContract).toHaveBeenCalledWith(createArgs, smartContractMock);
                expect(dealsModelMock.storeDealInDBAndContract).toHaveBeenCalledTimes(1);
            } catch (err) {
                console.error("Error creating deal", err);
                expect(false).toBe(true);
            }
        })
    });

    describe("Mark deal as activated test", () => {
        it("should fail if deal does not exist", async () => {
            try {
                await testDealController.markAsActivated(123123, dealsModelMock);
                expect(false).toBe(true);
            } catch (err) {
                if (err instanceof MyError) {
                    if (err.message === Errors.DEAL_DOES_NOT_EXIST) {
                        expect(true).toBe(true);
                        return;
                    }
                }

                console.log("Unexpected error", err);
                expect(false).toBe(true);
            }
        });

        it("should mark deal as activated", async () => {
            try {
                await testDealController.markAsActivated(createdDealID, dealsModelMock);
                expect(dealsModelMock.markDealActivatedInDB).toHaveBeenCalledTimes(1)
                expect(dealsModelMock.markDealActivatedInDB).toHaveBeenCalledWith(createdDealID);
            } catch (err) {
                console.log("Unexpected error", err);
                expect(false).toBe(true);
            }
        })
    });

    describe("Joining deal tests", () => {
        it("should fail if address is invalid", async () => {
            try {
                await testDealController.join({ ...joinArgs, address: "invalid" }, smartContractMock, dealsModelMock);
                expect(false).toBe(true);
            } catch (err) {
                if (err instanceof MyError) {
                    if (err.message === Errors.INVALID_ADDRESS) {
                        expect(true).toBe(true);
                        return;
                    }
                }

                console.log("Unexpected error", err);
                expect(false).toBe(true);
            }
        });

        it("should fail if deal does not exist", async () => {
            try {
                await testDealController.join({...joinArgs, deal_id: 1000}, smartContractMock, dealsModelMock);
                expect(false).toBe(true);
            } catch(err) {
                if (err instanceof MyError) {
                    if (err.message === Errors.DEAL_DOES_NOT_EXIST) {
                        expect(true).toBe(true);
                        return;
                    }
                }

                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        });

        it("should fail if the user has already joined the deal", async () => {
            try {
                await testDealController.join({...joinArgs ,address: alreadyJoinedAddress}, smartContractMock, dealsModelMock);
                expect(false).toBe(true);
            } catch (err) {
                if (err instanceof MyError) {
                    if (err.message === Errors.ALREADY_JOINED) {
                        expect(true).toBe(true);
                        return;
                    }
                }

                console.log("Unknown err", err);
                expect(false).toBe(true);
            }
        });

        it("should return false and set counter to 0 if user does not have required coins", async () => {
            try {
                const hasBalance = await testDealController.join({...joinArgs, address: validAddress2}, smartContractMock, dealsModelMock);
                expect(hasBalance).toBe(false);
                expect(dealsModelMock.updateDBAndContractOnJoin).toHaveBeenCalledTimes(1);
                expect(dealsModelMock.updateDBAndContractOnJoin).toHaveBeenCalledWith(createdDealID, validAddress2, 0, smartContractMock);
            } catch(err) {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        });

        it("should return true and set counter to 1 if user does has required coins", async () => {
            try {
                const hasBalance = await testDealController.join(joinArgs, smartContractMock, dealsModelMock);
                expect(hasBalance).toBe(true);
                expect(dealsModelMock.updateDBAndContractOnJoin).toHaveBeenCalledTimes(1);
                expect(dealsModelMock.updateDBAndContractOnJoin).toHaveBeenCalledWith(createdDealID, validAddress, 1, smartContractMock);
            } catch(err) {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        });
    });
})