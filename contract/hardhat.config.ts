import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers"
import "@nomicfoundation/hardhat-ignition-ethers";
// import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY!;
const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY!;
const INFURA_API_KEY = process.env.INFURA_API_KEY!;
const config: HardhatUserConfig = {
    solidity: "0.8.28",
    networks: {
        arbitrumSepolia: {
            url: "https://sepolia-rollup.arbitrum.io/rpc", 
            accounts: [SEPOLIA_PRIVATE_KEY], 
        },
    },
    etherscan: {
        apiKey: {
            arbitrumSepolia: ARBISCAN_API_KEY,
        }
    }
};

export default config;
