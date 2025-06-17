import { MainFunctionDeals } from "../../src/controller/deals"
import processMainDeal from "../../src/listener/processor"
import { dealsControllerMock, dealsModelMock, smartContractMock } from "../mocks";

describe("Listener processor tests", () => {
    const playerAddress = "valid address";
    const playerWithoutBalance = "without balance";
    const dealID = 1;;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const deal: MainFunctionDeals = {
        deal_id: dealID,
        max_rewards: 10,
        minimum_balance: 1,
        minimum_days_hold: 2,
        coin_address: "tset",
        endDate: tomorrow,
        rewards_sent: 2,
        players: [
            playerAddress
        ]
    }

    beforeEach(async () => {
        smartContractMock.doesUserHaveBalance = jest.fn().mockImplementation((address, coinAddress, balance) => {
            return new Promise((res, rej) => {
                if (address === playerWithoutBalance) {
                    res(false);
                } else {
                    res(true);
                }
            })
        })
    })

    it("should mark a deal as ended if end date is past current time and stop", async () => {
        await processMainDeal({...deal, endDate: today}, dealsControllerMock, smartContractMock, dealsModelMock);
        expect(dealsControllerMock.markEnded).toHaveBeenCalledTimes(1);
        expect(dealsControllerMock.markEnded).toHaveBeenCalledWith(deal.deal_id, smartContractMock, dealsModelMock);
    });

    it("should reset count and notify frontend if player has not met minimum balance", async () => {
        await processMainDeal({...deal, players: [playerWithoutBalance]}, dealsControllerMock, smartContractMock, dealsModelMock);
        expect(dealsControllerMock.markEnded).toHaveBeenCalledTimes(0);
        expect(dealsControllerMock.resetCount).toHaveBeenCalledTimes(1);
        expect(dealsControllerMock.resetCount).toHaveBeenCalledWith(dealID, playerWithoutBalance, dealsModelMock);
    })
});