import { network } from "hardhat";

const { ethers } = await network.connect();
const token = await ethers.deployContract("DiplomaChain");
await token.waitForDeployment();

const adresa = await token.getAddress();

for (let slot = 0; slot < 6; slot++) {
  const vrijednost = await ethers.provider.getStorage(adresa, slot);
  console.log(`slot ${slot}: ${vrijednost}`);
}
