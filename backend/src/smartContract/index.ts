import { SmartContract } from "./class";
import {Web3} from "web3";
import { Alchemy, Network } from "alchemy-sdk";
import "dotenv/config";


const web3 = new Web3(process.env.RPC_URL);

const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_KEY,
    network: Network.ARB_SEPOLIA
})
const smartContract = new SmartContract(alchemy, web3);
export default smartContract;

(async () => {
    // const transaction = await smartContract.createDeal({
    //     id: 1,
    //     name: "test",
    //     maxParticipants: 10,
    //     creatorAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 
    //     numberDays: 10,
    //     startDate: new Date(),
    //     endDate: new Date(),
    //     contract_address: "0x6402c4c08C1F752Ac8c91beEAF226018ec1a27f2",
    //     minimum_amount_to_hold: 1,
    //     reward: 2,
    // });
    // console.log(transaction);

    await smartContract.join(
        1,
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );
    process.exit(0);
})();