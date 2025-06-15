import { MyError } from "../errors/type";
import { isAddress } from "web3-validator";

interface CreateDealsInSmartContract {
    id: number,
    contract_address: string,
    minimum_amount_to_hold: number,
    reward: number,
    max_rewards: number,
}

export class SmartContract {
    isValidAddress(address: string): boolean {
        try {
            return isAddress(address);
        } catch (err) {
            console.error("Error checking if valid address", err);
            throw new MyError("Could not check if address is valid");
        }
    }

    async createDeal(args: CreateDealsInSmartContract): Promise<string> {
        console.log(args);
        return "testTransactionHash"
    }
}