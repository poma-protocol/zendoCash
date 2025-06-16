import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseGwei } from "viem";

describe("Lock", function () {
    async function deployZendofixture() {
        const [owner, otherAccount] = await hre.ethers.getSigners();
        const Zendo = await hre.ethers.getContractFactory("Zendo");
        const zendo = await Zendo.deploy();
        return { zendo, owner, otherAccount };
    }
    describe("Create Deal", async function () {
       it("Should create a deal", async function () {
         const { zendo, owner, otherAccount } = await loadFixture(deployZendofixture);
        const dealId = 1;
        const dealName = "Test Deal";
        const creator = owner.address;
        const maxParticipants = BigInt(10);
        const rewards = hre.ethers.parseEther("1");
        const goal = hre.ethers.parseEther("100");
        const numberOfDays = BigInt(30);
        const startDate = BigInt(Math.floor(Date.now() / 1000));
        const endDate = startDate + numberOfDays * 24n * 60n * 60n;
        const currentParticipantCount = 0;
        const isActive = true;
        const tokenAddress = hre.ethers.ZeroAddress;
        const deal = await zendo.createDeal(
            dealId,
            dealName,
            maxParticipants,
            creator,
            rewards,
            goal,
            numberOfDays,
            startDate,
            endDate,
            tokenAddress
        );
        const dealExists = await zendo.dealExists(dealId);
        expect(dealExists).to.equal(1n);
    })})
})
