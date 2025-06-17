// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ZendoModule = buildModule("ZendoModule", (m) => {
  const zendo = m.contract("Zendo");

  return { zendo };
});

export default ZendoModule;