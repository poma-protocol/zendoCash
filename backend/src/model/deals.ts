import { and, eq, sql } from "drizzle-orm";
import { ARBITRUM_CHAIN } from "../constants";
import db from "../db";
import { dealsTable, userDealsTable } from "../db/schema";
import { SmartContract } from "../smartContract/class";
import { CreateDealsType } from "../types";
import { DealDetails, GetManyArgs } from "../controller/deals";

interface RawDealDetails {
    id: number;
    contract_address: string;
    minimum_amount_to_hold: number;
    minimum_days_to_hold: number;
    reward: number;
    max_rewards: number;
    coin_owner_address: string;
    start_date: Date;
    endDate: Date;
    creationTxHash: string | null;
    chain: string;
    activated: boolean;
    creationDate: Date;
    activationDate: Date | null;
}

export class DealsModel {
    async storeDealInDBAndContract(args: CreateDealsType, smartContract: SmartContract): Promise<number> {
        try {
            let dealID: number | null = null;

            await db.transaction(async (tx) => {
                const insertedDeal = await tx.insert(dealsTable).values({
                    contract_address: args.contract_address,
                    name: args.name,
                    coin_owner_address: args.coin_owner_address,
                    minimum_amount_to_hold: args.minimum_amount_hold,
                    miniumum_days_to_hold: args.minimum_days_hold,
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
                    name: args.name,
                    maxParticipants: args.max_rewards_give_out,
                    creatorAddress: args.coin_owner_address,
                    numberDays: args.minimum_days_hold,
                    startDate: args.start_date,
                    endDate: args.end_date,
                    contract_address: args.contract_address,
                    minimum_amount_to_hold: args.minimum_amount_hold,
                    reward: args.reward,
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
                minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
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
            if (deal === null) {
                return null;
            }

            const d = deals[0];
            const players = await db.select({
                address: userDealsTable.userAddress,
                rewardTx: userDealsTable.rewardSentTxHash
            }).from(userDealsTable)
                .where(eq(userDealsTable.dealID, d.id));

            const totalPlayers = players.length;
            let rewardedPlayers = 0;
            for (const p of players) {
                if (p.rewardTx !== null) {
                    rewardedPlayers++;
                }
            }
            const playerAddresses = players.map((d) => d.address);

            const toReturn = { ...d, total_players: totalPlayers, rewarded_players: rewardedPlayers, players: playerAddresses };
            return toReturn;
        } catch (err) {
            console.error("Error getting deals from database", err);
            throw new Error("Erorr getting deals from database");
        }
    }

    async getMany(args: GetManyArgs): Promise<DealDetails[]> {
        try {
            let deals: RawDealDetails[] = [];

            if (args.coinAddress) {
                deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
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
            } else if (args.playerAddress) {
                deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
                    reward: dealsTable.reward,
                    max_rewards: dealsTable.max_rewards,
                    coin_owner_address: dealsTable.coin_owner_address,
                    start_date: dealsTable.start_date,
                    endDate: dealsTable.endDate,
                    creationTxHash: dealsTable.creationTxHash,
                    chain: dealsTable.chain,
                    activated: dealsTable.activated,
                    creationDate: dealsTable.creationDate,
                    activationDate: dealsTable.activationDate,
                    done: sql<boolean>`IS NOT NULL ${userDealsTable.rewardSentTxHash}`
                }).from(dealsTable)
                    .innerJoin(userDealsTable, eq(dealsTable.id, userDealsTable.dealID))
                    .where(eq(userDealsTable.userAddress, args.playerAddress));
            } else {
                deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
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
            }

            const toReturn: DealDetails[] = [];
            deals.map(async (d) => {
                const players = await db.select({
                    address: userDealsTable.userAddress,
                    rewardTx: userDealsTable.rewardSentTxHash
                }).from(userDealsTable)
                    .where(eq(userDealsTable.dealID, d.id));

                const totalPlayers = players.length;
                let rewardedPlayers = 0;
                for (const p of players) {
                    if (p.rewardTx !== null) {
                        rewardedPlayers++;
                    }
                }
                const playerAddresses = players.map((d) => d.address);

                toReturn.push({ ...d, total_players: totalPlayers, rewarded_players: rewardedPlayers, players: playerAddresses });
            });

            return toReturn;
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
        } catch (err) {
            console.error("Error marking deal as activated in DB", err);
            throw new Error("Error marking deals as activated");
        }
    }

    async hasUserJoinedDeal(dealID: number, address: string): Promise<boolean> {
        try {
            const results = await db.select({
                deal: userDealsTable.dealID
            }).from(dealsTable).where(and(eq(userDealsTable.dealID, dealID), eq(userDealsTable.userAddress, address)));

            return results.length > 0;
        } catch (err) {
            console.error("Error checking if user has joined deal in database", err);
            throw new Error("Error checking if user has joined deal");
        }
    }

    async updateDBAndContractOnJoin(dealID: number, address: string, counter: number, smartContract: SmartContract) {
        try {
            await db.transaction(async (tx) => {
                await tx.insert(userDealsTable).values({
                    userAddress: address,
                    dealID: dealID,
                    counter: counter,
                });

                await smartContract.join(dealID, address);
            });
        } catch (err) {
            console.error("Error updating db and contract", err);
            throw new Error("Error updating db and contract");
        }
    }

    async markDealEnded(dealID: number) {
        try {
            await db.update(dealsTable).set({
                done: true
            }).where(eq(dealsTable.id, dealID));
        } catch(err) {
            console.error("Error marking deal as ended", err);
            throw new Error("Error marking deal as ended in DB");
        }
    }

    async resetCount(dealID: number, userAddress: string) {
        try {
            await db.update(userDealsTable).set({
                counter: 0
            }).where(and(eq(userDealsTable.dealID, dealID), eq(userDealsTable.userAddress, userAddress)));
        } catch(err) {
            console.error("Error reseting count for user in database", err);
            throw new Error("Erorr resetting count in database");
        }
    }
}

const dealModel = new DealsModel();
export default dealModel;