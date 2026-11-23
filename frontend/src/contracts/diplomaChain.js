import { ethers } from 'ethers'

export const HARDHAT_CHAIN_ID = '0x7a69'
export const DIPLOMA_CHAIN_RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'
export const DIPLOMA_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337)
export const DIPLOMA_CHAIN_ADDRESS = import.meta.env.VITE_DIPLOMA_CHAIN_ADDRESS
  || '0x5FbDB2315678afecb367f032d93F642f64180aa3'

export const diplomaChainAbi = [
  'function owner() view returns (address)',
  'function issueDiploma(string studentName, string studyName, uint256 issueDate, bytes32 pdfHash) returns (uint256 diplomaId)',
  'function getDiploma(uint256 diplomaId) view returns (string studentName, string studyName, uint256 issueDate, bytes32 pdfHash)',
  'function getDiplomaByHash(bytes32 pdfHash) view returns (uint256 diplomaId, string studentName, string studyName, uint256 issueDate, bytes32 storedPdfHash)',
  'function nextDiplomaId() view returns (uint256)',
  'event DiplomaIssued(uint256 indexed diplomaId, string studentName, string studyName, uint256 issueDate, bytes32 pdfHash)',
]

export function getContract(providerOrSigner) {
  if (!ethers.isAddress(DIPLOMA_CHAIN_ADDRESS)) {
    throw new Error('VITE_DIPLOMA_CHAIN_ADDRESS nije valjana adresa ugovora.')
  }
  return new ethers.Contract(DIPLOMA_CHAIN_ADDRESS, diplomaChainAbi, providerOrSigner)
}

export function getReadOnlyProvider() {
  return new ethers.JsonRpcProvider(DIPLOMA_CHAIN_RPC_URL, DIPLOMA_CHAIN_ID)
}

export function getBrowserProvider(ethereum) {
  return new ethers.BrowserProvider(ethereum)
}

function collectErrorDetails(error) {
  const messages = []
  const revertData = []
  const visited = new WeakSet()

  function visit(value, depth = 0) {
    if (depth > 6 || value == null) return
    if (typeof value === 'string') {
      messages.push(value)
      if (/^0x[0-9a-f]{8,}$/i.test(value)) revertData.push(value)
      if (/^\s*[{[]/.test(value)) {
        try {
          visit(JSON.parse(value), depth + 1)
        } catch {
          return
        }
      }
      return
    }
    if (typeof value !== 'object' || visited.has(value)) return

    visited.add(value)
    for (const key of [
      'reason',
      'shortMessage',
      'message',
      'code',
      'data',
      'error',
      'info',
      'cause',
      'payload',
      'response',
      'body',
      'result',
    ]) {
      if (key in value) visit(value[key], depth + 1)
    }
    if (typeof value.body === 'string') {
      try {
        visit(JSON.parse(value.body), depth + 1)
      } catch {
        return
      }
    }
  }

  visit(error)

  for (const data of revertData) {
    if (!data.startsWith('0x08c379a0')) continue
    try {
      const [reason] = ethers.AbiCoder.defaultAbiCoder().decode(['string'], `0x${data.slice(10)}`)
      messages.unshift(reason)
    } catch {
      continue
    }
  }

  return messages
}

export function getDiplomaErrorMessage(error) {
  const messages = collectErrorDetails(error)
  const details = messages.find((message) => (
    message.trim()
    && !/could not coalesce error|unknown[_ ]error|execution reverted$/i.test(message.trim())
  )) || ''
  const combined = messages.join(' ').toLowerCase()

  if (error?.code === 4001 || /user rejected|user denied|action_rejected/.test(combined)) {
    return 'Transakcija je odbijena u MetaMasku. Potvrdite je u novčaniku ako želite izdati diplomu.'
  }
  if (error?.code === -32002) {
    return 'MetaMask već ima otvoren zahtjev. Potvrdite ili zatvorite taj zahtjev pa pokušajte ponovno.'
  }
  const expectedNonce = combined.match(/expected nonce(?: to be)?\s+(\d+).*?(?:got|but got)\s+(\d+)/i)
  if (
    expectedNonce
    || /nonce too high|nonce too low|nonce has already been used|transaction nonce is too low|replacement transaction underpriced/.test(combined)
  ) {
    const mismatch = expectedNonce
      ? `MetaMask je pokušao poslati nonce ${expectedNonce[2]}, ali Hardhat očekuje ${expectedNonce[1]}. `
      : 'MetaMask i Hardhat imaju različito stanje noncea za ovaj račun. '
    return `${mismatch}Provjerite da nema transakcije na čekanju. U MetaMasku otvorite Settings > Advanced > Clear activity and nonce (ili Reset Account) za Hardhat Localhost, zatim ponovno učitajte stranicu. To briše samo lokalnu povijest MetaMaska, ne stanje blockchaina.`
  }
  if (/insufficient funds|funds for gas|not enough ether|exceeds the balance/.test(combined)) {
    return 'Račun nema dovoljno ETH-a za gas ove transakcije. Provjerite stanje ETH-a na MetaMask računu koji je vlasnik ugovora.'
  }
  if (/diploma s tim hashom vec postoji/.test(combined)) {
    return 'Ovaj PDF već je izdan kao diploma. Odaberite drugu datoteku.'
  }
  if (/pristup odbijen|samo vlasnik ugovora/.test(combined)) {
    return 'Povežite MetaMask račun koji je vlasnik ugovora da biste izdali diplomu.'
  }
  if (/mrezu pametnog ugovora|chain.?id|wrong network/.test(combined)) {
    return 'MetaMask nije na mreži ugovora. Odaberite Hardhat Localhost (chain ID 31337).'
  }
  if (/could not detect network|failed to fetch|network error|econnrefused|fetch failed/.test(combined)) {
    return 'Nije moguće povezati se s blockchain čvorom. Provjerite radi li Hardhat node na http://127.0.0.1:8545.'
  }
  if (/no code|missing revert data|call exception|bad address|contract.*not deployed/.test(combined)) {
    return 'Na ovoj adresi nije pronađen ispravan ugovor. Ponovno deployajte ugovor i provjerite VITE_DIPLOMA_CHAIN_ADDRESS u frontend/.env.'
  }
  if (details) return details

  const code = typeof error?.code === 'string' ? ` (${error.code})` : ''
  return `Izdavanje nije uspjelo${code}. Provjerite mrežu, adresu ugovora i MetaMask račun pa pokušajte ponovno.`
}

export async function hashPdf(file) {
  const contents = await file.arrayBuffer()
  return ethers.keccak256(new Uint8Array(contents))
}
