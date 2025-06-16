import { SmartContract } from "./class";
import {Web3} from "web3";
import { Alchemy, Network } from "alchemy-sdk";
import "dotenv/config";

const web3 = new Web3(process.env.ARBITRUM_RPC_URL);
const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_KEY,
    network: Network.ARB_SEPOLIA
})
const smartContract = new SmartContract(alchemy);
export default smartContract;