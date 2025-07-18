import { MainFunctionDeals } from "../../src/controller/deals"
import processMainDeal from "../../src/listener/processor"
import { dealsControllerMock, dealsModelMock, smartContractMock } from "../mocks";

describe("Listener processor tests", () => {
    const playerAddress = "valid address";
    const playerWithoutBalance = "without balance";
    const dealID = 1;;
    const today = new Date();
    const yesterDay = new Date(today);
    yesterDay.setDate(today.getDate() - 1);
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
            {
                address: playerAddress,
                lastCountUpdateTime: yesterDay,
                count: 1
            }
        ]
    }

    const passedEndDate = new Date(today);
    passedEndDate.setDate(today.getDate() - deal.minimum_days_hold);

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

    it("should mark a deal as ended if end date + days to hold is past current time and stop", async () => {
        await processMainDeal({...deal, endDate: passedEndDate}, dealsControllerMock, smartContractMock, dealsModelMock);
        expect(dealsControllerMock.markEnded).toHaveBeenCalledTimes(1);
        expect(dealsControllerMock.markEnded).toHaveBeenCalledWith(deal.deal_id, smartContractMock, dealsModelMock);
    });

    it("should reset count and notify frontend if player has not met minimum balance", async () => {
        await processMainDeal({...deal, players: [{address: playerWithoutBalance, lastCountUpdateTime: today, count: 1}]}, dealsControllerMock, smartContractMock, dealsModelMock);
        expect(dealsControllerMock.markEnded).toHaveBeenCalledTimes(0);
        expect(dealsControllerMock.resetCount).toHaveBeenCalledTimes(1);
        expect(dealsControllerMock.resetCount).toHaveBeenCalledWith(dealID, playerWithoutBalance, dealsModelMock);
    });

    it("should not update count if player's count was last updated on the same day", async () => {
        await processMainDeal({...deal, players: [{address: playerAddress, lastCountUpdateTime: today, count: 1}]}, dealsControllerMock, smartContractMock, dealsModelMock);
        expect(dealsControllerMock.markEnded).toHaveBeenCalledTimes(0);
        expect(dealsControllerMock.resetCount).toHaveBeenCalledTimes(0);
        expect(dealsControllerMock.updateCount).toHaveBeenCalledTimes(0);
    });

    it("should update count if player's count was last updated at least yesterday", async() => {
        await processMainDeal(deal, dealsControllerMock, smartContractMock, dealsModelMock);
        expect(dealsControllerMock.markEnded).toHaveBeenCalledTimes(0);
        expect(dealsControllerMock.resetCount).toHaveBeenCalledTimes(0);
        expect(dealsControllerMock.updateCount).toHaveBeenCalledTimes(1);
        expect(dealsControllerMock.updateCount).toHaveBeenCalledWith(dealID, deal.players[0], deal.minimum_days_hold, smartContractMock)
    });
});