import dealsController from "../controller/deals";

export default async function main() {
    try {
        // Get all deals and their participants
        const deals = await dealsController.mainFunctionDeals();

        // For each deal
        for (const deal of deals) {
            
        }
    } catch (err) {
        console.error("Error occured in the listener", err);
    }
}

main();