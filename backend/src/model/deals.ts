import { and, desc, eq, gt, lte, isNotNull, sql } from "drizzle-orm";
import { ARBITRUM_CHAIN_MAINNET, ARBITRUM_CHAIN_TESNET } from "../constants";
import db from "../db";
import { dealsTable, tokenDetailsTable, userDealsTable } from "../db/schema";
import { SmartContract } from "../smartContract/class";
import { CreateDealsType } from "../types";
import { DealDetails, GetManyArgs } from "../controller/deals";
import logger, { PostHogEventTypes } from "../logging";

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
    description: string | null;
    creationDate: Date;
    activationDate: Date | null;
    commissionPaid: boolean;
    commissionDate: Date | null;
    code: string | null;
    name: string;
}

export interface SavedTokenDetails {
    address: string,
    name: string,
    symbol: string,
    decimals: number,
    logo: string | null
}

export interface RawExploreDealDetails {
    id: number,
    tokenAddress: string,
    tokenSymbol: string | null,
    startDate: Date,
    endDate: Date,
    reward: number,
    minimumDaysToHold: number,
    maxRewards: number,
    totalPlayers: number,
    activated: boolean,
    players: string[]
    tokenLogo: string | null,
    tokenName: string | null,
    minimumAmountToHold: number
}

export class DealsModel {
    async storeDealInDBAndContract(args: CreateDealsType, smartContract: SmartContract): Promise<number> {
        try {
            let dealID: number | null = null;

            await db.transaction(async (tx) => {
                const insertedDeal = await tx.insert(dealsTable).values({
                    contract_address: args.contract_address.toLowerCase(),
                    name: args.name,
                    coin_owner_address: args.coin_owner_address.toLowerCase(),
                    minimum_amount_to_hold: args.minimum_amount_hold,
                    miniumum_days_to_hold: args.minimum_days_hold,
                    reward: args.reward,
                    max_rewards: args.max_rewards_give_out,
                    start_date: new Date(Date.parse(args.start_date)),
                    endDate: new Date(Date.parse(args.end_date)),
                    chain: ARBITRUM_CHAIN_MAINNET,
                    description: args.description,
                    code: args.code
                }).returning({ id: dealsTable.id });

                dealID = insertedDeal[0].id;

                // Create deal in smarcontract
                const txHash = await smartContract.createDeal({
                    id: dealID,
                    name: args.name,
                    maxParticipants: args.max_rewards_give_out,
                    creatorAddress: args.coin_owner_address.toLowerCase(),
                    numberDays: args.minimum_days_hold,
                    startDate: new Date(Date.parse(args.start_date)),
                    endDate: new Date(Date.parse(args.end_date)),
                    contract_address: args.contract_address.toLowerCase(),
                    minimum_amount_to_hold: args.minimum_amount_hold,
                    reward: args.reward,
                });

                await tx.update(dealsTable).set({ creationTxHash: txHash.toLowerCase() }).where(eq(dealsTable.id, dealID));
            });

            if (dealID !== null) {
                return dealID;
            } else {
                throw new Error("Could not create deal")
            }
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error creating deal in contract and storing in db", err)
            console.error("Error creating deal", err);
            throw new Error("Error creating deal");
        }
    }

    async get(id: number, smartcontract: SmartContract): Promise<DealDetails | null> {
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
                creationDate: dealsTable.creationDate,
                activationDate: dealsTable.activationDate,
                description: dealsTable.description,
                activated: sql<boolean>`${dealsTable.activationTxHash} IS NOT NULL`,
                commissionPaid: sql<boolean>`${dealsTable.commissionTxHash} IS NOT NULL`,
                commissionDate: dealsTable.commissionDate,
                code: dealsTable.code,
                name: dealsTable.name,
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
            const tokenDetails = await smartcontract.getTokenDetails(deal.contract_address);
            if (!tokenDetails) {
                return null;
            }

            const toReturn: DealDetails = {
                ...d,
                total_players: totalPlayers,
                rewarded_players: rewardedPlayers,
                players: playerAddresses,
                tokenName: tokenDetails.name,
                tokenSymbol: tokenDetails.symbol,
                tokenLogo: tokenDetails.logoURL,
                tokenPrice: tokenDetails.price,
                tokenDecimals: tokenDetails.decimals
            };
            return toReturn;
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error getting deal", err);
            console.error("Error getting deals from database", err);
            throw new Error("Erorr getting deals from database");
        }
    }

    async getMany(args: GetManyArgs, smartcontract: SmartContract): Promise<DealDetails[]> {
        try {
            let deals: RawDealDetails[] = [];

            if (args.coinAddress) {
                deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
                    reward: dealsTable.reward,
                    description: dealsTable.description,
                    max_rewards: dealsTable.max_rewards,
                    coin_owner_address: dealsTable.coin_owner_address,
                    start_date: dealsTable.start_date,
                    endDate: dealsTable.endDate,
                    creationTxHash: dealsTable.creationTxHash,
                    chain: dealsTable.chain,
                    creationDate: dealsTable.creationDate,
                    activationDate: dealsTable.activationDate,
                    activated: sql<boolean>`${dealsTable.activationTxHash} IS NOT NULL`,
                    commissionPaid: sql<boolean>`${dealsTable.commissionTxHash} IS NOT NULL`,
                    commissionDate: dealsTable.commissionDate,
                    code: dealsTable.code,
                    name: dealsTable.name,
                }).from(dealsTable).where(eq(dealsTable.contract_address, args.coinAddress.toLowerCase()));
            } else if (args.playerAddress) {
                deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    description: dealsTable.description,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
                    reward: dealsTable.reward,
                    max_rewards: dealsTable.max_rewards,
                    coin_owner_address: dealsTable.coin_owner_address,
                    start_date: dealsTable.start_date,
                    endDate: dealsTable.endDate,
                    creationTxHash: dealsTable.creationTxHash,
                    chain: dealsTable.chain,
                    creationDate: dealsTable.creationDate,
                    activationDate: dealsTable.activationDate,
                    done: sql<boolean>`${userDealsTable.rewardSentTxHash} IS NOT NULL`,
                    activated: sql<boolean>`${dealsTable.activationTxHash} IS NOT NULL`,
                    commissionPaid: sql<boolean>`${dealsTable.commissionTxHash} IS NOT NULL`,
                    commissionDate: dealsTable.commissionDate,
                    code: dealsTable.code,
                    name: dealsTable.name,
                }).from(dealsTable)
                    .innerJoin(userDealsTable, eq(dealsTable.id, userDealsTable.dealID))
                    .where(eq(userDealsTable.userAddress, args.playerAddress.toLowerCase()));
            } else if (args.owner) {
                deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
                    reward: dealsTable.reward,
                    description: dealsTable.description,
                    max_rewards: dealsTable.max_rewards,
                    coin_owner_address: dealsTable.coin_owner_address,
                    start_date: dealsTable.start_date,
                    endDate: dealsTable.endDate,
                    creationTxHash: dealsTable.creationTxHash,
                    chain: dealsTable.chain,
                    creationDate: dealsTable.creationDate,
                    activationDate: dealsTable.activationDate,
                    activated: sql<boolean>`${dealsTable.activationTxHash} IS NOT NULL`,
                    commissionPaid: sql<boolean>`${dealsTable.commissionTxHash} IS NOT NULL`,
                    commissionDate: dealsTable.commissionDate,
                    code: dealsTable.code,
                    name: dealsTable.name,
                }).from(dealsTable).where(eq(dealsTable.coin_owner_address, args.owner.toLowerCase()));
            } else if (args.featured === true) {
                const today = new Date();

                deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    description: dealsTable.description,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
                    reward: dealsTable.reward,
                    max_rewards: dealsTable.max_rewards,
                    coin_owner_address: dealsTable.coin_owner_address,
                    start_date: dealsTable.start_date,
                    endDate: dealsTable.endDate,
                    creationTxHash: dealsTable.creationTxHash,
                    chain: dealsTable.chain,
                    creationDate: dealsTable.creationDate,
                    activationDate: dealsTable.activationDate,
                    activated: sql<boolean>`${dealsTable.activationTxHash} IS NOT NULL`,
                    commissionPaid: sql<boolean>`${dealsTable.commissionTxHash} IS NOT NULL`,
                    commissionDate: dealsTable.commissionDate,
                    code: dealsTable.code,
                    name: dealsTable.name,
                }).from(dealsTable)
                    .where(and(gt(dealsTable.endDate, today), isNotNull(dealsTable.activationTxHash)))
                    .orderBy(desc(dealsTable.id))
                    .limit(3);
            } else {
                deals = await db.select({
                    id: dealsTable.id,
                    contract_address: dealsTable.contract_address,
                    description: dealsTable.description,
                    minimum_amount_to_hold: dealsTable.minimum_amount_to_hold,
                    minimum_days_to_hold: dealsTable.miniumum_days_to_hold,
                    reward: dealsTable.reward,
                    max_rewards: dealsTable.max_rewards,
                    coin_owner_address: dealsTable.coin_owner_address,
                    start_date: dealsTable.start_date,
                    endDate: dealsTable.endDate,
                    creationTxHash: dealsTable.creationTxHash,
                    chain: dealsTable.chain,
                    creationDate: dealsTable.creationDate,
                    activationDate: dealsTable.activationDate,
                    activated: sql<boolean>`${dealsTable.activationTxHash} IS NOT NULL`,
                    commissionPaid: sql<boolean>`${dealsTable.commissionTxHash} IS NOT NULL`,
                    commissionDate: dealsTable.commissionDate,
                    code: dealsTable.code,
                    name: dealsTable.name,
                }).from(dealsTable)
                    .where(and(isNotNull(dealsTable.activationTxHash), isNotNull(dealsTable.commissionTxHash)));
            }

            const toReturn: DealDetails[] = [];

            for await (const d of deals) {
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

                const tokenDetails = await smartcontract.getTokenDetails(d.contract_address);
                if (tokenDetails === null) {
                    continue;
                }

                toReturn.push({
                    ...d,
                    total_players: totalPlayers,
                    rewarded_players: rewardedPlayers,
                    players: playerAddresses,
                    tokenLogo: tokenDetails.logoURL,
                    tokenName: tokenDetails.name,
                    tokenSymbol: tokenDetails.symbol,
                    tokenPrice: tokenDetails.price,
                    tokenDecimals: tokenDetails.decimals,
                });
            }

            return toReturn;
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error getting multiple deals", err);
            console.error("Error getting deal details from database", err);
            throw new Error("Error getting deal details");
        }
    }

    async markDealActivatedInDB(dealID: number, txn: string) {
        try {
            await db.update(dealsTable).set({
                activationDate: new Date(),
                activationTxHash: txn.toLowerCase(),
            }).where(eq(dealsTable.id, dealID));
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error markign deal as activated", err);
            console.error("Error marking deal as activated in DB", err);
            throw new Error("Error marking deals as activated");
        }
    }

    async markCommissionPaid(dealID: number, txn: string) {
        try {
            await db.update(dealsTable).set({
                commissionDate: new Date(),
                commissionTxHash: txn.toLowerCase()
            }).where(eq(dealsTable.id, dealID));
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error marking commission of deal as paid", err)
            console.error("Error marking commission as paid", err);
            throw new Error("Could not mark commission as paid");
        }
    }

    async hasUserJoinedDeal(dealID: number, address: string): Promise<boolean> {
        try {
            const results = await db.select({
                deal: userDealsTable.dealID
            }).from(dealsTable)
                .innerJoin(userDealsTable, eq(userDealsTable.dealID, dealsTable.id))
                .where(and(eq(userDealsTable.dealID, dealID), eq(userDealsTable.userAddress, address.toLowerCase())));

            return results.length > 0;
        } catch (err) {
            console.error("Error checking if user has joined deal in database", err);
            throw new Error("Error checking if user has joined deal");
        }
    }

    async updateDBAndContractOnJoin(dealID: number, address: string, smartContract: SmartContract) {
        try {
            await db.transaction(async (tx) => {
                await tx.insert(userDealsTable).values({
                    userAddress: address.toLowerCase(),
                    dealID: dealID,
                    counter: 0,
                });

                const txHash = await smartContract.join(dealID, address);

                await tx.update(userDealsTable).set({
                    joinTxHash: txHash.toLowerCase()
                }).where(and(eq(userDealsTable.dealID, dealID), eq(userDealsTable.userAddress, address.toLowerCase())));
            });
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error joining deal on contract and updating deal", err)
            console.error("Error updating db and contract", err);
            throw new Error("Error updating db and contract");
        }
    }

    async markDealEnded(dealID: number, txHash: string) {
        try {
            await db.update(dealsTable).set({
                done: true,
                endDealTx: txHash.toLowerCase()
            }).where(eq(dealsTable.id, dealID));
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Mark Deal As Ended", err);
            console.error("Error marking deal as ended", err);
            throw new Error("Error marking deal as ended in DB");
        }
    }

    async resetCount(dealID: number, userAddress: string) {
        try {
            await db.update(userDealsTable).set({
                counter: 0
            }).where(and(eq(userDealsTable.dealID, dealID), eq(userDealsTable.userAddress, userAddress.toLowerCase())));
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error reseting user count", err)
            console.error("Error reseting count for user in database", err);
            throw new Error("Erorr resetting count in database");
        }
    }

    async hasActivationTransactionBeenUsed(txHash: string): Promise<boolean> {
        try {
            const results = await db.select({
                id: dealsTable.id
            }).from(dealsTable)
                .where(eq(dealsTable.activationTxHash, txHash.toLowerCase()));

            return results.length > 0;
        } catch (err) {
            console.error("Error checking if activation transaction has been used before", err);
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error checking if activation transaction has been used", err);
            throw new Error("Error checking if activation transaction hash has been used");
        }
    }

    async hasCommissinTransactionBeenUsed(txHash: string): Promise<boolean> {
        try {
            const results = await db.select({
                id: dealsTable.id
            }).from(dealsTable)
                .where(eq(dealsTable.commissionTxHash, txHash.toLowerCase()));

            return results.length > 0;
        } catch (err) {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error checking if commission transaction has been used", err);
            console.error("Error checking if commission transaction has been used", err);
            throw new Error("Could not check if commission transaction has been used");
        }
    }

    async activeDeals(): Promise<number> {
        try {
            const today = new Date();
            const deals = await db.select().from(dealsTable).where(lte(dealsTable.start_date, today));
            let count = 0;

            for (const d of deals) {
                let endingDate = new Date(d.endDate);
                endingDate.setDate(d.endDate.getDate() + d.miniumum_days_to_hold);

                if (today < endingDate) {
                    count = count + 1;
                }
            }

            return count;
        } catch (err) {
            console.error("Error getting number of active deals", err);
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error getting number of active deals", err);
            throw new Error("Error getting number of active deals");
        }
    }

    async saveTokenDetails(args: SavedTokenDetails) {
        try {
            const chain = process.env.ENVIRONMENT === 'prod' ? ARBITRUM_CHAIN_MAINNET : ARBITRUM_CHAIN_TESNET;
            await db.insert(tokenDetailsTable).values({
                address: args.address,
                name: args.name,
                symbol: args.symbol,
                logo: args.logo,
                decimals: args.decimals,
                chain: chain
            });
        } catch (err) {
            console.error("Error saving db details", err);
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error saving token details to db", err);
            throw new Error("Error saving token details");
        }
    }

    async getStoredTokenDetials(address: string): Promise<SavedTokenDetails | null> {
        try {
            const chain = process.env.ENVIRONMENT === 'prod' ? ARBITRUM_CHAIN_MAINNET : ARBITRUM_CHAIN_TESNET;
            const data = await db.select()
                .from(tokenDetailsTable)
                .where(and(eq(tokenDetailsTable.chain, chain), eq(tokenDetailsTable.address, address)));

            if (data.length <= 0) {
                return null;
            } else {
                return {
                    name: data[0].name,
                    symbol: data[0].symbol,
                    logo: data[0].logo,
                    address: data[0].address,
                    decimals: data[0].decimals
                };
            }
        } catch(err) {
            console.log("Error getting stored token details", err);
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error getting stored token details", err);
            throw new Error("Error getting stored token details");
        }
    }

    async getExploreDealsDetails(): Promise<RawExploreDealDetails[]> {
        try {
            const chain = process.env.ENVIRONMENT === 'prod' ? ARBITRUM_CHAIN_MAINNET : ARBITRUM_CHAIN_TESNET;
            const dealsRes = await db.select({
                id: dealsTable.id,
                startDate: dealsTable.start_date,
                tokenAddress: dealsTable.contract_address,
                endDate: dealsTable.endDate,
                reward: dealsTable.reward,
                minimumDaysToHold: dealsTable.miniumum_days_to_hold,
                maxRewards: dealsTable.max_rewards,
                activated: sql<boolean>`${dealsTable.activationTxHash} IS NOT NULL AND ${dealsTable.commissionTxHash} IS NOT NULL`,
                tokenSymbol: tokenDetailsTable.symbol,
                tokenLogo: tokenDetailsTable.logo,
                minimumAmountToHold: dealsTable.minimum_amount_to_hold,
                tokenName: tokenDetailsTable.name,
            }).from(dealsTable)
            .leftJoin(tokenDetailsTable, and(eq(tokenDetailsTable.address, dealsTable.contract_address), eq(tokenDetailsTable.chain, chain)))
            .where(and(isNotNull(dealsTable.activationTxHash), isNotNull(dealsTable.commissionTxHash)));

            let deals: RawExploreDealDetails[] = [];
            for (const deal of dealsRes) {
                const playersRes = await db.select({
                    address: userDealsTable.userAddress
                }).from(userDealsTable)
                .where(eq(userDealsTable.dealID, deal.id));

                const totalPlayers = playersRes.length;
                const players = playersRes.map((i) => i.address);

                deals.push({
                    ...deal,
                    totalPlayers,
                    players
                });
            }

            return deals;
        } catch(err) {
            console.error("Error getting explore page deal details from db", err);
            await logger.sendEvent(PostHogEventTypes.ERROR, "Deals Model: Error getting explore deals details", err);
            throw new Error("Error getting explore deal details");
        }
    }
}

const dealModel = new DealsModel();
export default dealModel;