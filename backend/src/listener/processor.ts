import { DealsController, MainFunctionDeals } from "../controller/deals";
import { DealsModel } from "../model/deals";
import { SmartContract } from "../smartContract/class";

export default async function processMainDeal(deal: MainFunctionDeals, dealController: DealsController, smartContract: SmartContract, dealModel: DealsModel) {
    try {
        // If end date for deal has passed mark deal and ended and continue
        const now = new Date();
        if (deal.endDate <= now) {
            await dealController.markEnded(deal.deal_id, smartContract, dealModel);
            return;
        }

        // Else go to each of the players
        for (const player of deal.players) {
            // Check if player has required balance
            const hasBalance = await smartContract.doesUserHaveBalance(player, deal.coin_address, deal.minimum_balance);
            // If player doesn't have reset their counter and send to frontend
            if (hasBalance === false) {
                await dealController.resetCount(deal.deal_id, player, dealModel);
                continue;
            }

            // Else check the last time the player's counter was updated

            // If it was atleast a day ago update counter

                // If counter is at minimum days send reward

            // Else do nothing
        }
    } catch (err) {
        console.error("Error processing main deal", err);
    }
}