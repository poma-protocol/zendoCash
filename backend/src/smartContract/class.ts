import { Alchemy } from "alchemy-sdk";
import { MyError } from "../errors/type";
import { isAddress } from "web3-validator";
import Web3, { Web3Account } from "web3";
import "dotenv/config";
import ABI from "../../abi.json";
import COINABI from "../../coin.json";
import { DealDetails } from "../controller/deals";
import { decodedTransactionSchema, TokenPrice, tokenPriceSchema } from "../types";
import { Errors } from "../errors/messages";
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

interface TokenDetails {
    name: string,
    symbol: string,
    decimals: number,
    logoURL: string | null,
    price: number,
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
            const account = this.web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
            return account;
        } catch (err) {
            console.log("Error getting account", err);
            throw new MyError("Error getting account");
        }
    }

    async getAPIKey(): Promise<string> {
        try {
            if (!process.env.ALCHEMY_KEY) {
                throw new MyError("Set ALCHEMY_KEY in env variables");
            }

            return process.env.ALCHEMY_KEY;
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }
            console.error("Error getting API key", err);
            throw new Error("Error getting API key");
        }
    }

    async getTokenDetails(address: string): Promise<TokenDetails | null> {
        try {
            const isValid = this.isValidAddress(address);
            if (isValid === false) {
                throw new MyError(Errors.INVALID_ADDRESS);
            }

            const metadata = await this.alchemy.core.getTokenMetadata(address);
            if (metadata.name && metadata.symbol && metadata.decimals) {
                const tokenPriceData = await this.getTokenPrice(metadata.symbol);
                let price = 0;

                for (const d of tokenPriceData.data) {
                    if (d.symbol === metadata.symbol) {
                        for (const p of d.prices) {
                            if (p.currency === "usd") {
                                price = p.value;
                            }
                        }
                    }
                }

                return {
                    name: metadata.name,
                    symbol: metadata.symbol,
                    decimals: metadata.decimals,
                    logoURL: metadata.logo,
                    price
                }
            } else {
                return null;
            }
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }

            if (err instanceof Error) {
                if (err.message.includes("expected a valid token contract address")) {
                    throw new MyError(Errors.COIN_NOT_EXIST);
                }
            }

            console.error("Error getting token details", err);
            throw new Error("Error getting token details");
        }
    }

    async getTokenPrice(symbol: string): Promise<TokenPrice> {
        try {
            const apiKey = await this.getAPIKey();
            const resp = await fetch(`https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol?symbols=${symbol}`);

            if (resp.status !== 200) {
                throw new Error("Could not get details from server");
            }

            const returned = await resp.json();
            const parsed = tokenPriceSchema.safeParse(returned);
            if (parsed.success) {
                return parsed.data;
            } else {
                console.error("Error parsing returned data", parsed.error.issues);
                throw new Error("Could not interpret data sent by server");
            }
        } catch(err) {
            console.error("Erorr getting token price", err);
            throw new Error("Error getting token details");
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
                const processedReward = BigInt((args.maxParticipants * args.reward) * Math.pow(10, metadata.decimals));
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

    async activate(dealID: number) {
        try {
            const contract = new this.web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const account = await this.getAccount();
            const block = await this.web3.eth.getBlock();

            const transaction = {
                from: account.address,
                to: process.env.CONTRACT_ADDRESS,
                data: contract.methods.activateDeal(
                    BigInt(dealID),
                ).encodeABI(),
                maxFeePerGas: block.baseFeePerGas! * 2n,
                maxPriorityFeePerGas: 100000,
            };
            const signedTransaction = await this.web3.eth.accounts.signTransaction(
                transaction,
                account.privateKey,
            );
            await this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
        } catch (err) {
            console.error("Error activating deal", err);
            throw new Error("Error activating deal");
        }
    }

    async join(dealID: number, address: string): Promise<string> {
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
            console.error("Error joining deal in smart contract", err);
            throw new Error("Error joining user to deal");
        }
    }

    async markDealEnded(dealID: number): Promise<string> {
        try {
            const contract = new this.web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const account = await this.getAccount();
            const block = await this.web3.eth.getBlock();

            const transaction = {
                from: account.address,
                to: process.env.CONTRACT_ADDRESS,
                data: contract.methods.enddeal(
                    BigInt(dealID),
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
            console.error("Error marking deal as ended in smart contract", err);
            throw new Error("Error marking deal as ended in smart contract");
        }
    }

    async updateCount(dealID: number, address: string): Promise<string> {
        try {
            console.log(`Updating count for deal ${dealID} for user ${address}`);
            const contract = new this.web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const account = await this.getAccount();
            const block = await this.web3.eth.getBlock();

            const transaction = {
                from: account.address,
                to: process.env.CONTRACT_ADDRESS,
                data: contract.methods.rewardUser(
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
            console.error("Error updating count in smart contract", err);
            throw new Error("Could not update count");
        }
    }

    async verifyActivateTransaction(deal: DealDetails, txHash: string): Promise<boolean> {
        try {
            if(!process.env.RPC_URL && !process.env.CONTRACT_ADDRESS) {
                throw new Error("Set RPC_URL and CONTRACT_ADDRESS in env file");
            }

            const body = {
                jsonrpc: "2.0",
                id: "254",
                method: "eth_getTransactionByHash",
                params: [
                    txHash
                ]
            };
            const result = await fetch(process.env.RPC_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            
            if (!result.ok) {
                throw new Error("Could not get details of transaction");
            }
            const resBody = await result.json();
            
            const parsed = decodedTransactionSchema.safeParse(resBody);
            if (parsed.success) {
                const transaction = parsed.data.result;
                if (transaction.from.toLowerCase() !== deal.coin_owner_address.toLowerCase()) {
                    return false;
                }

                if (transaction.to.toLowerCase() !== deal.contract_address.toLowerCase()) {
                    return false;
                }

                const coinContract = new this.web3.eth.Contract(COINABI, deal.contract_address);
                const decodedTransaction = coinContract.decodeMethodData(transaction.input);
                if (decodedTransaction.__method__.includes("transfer(address,uint256)")) {
                    const receivingAccount = decodedTransaction['dst'] as string;
                    const sentAmount: bigint = decodedTransaction['rawAmount'] as bigint;
                    const metadata = await this.alchemy.core.getTokenMetadata(deal.contract_address);
                    if (metadata.decimals) {
                        const expectedAmount = BigInt(deal.reward * deal.max_rewards * Math.pow(10, metadata.decimals));
                        return sentAmount >= expectedAmount && receivingAccount.toLowerCase() === process.env.CONTRACT_ADDRESS.toLowerCase();
                    } else {
                        throw new Error("Error getting decimals of coin");
                    }
                } else {
                    return false;
                }
            } else {
                console.log("Error parsing result data");
                console.log(parsed.error);
            }
            return false;
        } catch (err) {
            console.error("Error verifying transaction", err);
            throw new Error("Error verifying transaction");
        }
    }
}
