import { Errors } from "../errors/messages";
import { MyError } from "../errors/type";
import { SmartContract } from "../smartContract/class";
import { CreateDealsType } from "../types";
import { DealsModel } from "../model/deals";

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
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }

            console.error("Error creating deal", err);
            throw new Error("Could not create deal");
        }
    }
} 

const dealsController = new DealsController();
export default dealsController;