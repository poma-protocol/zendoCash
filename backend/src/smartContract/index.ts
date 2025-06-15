import { SmartContract } from "./class";
import {Web3} from "web3";
import "dotenv/config";

const web3 = new Web3(process.env.ARBITRUM_RPC_URL);
const smartContract = new SmartContract();
export default smartContract;