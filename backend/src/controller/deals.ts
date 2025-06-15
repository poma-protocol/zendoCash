import { Errors } from "../errors/messages";
import { MyError } from "../errors/type";
import { SmartContract } from "../smartContract/class";
import { CreateDealsType } from "../types";
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
}

export interface GetManyArgs {
    coinAddress?: string
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
        } catch(err) {
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

                const deals = await dealsModel.getMany({coinAddress: args.coinAddress});
                return deals;
            }

            const deals = await dealsModel.getMany({});
            return deals;
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }
            console.error("Error getting mulitple deal details", err);
            throw new MyError("Error getting multiple deal details");
        }
    }

    async markAsActivated(dealID: number, dealsModel: DealsModel) {
        try {
            const deal = await dealsModel
        } catch(err) {
            console.log("Error marking deal as activated", err);
            throw new Error("Error marking deal as activated");
        }
    }
}

const dealsController = new DealsController();
export default dealsController;