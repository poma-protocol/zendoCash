import { eq } from "drizzle-orm";
import { ARBITRUM_CHAIN } from "../constants";
import db from "../db";
import { dealsTable } from "../db/schema";
import { SmartContract } from "../smartContract/class";
import { CreateDealsType } from "../types";

export class DealsModel {
    async storeDealInDBAndContract(args: CreateDealsType, smartContract: SmartContract): Promise<number> {
        try {
            let dealID: number | null = null;

            await db.transaction(async (tx) => {
                const insertedDeal = await tx.insert(dealsTable).values({
                    contract_address: args.contract_address,
                    coin_owner_address: args.coin_owner_address,
                    minimum_amount_to_hold: args.minimum_amount_hold,
                    reward: args.reward,
                    max_rewards: args.max_rewards_give_out,
                    start_date: args.start_date,
                    endDate: args.end_date,
                    chain: ARBITRUM_CHAIN
                }).returning({id: dealsTable.id});

                dealID = insertedDeal[0].id;

                // Create deal in smarcontract
                const txHash = await smartContract.createDeal({
                    id: dealID,
                    contract_address: args.contract_address,
                    minimum_amount_to_hold: args.minimum_amount_hold,
                    reward: args.reward,
                    max_rewards: args.max_rewards_give_out
                });

                await tx.update(dealsTable).set({creationTxHash: txHash}).where(eq(dealsTable.id, dealID));
            });

            if (dealID !== null) {
                return dealID;
            } else {
                throw new Error("Could not create deal")
            }
        } catch(err) {
            console.error("Error creating deal", err);
            throw new Error("Error creating deal");
        }
    }
}

const dealModel = new DealsModel();
export default dealModel;