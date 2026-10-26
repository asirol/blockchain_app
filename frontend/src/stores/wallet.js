import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const SEPOLIA_CHAIN_ID = '0xaa36a7'
const DEFAULT_RECIPIENT_ADDRESS = '0x20226D6Cee6c55E262B30037E407011b97D82711'
const DEFAULT_AMOUNT_ETH = '0.00001'

function getMetaMaskProvider() {
  if (typeof window === 'undefined' || !window.ethereum) return null
  if (window.ethereum.isMetaMask) return window.ethereum
  return window.ethereum.providers?.find((provider) => provider.isMetaMask) || null
}

function amountToWeiHex(amount) {
  const normalizedAmount = String(amount).trim()
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalizedAmount)) {
    throw new Error('Unesite ispravan iznos u Sepolia ETH.')
  }

  const [wholePart, fractionPart = ''] = normalizedAmount.split('.')
  if (fractionPart.length > 18) throw new Error('Iznos moze imati najvise 18 decimala.')

  const wei = (BigInt(wholePart || '0') * 10n ** 18n)
    + BigInt((fractionPart + '0'.repeat(18)).slice(0, 18))
  if (wei <= 0n) throw new Error('Iznos mora biti veci od nule.')
  return `0x${wei.toString(16)}`
}

export const useWalletStore = defineStore('wallet', () => {
  const account = ref('')
  const chainId = ref('')
  const isConnecting = ref(false)
  const isSending = ref(false)
  const error = ref('')
  const lastTransactionHash = ref('')

  const isInstalled = computed(() => Boolean(getMetaMaskProvider()))
  const isConnected = computed(() => Boolean(account.value))
  const isSepolia = computed(() => chainId.value === SEPOLIA_CHAIN_ID)
  const shortAccount = computed(() => account.value ? `${account.value.slice(0, 6)}...${account.value.slice(-4)}` : '')

  async function refresh() {
    const provider = getMetaMaskProvider()
    if (!provider) return
    chainId.value = await provider.request({ method: 'eth_chainId' })
    const accounts = await provider.request({ method: 'eth_accounts' })
    account.value = accounts[0] || ''
  }

  async function switchToSepolia() {
    const provider = getMetaMaskProvider()
    if (!provider) throw new Error('MetaMask nije instaliran.')
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    })
    await refresh()
  }

  async function connect() {
    if (isConnecting.value) return
    const provider = getMetaMaskProvider()
    if (!provider) {
      error.value = 'MetaMask nije instaliran u ovom pregledniku. Instalirajte ekstenziju i ponovno ucitajte stranicu.'
      return
    }

    isConnecting.value = true
    error.value = ''
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      account.value = accounts[0] || ''
      await refresh()
      if (!isSepolia.value) await switchToSepolia()
      error.value = ''
    } catch (connectionError) {
      if (connectionError.code === -32002) {
        error.value = 'MetaMask vec ima otvoren zahtjev za povezivanje. Potvrdite ili zatvorite taj zahtjev u MetaMask prozoru.'
      } else {
        error.value = connectionError.code === 4001 ? 'Povezivanje je odbijeno u MetaMasku.' : (connectionError.message || 'Povezivanje nije uspjelo.')
      }
    } finally {
      isConnecting.value = false
    }
  }

  async function sendDemoTransaction(recipient, amount) {
    if (!isConnected.value) throw new Error('Najprije povežite MetaMask.')
    if (!isSepolia.value) await switchToSepolia()
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) throw new Error('Unesite ispravnu Ethereum adresu primatelja.')
    const value = amountToWeiHex(amount)

    isSending.value = true
    error.value = ''
    lastTransactionHash.value = ''
    try {
      const provider = getMetaMaskProvider()
      if (!provider) throw new Error('MetaMask nije instaliran.')
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account.value,
          to: recipient,
          value,
        }],
      })
      lastTransactionHash.value = hash
      return hash
    } catch (transactionError) {
      error.value = transactionError.code === 4001 ? 'Transakcija je odbijena u MetaMasku.' : (transactionError.message || 'Slanje transakcije nije uspjelo.')
      throw transactionError
    } finally {
      isSending.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  const provider = getMetaMaskProvider()
  if (provider) {
    provider.on?.('accountsChanged', (accounts) => { account.value = accounts[0] || '' })
    provider.on?.('chainChanged', (nextChainId) => { chainId.value = nextChainId })
    refresh().catch((refreshError) => {
      error.value = refreshError.message || 'MetaMask stanje nije moguce ucitati.'
    })
  }

  return {
    account, chainId, isConnecting, isSending, error, lastTransactionHash,
    isInstalled, isConnected, isSepolia, shortAccount, connect, switchToSepolia,
    sendDemoTransaction, clearError,
    defaultRecipientAddress: DEFAULT_RECIPIENT_ADDRESS,
    defaultAmountEth: DEFAULT_AMOUNT_ETH,
  }
})
