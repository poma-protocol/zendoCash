import { eq } from "drizzle-orm";
import { ARBITRUM_CHAIN } from "../constants";
import db from "../db";
import { dealsTable } from "../db/schema";
import { SmartContract } from "../smartContract/class";
import { CreateDealsType } from "../types";
import { DealDetails, GetManyArgs } from "../controller/deals";
import { MyError } from "../errors/type";

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
                }).returning({ id: dealsTable.id });

                dealID = insertedDeal[0].id;

                // Create deal in smarcontract
                const txHash = await smartContract.createDeal({
                    id: dealID,
                    contract_address: args.contract_address,
                    minimum_amount_to_hold: args.minimum_amount_hold,
                    reward: args.reward,
                    max_rewards: args.max_rewards_give_out
                });

                await tx.update(dealsTable).set({ creationTxHash: txHash }).where(eq(dealsTable.id, dealID));
            });

            if (dealID !== null) {
                return dealID;
            } else {
                throw new Error("Could not create deal")
            }
        } catch (err) {
            console.error("Error creating deal", err);
            throw new Error("Error creating deal");
        }
    }

    async get(id: number): Promise<DealDetails | null> {
        try {
            const deals = await db.select({
                id: dealsTable.id,
                contract_address: dealsTable.contract_address,
                minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                reward: dealsTable.reward,
                max_rewards: dealsTable.max_rewards,
                coin_owner_address: dealsTable.coin_owner_address,
                start_date: dealsTable.start_date,
                endDate: dealsTable.endDate,
                creationTxHash: dealsTable.creationTxHash,
                chain: dealsTable.chain,
                activated: dealsTable.activated,
                creationDate: dealsTable.creationDate,
                activationDate: dealsTable.activationDate
            }).from(dealsTable).where(eq(dealsTable.id, id));

            const deal = deals[0] ?? null;
            return deal
        } catch (err) {
            console.error("Error getting deals from database", err);
            throw new Error("Erorr getting deals from database");
        }
    }

    async getMany(args: GetManyArgs): Promise<DealDetails[]> {
        try {
            if (args.coinAddress) {
                const deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    reward: dealsTable.reward,
                    max_rewards: dealsTable.max_rewards,
                    coin_owner_address: dealsTable.coin_owner_address,
                    start_date: dealsTable.start_date,
                    endDate: dealsTable.endDate,
                    creationTxHash: dealsTable.creationTxHash,
                    chain: dealsTable.chain,
                    activated: dealsTable.activated,
                    creationDate: dealsTable.creationDate,
                    activationDate: dealsTable.activationDate
                }).from(dealsTable).where(eq(dealsTable.contract_address, args.coinAddress));

                return deals
            }

            const deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    reward: dealsTable.reward,
                    max_rewards: dealsTable.max_rewards,
                    coin_owner_address: dealsTable.coin_owner_address,
                    start_date: dealsTable.start_date,
                    endDate: dealsTable.endDate,
                    creationTxHash: dealsTable.creationTxHash,
                    chain: dealsTable.chain,
                    activated: dealsTable.activated,
                    creationDate: dealsTable.creationDate,
                    activationDate: dealsTable.activationDate
                }).from(dealsTable);

            return deals;
        } catch (err) {
            console.error("Error getting deal details from database", err);
            throw new Error("Error getting deal details");
        }
    }

    async markDealActivatedInDB(dealID: number) {
        try {
            await db.update(dealsTable).set({
                activated: true,
                activationDate: new Date()
            }).where(eq(dealsTable.id, dealID));
        } catch(err) {
            console.error("Error marking deal as activated in DB", err);
            throw new Error("Error marking deals as activated");
        }
    }
}

const dealModel = new DealsModel();
export default dealModel;