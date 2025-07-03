import { Errors } from "../errors/messages";
import { MyError } from "../errors/type";
import { SmartContract } from "../smartContract/class";
import { CreateDealsType, JoinSchemaType } from "../types";
import { DealsModel } from "../model/deals";
import db from "../db";
import { dealsTable, userDealsTable } from "../db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import smartContract from "../smartContract";

export interface DealDetails {
    id: number,
    tokenName: string,
    tokenSymbol: string,
    tokenLogo: string | null,
    tokenPrice: number,
    contract_address: string,
    minimum_amount_to_hold: number,
    minimum_days_to_hold: number,
    reward: number,
    max_rewards: number,
    coin_owner_address: string,
    start_date: Date,
    endDate: Date,
    creationTxHash: string | null,
    chain: string,
    activated: boolean,
    creationDate: Date,
    activationDate: Date | null,
    done?: boolean,
    players: string[],
    total_players: number,
    rewarded_players: number,
    commissionPaid: boolean;
    commissionDate: Date | null;
}

export interface GetManyArgs {
    coinAddress?: string,
    playerAddress?: string,
    featured?: boolean,
    owner?: string
}

interface Player {
    address: string,
    lastCountUpdateTime: Date | null,
    count: number
}

export interface MainFunctionDeals {
    deal_id: number,
    coin_address: string,
    minimum_balance: number,
    max_rewards: number,
    rewards_sent: number,
    minimum_days_hold: number,
    endDate: Date,
    players: Player[]
}

const COMMISSION = 0.1;

export class DealsController {
    async create(args: CreateDealsType, smartContract: SmartContract, dealModel: DealsModel): Promise<number> {
        try {
            const today = new Date()
            today.setDate(today.getDate() - 1);
            today.setHours(0, 0, 0, 0);

            const endDate = new Date(Date.parse(args.end_date));
            const startDate = new Date(Date.parse(args.start_date));

            if (endDate < today || startDate < today) {
                throw new MyError(Errors.INVALID_DATE);
            }

            // Check if coin owner address and contract address exist
            const validCoinOwner = smartContract.isValidAddress(args.coin_owner_address);
            if (validCoinOwner === false) {
                throw new MyError(Errors.INVALID_COIN_OWNER);
            }

            // Check if contract address is valid
            const validContractAddress = smartContract.isValidAddress(args.contract_address);
            if (validContractAddress === false) {
                throw new MyError(Errors.INVALID_CONTRACT_ADDRESS);
            }

            const minimumEndDate = new Date(args.start_date);
            minimumEndDate.setDate(startDate.getDate() + 1);

            if (endDate < minimumEndDate) {
                throw new MyError(Errors.INVALID_END_DATE);
            }

            const dealID = await dealModel.storeDealInDBAndContract(args, smartContract);
            return dealID;
        } catch (err) {
            if (err instanceof MyError) {
                throw err;
            }

            console.error("Error creating deal", err);
            throw new Error("Could not create deal");
        }
    }

    async get(dealID: number, dealsModel: DealsModel, smartcontract: SmartContract): Promise<DealDetails | null> {
        try {
            const deal = await dealsModel.get(dealID, smartcontract);
            if (deal === null) {
                throw new MyError(Errors.DEAL_DOES_NOT_EXIST);
            }

            return deal;
        } catch (err) {
            if (err instanceof MyError) {
                throw err;
            }

            console.error("Error getting deal", err);
            throw new Error("Error getting deal");
        }
    }

    async getMany(args: GetManyArgs, dealsModel: DealsModel, smartcontract: SmartContract): Promise<DealDetails[]> {
        try {
            if (args.coinAddress) {
                const isCoinAddressValid = smartcontract.isValidAddress(args.coinAddress);
                if (isCoinAddressValid === false) {
                    throw new MyError(Errors.INVALID_CONTRACT_ADDRESS);
                }

                const deals = await dealsModel.getMany({ coinAddress: args.coinAddress }, smartcontract);
                return deals;
            } else if (args.playerAddress) {
                const isPlayerAddressValid = smartcontract.isValidAddress(args.playerAddress);
                if (isPlayerAddressValid === false) {
                    throw new MyError(Errors.INVALID_ADDRESS);
                }

                const deals = await dealsModel.getMany({playerAddress: args.playerAddress}, smartcontract);
                return deals;
            } else if (args.featured === true) {
                const deals = await dealsModel.getMany({featured: true}, smartcontract);
                return deals;
            } else if (args.owner) {
                const isValidOwnerAddress = smartcontract.isValidAddress(args.owner);
                if (isValidOwnerAddress === false) {
                    throw new MyError(Errors.INVALID_ADDRESS);
                }

                const deals = await dealsModel.getMany({owner: args.owner}, smartcontract);
                return deals;
            } else {
                const deals = await dealsModel.getMany({}, smartcontract);
                return deals;
            }
        } catch (err) {
            if (err instanceof MyError) {
                throw err;
            }
            console.error("Error getting mulitple deal details", err);
            throw new MyError("Error getting multiple deal details");
        }
    }

    async markAsActivated(dealID: number, txHash: string, dealsModel: DealsModel, smartcontract: SmartContract) {
        try {
            const deal = await dealsModel.get(dealID, smartcontract);
            if (deal === null) {
                throw new MyError(Errors.DEAL_DOES_NOT_EXIST);
            }

            if (deal.commissionPaid === false) {
                throw new MyError(Errors.DEAL_NOT_COMMISSION);
            }

            const hasTransactionBeenUsed = await dealsModel.hasActivationTransactionBeenUsed(txHash);
            if (hasTransactionBeenUsed === true) {
                throw new MyError(Errors.TRANSACTION_USED_BEFORE);
            }

            const isTransactionValid = await smartcontract.verifyTransaction(deal, txHash, true);
            if (!isTransactionValid) {
                throw new MyError(Errors.INVALID_TRANSACTION_HASH);
            }

            // Update deal in DB
            await smartcontract.activate(dealID);    
            await dealsModel.markDealActivatedInDB(dealID, txHash);
        } catch (err) {
            if (err instanceof MyError) {
                throw err;
            }

            console.log("Error marking deal as activated", err);
            throw new Error("Error marking deal as activated");
        }
    }

    async storeCommission(dealID: number, txHash: string, dealsModel: DealsModel, smarcontract: SmartContract) {
        try {
            // Check if deal exists
            const deal = await dealsModel.get(dealID, smarcontract);
            if (!deal) {
                throw new MyError(Errors.DEAL_DOES_NOT_EXIST)
            }

            const hasCommissionTransactionBeenUsed = await dealsModel.hasCommissinTransactionBeenUsed(txHash);
            if (hasCommissionTransactionBeenUsed === true) {
                throw new MyError(Errors.TRANSACTION_USED_BEFORE);
            }

            const isTransactionValid = await smartContract.verifyTransaction(deal, txHash, false);
            if (!isTransactionValid) {
                throw new MyError(Errors.INVALID_TRANSACTION_HASH);
            }

            await dealsModel.markCommissionPaid(dealID, txHash);
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }

            console.error("Could not store commission", err);
            throw new Error("Error storing commission");
        }
    }

    // Returns whether or not the user had the required amount of coin when joining the deal
    async join(args: JoinSchemaType, smartContract: SmartContract, dealModel: DealsModel): Promise<boolean> {
        try {
            const today = new Date();

            const isValidAddress = smartContract.isValidAddress(args.address);
            if (!isValidAddress) {
                throw new MyError(Errors.INVALID_ADDRESS);
            }

            const deal = await dealModel.get(args.deal_id, smartContract);
            if (deal === null) {
                throw new MyError(Errors.DEAL_DOES_NOT_EXIST);
            }

            if (deal.activated === false || deal.commissionPaid === false) {
                throw new MyError(Errors.DEAL_NOT_ACTIVATED);
            }

            const hasUserJoined = await dealModel.hasUserJoinedDeal(args.deal_id, args.address);
            if (hasUserJoined === true) {
                throw new MyError(Errors.ALREADY_JOINED);
            }

            // Check if end date has passed
            if (today < deal.start_date) {
                throw new MyError(Errors.DEAL_NOT_YET_STARTED);
            }

            if (today > deal.endDate) {
                throw new MyError(Errors.DEAL_ENDED);
            }

            const hasBalance = await smartContract.doesUserHaveBalance(args.address, deal.contract_address, deal.reward);
            await dealModel.updateDBAndContractOnJoin(args.deal_id, args.address, smartContract);
            return hasBalance;
        } catch (err) {
            if (err instanceof MyError) {
                throw err;
            }

            console.error("Error joining player to deal", err);
            throw new Error("Error joining player");
        }
    }

    async mainFunctionDeals(): Promise<MainFunctionDeals[]> {
        try {
            const dealResults = await db.select({
                id: dealsTable.id,
                coinAddress: dealsTable.contract_address,
                minimumBalance: dealsTable.minimum_amount_to_hold,
                minDaysHold: dealsTable.miniumum_days_to_hold,
                max_rewards: dealsTable.max_rewards,
                endDate: dealsTable.endDate
            }).from(dealsTable).where(and(eq(dealsTable.done, false), isNotNull(dealsTable.activationTxHash)));

            const deals: MainFunctionDeals[] = [];
            for await (const deal of dealResults) {
                const playersResults = await db.select({
                    address: userDealsTable.userAddress,
                    lastCountUpdateTime: userDealsTable.lastCountUpdateTime,
                    counter: userDealsTable.counter,
                    txHash: userDealsTable.rewardSentTxHash,
                    joinTime: userDealsTable.joinTime
                }).from(userDealsTable).where(eq(userDealsTable.dealID, deal.id));

                const participatingPlayers = playersResults.filter((p) => {
                    const oneDayAfterJoining = new Date(p.joinTime);
                    oneDayAfterJoining.setDate(p.joinTime.getDate() + 1);
                    const today = new Date();
                
                    if (oneDayAfterJoining < today && p.txHash !== null) {
                        return p;
                    }
                });
                const players: Player[] = participatingPlayers.map((p) => {
                    return {
                        address: p.address,
                        lastCountUpdateTime: p.lastCountUpdateTime,
                        count: p.counter
                    }
                });
                let rewardsSent = 0;
                for (const p of playersResults) {
                    if (p.txHash !== null) {
                        rewardsSent++;
                    }
                } 

                deals.push({
                    deal_id: deal.id,
                    coin_address: deal.coinAddress,
                    minimum_balance: deal.minimumBalance,
                    rewards_sent: rewardsSent,
                    max_rewards: deal.max_rewards,
                    minimum_days_hold: deal.minDaysHold,
                    endDate: deal.endDate,
                    players
                });
            }

            return deals;
        } catch(err) {
            console.error("Error getting main function deals", err);
            throw new MyError(Errors.NOT_GET_MAIN_DEALS);
        }
    }

    async markEnded(dealID: number, smartcontract: SmartContract, dealModel: DealsModel) {
        try {
            const txHash = await smartcontract.markDealEnded(dealID);
            await dealModel.markDealEnded(dealID, txHash);
        } catch(err) {
            console.error("Error marking deal as ended", err);
            throw new Error("Error marking deal as ended");
        }
    }

    async resetCount(dealID: number, userAddress: string, dealsModel: DealsModel) {
        try {
            await dealsModel.resetCount(dealID, userAddress);
            // UPDATE WORX
            console.log("Not yet implemented code for updating WORX site");
        } catch(err) {
            console.error("Error reseting count for user", err);
            throw new Error("Error resetting count");
        }
    }

    async updateCount(dealID: number, player: Player, minumumDaysHold: number, smartcontract: SmartContract) {
        try {
            await db.transaction(async (tx) => {
                const updatedCount = player.count++;
                await tx.update(userDealsTable).set({
                    counter: updatedCount
                }).where(and(eq(userDealsTable.userAddress, player.address), eq(userDealsTable.dealID, dealID)));

                if (updatedCount >= minumumDaysHold) {
                    const txHash = await smartcontract.updateCount(dealID, player.address);
                    console.log("Transaction hash", txHash);
                    await tx.update(userDealsTable).set({
                        rewardSentTxHash: txHash
                    }).where(and(eq(userDealsTable.dealID, dealID), eq(userDealsTable.userAddress, player.address)));

                    // Update Worx
                    console.log("Update to Worx not implemented yet");
                }
            });
        } catch(err) {
            console.error("Error updating count of player", err);
            throw new Error("Error updating count");
        }
    }
}

const dealsController = new DealsController();
export default dealsController;