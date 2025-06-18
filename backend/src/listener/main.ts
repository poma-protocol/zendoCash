import dealsController from "../controller/deals";
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
        console.error("Error occured in the listener", err);
    }
}

main();
// const job = new CronJob(
//     '0 0 * * * *',
//     async () => {
//         await main()
//     },
//     null,
//     true,
//     'system'
// );