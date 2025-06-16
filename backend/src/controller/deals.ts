import { Errors } from "../errors/messages";
import { MyError } from "../errors/type";
import { SmartContract } from "../smartContract/class";
import { CreateDealsType, JoinSchemaType } from "../types";
import { DealsModel } from "../model/deals";

export interface DealDetails {
    id: number,
    contract_address: string,
    minimum_amount_to_hold: number,
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
    
}

export interface GetManyArgs {
    coinAddress?: string,
    playerAddress?: string
}
export class DealsController {
    async create(args: CreateDealsType, smartContract: SmartContract, dealModel: DealsModel): Promise<number> {
        try {
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
            minimumEndDate.setDate(args.start_date.getDate() + 1);

            if (args.end_date < minimumEndDate) {
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

    async get(dealID: number, dealsModel: DealsModel): Promise<DealDetails | null> {
        try {
            const deal = await dealsModel.get(dealID);
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

                const deals = await dealsModel.getMany({ coinAddress: args.coinAddress });
                return deals;
            } else if (args.playerAddress) {
                const isPlayerAddressValid = smartcontract.isValidAddress(args.playerAddress);
                if (isPlayerAddressValid === false) {
                    throw new MyError(Errors.INVALID_ADDRESS);
                }

                const deals = await dealsModel.getMany({playerAddress: args.playerAddress});
                return deals;
            } else {
                const deals = await dealsModel.getMany({});
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

    async markAsActivated(dealID: number, dealsModel: DealsModel) {
        try {
            const deal = await dealsModel.get(dealID);
            if (deal === null) {
                throw new MyError(Errors.DEAL_DOES_NOT_EXIST);
            }

            // Update deal in DB
            await dealsModel.markDealActivatedInDB(dealID);
        } catch (err) {
            if (err instanceof MyError) {
                throw err;
            }

            console.log("Error marking deal as activated", err);
            throw new Error("Error marking deal as activated");
        }
    }

    // Returns whether or not the user had the required amount of coin when joining the deal
    async join(args: JoinSchemaType, smartContract: SmartContract, dealModel: DealsModel): Promise<boolean> {
        try {
            const isValidAddress = smartContract.isValidAddress(args.address);
            if (!isValidAddress) {
                throw new MyError(Errors.INVALID_ADDRESS);
            }

            const deal = await dealModel.get(args.deal_id);
            if (deal === null) {
                throw new MyError(Errors.DEAL_DOES_NOT_EXIST);
            }

            const hasUserJoined = await dealModel.hasUserJoinedDeal(args.deal_id, args.address);
            if (hasUserJoined === true) {
                throw new MyError(Errors.ALREADY_JOINED);
            }

            const hasBalance = await smartContract.doesUserHaveBalance(args.address, deal.contract_address, deal.reward);
            const counter = hasBalance === true ? 1 : 0;
            await dealModel.updateDBAndContract(args.deal_id, args.address, counter, smartContract);
            return hasBalance;
        } catch (err) {
            if (err instanceof MyError) {
                throw err;
            }

            console.error("Error joining player to deal", err);
            throw new Error("Error joining player");
        }
    }
}

const dealsController = new DealsController();
export default dealsController;