import dealsController from "../controller/deals";
import logger, { PostHogEventTypes } from "../logging";
import dealModel from "../model/deals";
import smartContract from "../smartContract";
import processMainDeal from "./processor";
import {CronJob} from "cron";

export default async function main() {
    try {
        console.log("RUNNING DEALS PROCESSOR");
        // Get all deals and their participants
        const deals = await dealsController.mainFunctionDeals();
        console.log("Deals", deals);

        // For each deal
        for (const deal of deals) {
            console.log("PROCESSING DEAL", deal);
            await processMainDeal(deal, dealsController, smartContract, dealModel);
        }
    } catch (err) {
        await logger.sendEvent(PostHogEventTypes.ERROR, "Main Processor: Error processing deals", {error: err, time: new Date().toISOString()});
        console.error("Error occured in the listener", err);
    }
}

console.log("Starting job")
const job = new CronJob(
    '0 0 * * * *',
    async () => {
        await main()
    },
    null,
    true,
    'system'
);