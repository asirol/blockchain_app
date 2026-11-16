import { network } from "hardhat";

const { ethers } = await network.connect();
const [vlasnik] = await ethers.getSigners();
const diplomaChain = await ethers.deployContract("DiplomaChain");

await diplomaChain.waitForDeployment();

console.log("Ugovor objavljen na adresi:", await diplomaChain.getAddress());
console.log("Vlasnik:", vlasnik.address);
