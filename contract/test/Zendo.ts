import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

describe("Zendo", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // Deploy Mock Token
    const Token = await hre.viem.deployContract("MockERC20", [
      "MockToken",
      "MTK",
      parseEther("10000"),
    ]);
    const tokenAddress = Token.address;

    // Deploy Zendo
    const Zendo = await hre.viem.deployContract("Zendo");

    // Create Deal
    const currentTime = await time.latest();
    const dealId = 1;
    const startDate = currentTime + 60; // starts in 1 min
    const endDate = currentTime + 3600; // ends in 1 hour

    await Zendo.write.createDeal([
      dealId,
      "Test Deal",
      2, // maxParticipants
      owner.account.address,
      parseEther("200"),
      parseEther("10"),
      7, // numberOfDays
      startDate,
      endDate,
      tokenAddress,
    ]);

    return {
      Zendo,
      Token,
      owner,
      user1,
      user2,
      dealId,
      startDate,
      endDate,
      publicClient,
    };
  }

  it("Should create and activate a deal", async function () {
    const { Zendo, Token, owner, dealId } = await loadFixture(deployFixture);

    await Token.write.approve([Zendo.address, parseEther("200")]);

    await Zendo.write.activateDeal([dealId, Token.address]);

    const deal = await Zendo.read.deals([dealId]);
    expect(deal.isActive).to.be.true;
  });

  it("Should allow participants to register", async function () {
    const { Zendo, Token, dealId, user1, startDate } = await loadFixture(deployFixture);

    await Token.write.approve([Zendo.address, parseEther("200")]);
    await Zendo.write.activateDeal([dealId, Token.address]);

    // Wait until startDate
    await time.increaseTo(startDate + 1);

    const ZendoUser1 = await hre.viem.getContractAt("Zendo", Zendo.address, {
      walletClient: user1,
    });

    await ZendoUser1.write.addParticipant([dealId, user1.account.address]);

    const participant = await Zendo.read.dealParticipants([dealId, user1.account.address]);
    expect(participant.isRegistered).to.be.true;
  });

  it("Should not allow duplicate participants", async function () {
    const { Zendo, Token, dealId, user1, startDate } = await loadFixture(deployFixture);

    await Token.write.approve([Zendo.address, parseEther("200")]);
    await Zendo.write.activateDeal([dealId, Token.address]);
    await time.increaseTo(startDate + 1);

    const ZendoUser1 = await hre.viem.getContractAt("Zendo", Zendo.address, {
      walletClient: user1,
    });

    await ZendoUser1.write.addParticipant([dealId, user1.account.address]);
    await expect(
      ZendoUser1.write.addParticipant([dealId, user1.account.address])
    ).to.be.revertedWith("Participant already registered");
  });

  it("Should distribute rewards to participants", async function () {
    const { Zendo, Token, dealId, user1, user2, startDate } = await loadFixture(deployFixture);

    await Token.write.approve([Zendo.address, parseEther("200")]);
    await Zendo.write.activateDeal([dealId, Token.address]);
    await time.increaseTo(startDate + 1);

    const ZendoUser1 = await hre.viem.getContractAt("Zendo", Zendo.address, {
      walletClient: user1,
    });
    const ZendoUser2 = await hre.viem.getContractAt("Zendo", Zendo.address, {
      walletClient: user2,
    });

    await ZendoUser1.write.addParticipant([dealId, user1.account.address]);
    await ZendoUser2.write.addParticipant([dealId, user2.account.address]);

    await Zendo.write.rewardUser([dealId, user1.account.address]);
    const updated = await Zendo.read.dealParticipants([dealId, user1.account.address]);

    expect(updated.isRewarded).to.be.true;
    expect(updated.rewardsClaimed.toString()).to.equal(parseEther("100").toString());
  });

  it("Should prevent double reward", async function () {
    const { Zendo, Token, dealId, user1, startDate } = await loadFixture(deployFixture);

    await Token.write.approve([Zendo.address, parseEther("200")]);
    await Zendo.write.activateDeal([dealId, Token.address]);
    await time.increaseTo(startDate + 1);

    const ZendoUser1 = await hre.viem.getContractAt("Zendo", Zendo.address, {
      walletClient: user1,
    });

    await ZendoUser1.write.addParticipant([dealId, user1.account.address]);

    await Zendo.write.rewardUser([dealId, user1.account.address]);
    await expect(
      Zendo.write.rewardUser([dealId, user1.account.address])
    ).to.be.revertedWith("User already rewarded");
  });

  it("Should not reward unregistered users", async function () {
    const { Zendo, Token, dealId, user2, startDate } = await loadFixture(deployFixture);

    await Token.write.approve([Zendo.address, parseEther("200")]);
    await Zendo.write.activateDeal([dealId, Token.address]);
    await time.increaseTo(startDate + 1);

    await expect(
      Zendo.write.rewardUser([dealId, user2.account.address])
    ).to.be.revertedWith("Participant not found");
  });

  it("Should not register after max participants", async function () {
    const { Zendo, Token, dealId, user1, user2, startDate } = await loadFixture(deployFixture);

    await Token.write.approve([Zendo.address, parseEther("200")]);
    await Zendo.write.activateDeal([dealId, Token.address]);
    await time.increaseTo(startDate + 1);

    const ZendoUser1 = await hre.viem.getContractAt("Zendo", Zendo.address, {
      walletClient: user1,
    });
    const ZendoUser2 = await hre.viem.getContractAt("Zendo", Zendo.address, {
      walletClient: user2,
    });

    await ZendoUser1.write.addParticipant([dealId, user1.account.address]);
    await ZendoUser2.write.addParticipant([dealId, user2.account.address]);

    const [extra] = await hre.viem.getWalletClients({ quantity: 1 });
    const ZendoExtra = await hre.viem.getContractAt("Zendo", Zendo.address, {
      walletClient: extra,
    });

    await expect(
      ZendoExtra.write.addParticipant([dealId, extra.account.address])
    ).to.be.revertedWith("Max participants reached");
  });
});
 