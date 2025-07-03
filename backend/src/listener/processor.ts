import { DealsController, MainFunctionDeals } from "../controller/deals";
import { DealsModel } from "../model/deals";
import { SmartContract } from "../smartContract/class";

export default async function processMainDeal(deal: MainFunctionDeals, dealController: DealsController, smartContract: SmartContract, dealModel: DealsModel) {
    try {
        // If end date for deal has passed mark deal and ended and continue
        const now = new Date();
        const dealEndDate = new Date(deal.endDate);
        dealEndDate.setDate(dealEndDate.getDate() + deal.minimum_days_hold);
        if (dealEndDate <= now) {
            console.log(`DEAL ${deal.deal_id} has ended`, deal);
            await dealController.markEnded(deal.deal_id, smartContract, dealModel);
            return;
        }

        // Else go to each of the players
        for (const player of deal.players) {
            // Check if player has required balance
            const hasBalance = await smartContract.doesUserHaveBalance(player.address, deal.coin_address, deal.minimum_balance);
            // If player doesn't have reset their counter and send to frontend
            if (hasBalance === false) {
                console.log(`Player ${player.address} does not have balance for deal`, deal, "resetting their count");
                await dealController.resetCount(deal.deal_id, player.address, dealModel);
                continue;
            }

            // Else check the last time the player's counter was updated
            const minimumLastUpdateTime = new Date(now);
            minimumLastUpdateTime.setDate(now.getDate() - 1);

            // If it was atleast a day ago update counter
            if (player.lastCountUpdateTime === null || player.lastCountUpdateTime <= minimumLastUpdateTime) {
                console.log(`Updating the count for player`, player, "for deal", deal)
                // If counter is at minimum days send reward
                await dealController.updateCount(deal.deal_id, player, deal.minimum_days_hold, smartContract);
            }

            // Else do nothing
        }
    } catch (err) {
        console.error("Error processing main deal", err);
    }
}