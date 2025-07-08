import { Alchemy, Network } from "alchemy-sdk";
import { MyError } from "../errors/type";
import { isAddress } from "web3-validator";
import Web3, { Web3Account } from "web3";
import "dotenv/config";
import ABI from "../../abi.json";
import COINABI from "../../coin.json";
import { DealDetails } from "../controller/deals";
import { decodedTransactionSchema, TokenPrice, tokenPriceSchema } from "../types";
import { Errors } from "../errors/messages";
import infisical from "../infisical";
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

const COMMISSION = 0.1;

export class SmartContract {
    constructor() {
        if (!process.env.ENVIRONMENT) {
            throw new Error("Not set up ENVIRONMENT in env variables");
        }
    }

    async getRPCURL(): Promise<string> {
        try {
            const rpcURL = await infisical.getSecret("RPC_URL", process.env.ENVIRONMENT);
            return rpcURL;
        } catch(err) {
            console.error("Error getting RPC URL", err);
            
            if (!process.env.RPC_URL) {
                throw new Error("Backup RPC URL not set in env");
            }

            return process.env.RPC_URL;
        }
    }

    async getWeb3(): Promise<Web3> {
        try {
            const rpcURL = await this.getRPCURL();
            return new Web3(rpcURL);
        } catch(err) {
            console.error("Error getting web3", err);
            throw new Error("Error getting web3");
        }
    }


    async getAccount(): Promise<Web3Account> {
        try {
            const web3 = await this.getWeb3();

            const privateKey = await infisical.getSecret("PRIVATE_KEY", process.env.ENVIRONMENT);
            const account = web3.eth.accounts.privateKeyToAccount(privateKey);
            return account;
        } catch (err) {
            console.log("Error getting account", err);
            throw new MyError("Error getting account");
        }
    }

    async getAPIKey(): Promise<string> {
        try {
            const alchemyKey = await infisical.getSecret("ALCHEMY_KEY", process.env.ENVIRONMENT);
            return alchemyKey;
        } catch (err) {
            if (err instanceof MyError) {
                throw err;
            }
            console.error("Error getting API key", err);
            throw new Error("Error getting API key");
        }
    }

    async getAlchemy(): Promise<Alchemy> {
        try {
            const alchemyKey = await this.getAPIKey();
            
            if (process.env.ENVIRONMENT === "staging") {
                const alchemy = new Alchemy({
                    apiKey: alchemyKey,
                    network: Network.ARB_SEPOLIA
                });

                return alchemy;
            } else {
                const alchemy = new Alchemy({
                    apiKey: alchemyKey,
                    network: Network.ARB_MAINNET
                });
                return alchemy;
            }
        } catch(err) {
            console.log("Error getting alchemy", err);
            throw new Error("Error getting alchemy");
        }
    }

    async getTokenDetails(address: string): Promise<TokenDetails | null> {
        try {
            const isValid = this.isValidAddress(address);
            if (isValid === false) {
                throw new MyError(Errors.INVALID_ADDRESS);
            }

            const alchemy = await this.getAlchemy();
            const metadata = await alchemy.core.getTokenMetadata(address);
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
        } catch (err) {
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
        } catch (err) {
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
            const alchemy = await this.getAlchemy();
            const metadata = await alchemy.core.getTokenMetadata(args.contract_address);
            if (metadata.decimals) {
                const processedReward = BigInt((args.maxParticipants * args.reward) * Math.pow(10, metadata.decimals));
                const goal = BigInt(args.minimum_amount_to_hold * Math.pow(10, metadata.decimals));

                const web3 = await this.getWeb3();
                const contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
                const account = await this.getAccount();
                const block = await web3.eth.getBlock();

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
                const signedTransaction = await web3.eth.accounts.signTransaction(
                    transaction,
                    account.privateKey,
                );
                const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

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
            const alchemy = await this.getAlchemy();
            const data = await alchemy.core.getTokenBalances(address, [coinAddress]);
            const rawBalance = data.tokenBalances[0].tokenBalance;
            if (rawBalance) {
                const metadata = await alchemy.core.getTokenMetadata(coinAddress);
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
            const web3 = await this.getWeb3();
            const contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const account = await this.getAccount();
            const block = await web3.eth.getBlock();

            const transaction = {
                from: account.address,
                to: process.env.CONTRACT_ADDRESS,
                data: contract.methods.activateDeal(
                    BigInt(dealID),
                ).encodeABI(),
                maxFeePerGas: block.baseFeePerGas! * 2n,
                maxPriorityFeePerGas: 100000,
            };
            const signedTransaction = await web3.eth.accounts.signTransaction(
                transaction,
                account.privateKey,
            );
            await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
        } catch (err) {
            console.error("Error activating deal", err);
            throw new Error("Error activating deal");
        }
    }

    async join(dealID: number, address: string): Promise<string> {
        try {
            const web3 = await this.getWeb3();
            const contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const account = await this.getAccount();
            const block = await web3.eth.getBlock();

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
            const signedTransaction = await web3.eth.accounts.signTransaction(
                transaction,
                account.privateKey,
            );
            const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

            return receipt.transactionHash.toString();
        } catch (err) {
            console.error("Error joining deal in smart contract", err);
            throw new Error("Error joining user to deal");
        }
    }

    async markDealEnded(dealID: number): Promise<string> {
        try {
            const web3 = await this.getWeb3();
            const contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const account = await this.getAccount();
            const block = await web3.eth.getBlock();

            const transaction = {
                from: account.address,
                to: process.env.CONTRACT_ADDRESS,
                data: contract.methods.enddeal(
                    BigInt(dealID),
                ).encodeABI(),
                maxFeePerGas: block.baseFeePerGas! * 2n,
                maxPriorityFeePerGas: 100000,
            };
            const signedTransaction = await web3.eth.accounts.signTransaction(
                transaction,
                account.privateKey,
            );
            const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

            return receipt.transactionHash.toString();
        } catch (err) {
            console.error("Error marking deal as ended in smart contract", err);
            throw new Error("Error marking deal as ended in smart contract");
        }
    }

    async updateCount(dealID: number, address: string): Promise<string> {
        try {
            console.log(`Updating count for deal ${dealID} for user ${address}`);

            const web3 = await this.getWeb3();
            const contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
            const account = await this.getAccount();
            const block = await web3.eth.getBlock();

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
            const signedTransaction = await web3.eth.accounts.signTransaction(
                transaction,
                account.privateKey,
            );
            const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

            return receipt.transactionHash.toString();
        } catch (err) {
            console.error("Error updating count in smart contract", err);
            throw new Error("Could not update count");
        }
    }

    async verifyTransaction(deal: DealDetails, txHash: string, isActivate: boolean): Promise<boolean> {
        try {
            if (!process.env.CONTRACT_ADDRESS) {
                throw new Error("Set RPC_URL and CONTRACT_ADDRESS in env file");
            }

            const rpcURL = await this.getRPCURL();

            const body = {
                jsonrpc: "2.0",
                id: "254",
                method: "eth_getTransactionByHash",
                params: [
                    txHash
                ]
            };
            const result = await fetch(rpcURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const resBody = await result.json();

            if (!result.ok) {
                console.log(resBody);
                throw new Error("Could not get details of transaction");
            }
            

            const parsed = decodedTransactionSchema.safeParse(resBody);
            if (parsed.success) {
                const transaction = parsed.data.result;
                if (transaction.from.toLowerCase() !== deal.coin_owner_address.toLowerCase()) {
                    return false;
                }

                if (transaction.to.toLowerCase() !== deal.contract_address.toLowerCase()) {
                    return false;
                }

                const web3 = await this.getWeb3();
                const coinContract = new web3.eth.Contract(COINABI, deal.contract_address);
                const decodedTransaction = coinContract.decodeMethodData(transaction.input);
                if (decodedTransaction.__method__.includes("transfer(address,uint256)")) {
                    const receivingAccount = decodedTransaction['dst'] as string;
                    const sentAmount: bigint = decodedTransaction['rawAmount'] as bigint;

                    const alchemy = await this.getAlchemy();
                    const metadata = await alchemy.core.getTokenMetadata(deal.contract_address);
            
                    if (metadata.decimals) {
                        let expectedAmount: bigint;
                        if (isActivate) {
                            expectedAmount = BigInt(Math.round(deal.reward * deal.max_rewards * Math.pow(10, metadata.decimals)));
                            return sentAmount >= expectedAmount && receivingAccount.toLowerCase() === process.env.CONTRACT_ADDRESS.toLowerCase();
                        } else {
                            expectedAmount = BigInt(Math.round(deal.reward * COMMISSION * deal.max_rewards * Math.pow(10, metadata.decimals)));
                            return sentAmount >= expectedAmount && receivingAccount.toLowerCase() === process.env.COMMISSION_ACCOUNT.toLowerCase();
                        }
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
