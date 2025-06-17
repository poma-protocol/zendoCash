import { Alchemy } from "alchemy-sdk";
import { MyError } from "../errors/type";
import { isAddress } from "web3-validator";
import Web3, { Web3Account } from "web3";
import "dotenv/config";
import ABI from "../../abi.json";
const abi = ABI.abi;


interface CreateDealsInSmartContract {
    id: number,
    name: string,
    maxParticipants: number,
    creatorAddress: string,
    numberDays: number,
    startDate: Date,
    endDate: Date,
    contract_address: string,
    minimum_amount_to_hold: number,
    reward: number
}

export class SmartContract {
    alchemy: Alchemy
    web3: Web3

    constructor(alchemy: Alchemy, web3: Web3) {
        this.alchemy = alchemy;
        this.web3 = web3;
    }

    async getAccount(): Promise<Web3Account> {
        try {
            // const privateKey = await infisical.getSecret("PRIVATE_KEY", process.env.INFISICAL_ENVIRONMENT);
            const account = this.web3.eth.accounts.privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
            return account;
        } catch (err) {
            console.log("Error getting account", err);
            throw new MyError("Error getting account");
        }
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
        try {
            const metadata = await this.alchemy.core.getTokenMetadata(args.contract_address);
            if (metadata.decimals) {
                const processedReward = BigInt(args.reward * Math.pow(10, metadata.decimals));
                const goal = BigInt(args.minimum_amount_to_hold * Math.pow(10, metadata.decimals));

                const contract = new this.web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
                const account = await this.getAccount();
                const block = await this.web3.eth.getBlock();

                const transaction = {
                    from: account.address,
                    to: process.env.CONTRACT_ADDRESS,
                    data: contract.methods.createDeal(
                        BigInt(args.id),
                        args.name,
                        BigInt(args.maxParticipants),
                        args.creatorAddress,
                        processedReward,
                        goal,
                        BigInt(args.numberDays),
                        BigInt(args.startDate.getTime()),
                        BigInt(args.endDate.getTime()),
                        args.contract_address
                    ).encodeABI(),
                    maxFeePerGas: block.baseFeePerGas! * 2n,
                    maxPriorityFeePerGas: 100000,
                };
                const signedTransaction = await this.web3.eth.accounts.signTransaction(
                    transaction,
                    account.privateKey,
                );
                const receipt = await this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

                return receipt.transactionHash.toString();
            } else {
                throw new Error("Error getting metadata for coin");
            }
        } catch (err) {
            console.error("Error creating deal", err);
            throw new Error("Error creating deal");
        }
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
            const contract = new this.web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const account = await this.getAccount();
            const block = await this.web3.eth.getBlock();

            const transaction = {
                from: account.address,
                to: process.env.CONTRACT_ADDRESS,
                data: contract.methods.addParticipant(
                    BigInt(dealID),
                    address
                ).encodeABI(),
                maxFeePerGas: block.baseFeePerGas! * 2n,
                maxPriorityFeePerGas: 100000,
            };
            const signedTransaction = await this.web3.eth.accounts.signTransaction(
                transaction,
                account.privateKey,
            );
            const receipt = await this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

            return receipt.transactionHash.toString();
        } catch (err) {
            console.error("Error joining deal in smart contract");
        }
    }

    async markDealEnded(dealID: number) {
        try {
            throw new Error("Not implemented");
        } catch (err) {
            console.error("Error marking deal as ended in smart contract", err);
            throw new Error("Error marking deal as ended in smart contract");
        }
    }

    async updateCount(dealID: number, address: string): Promise<string> {
        try {
            throw new Error("Not implemented");
        } catch (err) {
            console.error("Error updating count in smart contract", err);
            throw new Error("Could not update count");
        }
    }
}