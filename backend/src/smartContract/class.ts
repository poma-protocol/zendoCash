import { Alchemy } from "alchemy-sdk";
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
    alchemy: Alchemy

    constructor(alchemy: Alchemy) {
        this.alchemy = alchemy;
    }

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

    async doesUserHaveBalance(address: string, coinAddress: string, balance: number): Promise<boolean> {
        try {
            const data = await this.alchemy.core.getTokenBalances(address, [coinAddress]);
            const rawBalance = data.tokenBalances[0].tokenBalance;
            if (rawBalance) {
                const metadata = await this.alchemy.core.getTokenMetadata(coinAddress);
                if (metadata.decimals) {
                    const processedBalance = Number.parseInt(rawBalance) / Math.pow(10, metadata.decimals)
                    return processedBalance >= balance;
                } else {
                    console.log("Alchemy couldn't get decimals of coin", coinAddress);
                    return false;
                }
            } else {
                console.log("Alchemy couldn't get balance of token", coinAddress, address);
                return false;
            }
        } catch (err) {
            console.error("Error getting user's balance", err);
            throw new Error("Couldn't get balance for user")
        }
    }

    async join(dealID: number, address: string) {
        try {
            throw new Error("Not implemented");
        } catch(err) {
            console.error("Error joining deal in smart contract");
        }
    }
}