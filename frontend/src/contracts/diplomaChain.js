import { ethers } from 'ethers'

export const HARDHAT_CHAIN_ID = '0x7a69'
export const DIPLOMA_CHAIN_ADDRESS = import.meta.env.VITE_DIPLOMA_CHAIN_ADDRESS
  || '0x5FbDB2315678afecb367f032d93F642f64180aa3'

export const diplomaChainAbi = [
  'function issueDiploma(string studentName, string studyName, uint256 issueDate, bytes32 pdfHash) returns (uint256 diplomaId)',
  'function getDiploma(uint256 diplomaId) view returns (string studentName, string studyName, uint256 issueDate, bytes32 pdfHash)',
  'function nextDiplomaId() view returns (uint256)',
]

export function getContract(providerOrSigner) {
  return new ethers.Contract(DIPLOMA_CHAIN_ADDRESS, diplomaChainAbi, providerOrSigner)
}

export function getBrowserProvider(ethereum) {
  return new ethers.BrowserProvider(ethereum)
}

export async function hashPdf(file) {
  const contents = await file.arrayBuffer()
  return ethers.keccak256(new Uint8Array(contents))
}
