import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ethers } from 'ethers'
import {
  DIPLOMA_CHAIN_ID,
  DIPLOMA_CHAIN_ADDRESS,
  getDiplomaErrorMessage,
  getBrowserProvider,
  getContract,
  getReadOnlyProvider,
  hashPdf,
} from '../contracts/diplomaChain'

export const useDiplomaStore = defineStore('diplomas', () => {
  const diplomas = ref([])
  const issuedDiplomaCount = ref(null)
  const totalIssuanceGasEth = ref(null)
  const ownerAddress = ref('')
  const isLoading = ref(false)
  const error = ref('')
  const lastTransactionHash = ref('')

  const verifiedCount = computed(() => diplomas.value.filter((diploma) => diploma.status === 'Potvrđena').length)

  async function loadDiplomas() {
    isLoading.value = true
    error.value = ''
    issuedDiplomaCount.value = null
    totalIssuanceGasEth.value = null
    try {
      const provider = getReadOnlyProvider()
      const contract = getContract(provider)
      const [currentOwner, nextId, issuanceEvents] = await Promise.all([
        contract.owner(),
        contract.nextDiplomaId(),
        contract.queryFilter(contract.filters.DiplomaIssued(), 0, 'latest'),
      ])
      ownerAddress.value = currentOwner
      issuedDiplomaCount.value = (nextId - 1n).toString()
      const loaded = []
      for (let id = 1n; id < nextId; id += 1n) {
        const [studentName, studyName, issueDate, pdfHash] = await contract.getDiploma(id)
        loaded.push({
          id: String(id),
          student: studentName,
          program: studyName,
          issued: new Date(Number(issueDate) * 1000).toISOString().slice(0, 10),
          status: 'Potvrđena',
          hash: pdfHash,
        })
      }

      const transactionHashes = [...new Set(issuanceEvents.map((event) => event.transactionHash))]
      const receipts = await Promise.all(
        transactionHashes.map((hash) => provider.getTransactionReceipt(hash)),
      )
      if (receipts.some((receipt) => !receipt)) {
        throw new Error('Nije moguće učitati potvrde svih transakcija izdavanja.')
      }
      const totalGasWei = receipts.reduce((total, receipt) => {
        if (receipt.gasPrice == null) {
          throw new Error('Nedostaje cijena naknade za transakciju izdavanja.')
        }
        return total + receipt.gasUsed * receipt.gasPrice
      }, 0n)

      diplomas.value = loaded.reverse()
      totalIssuanceGasEth.value = ethers.formatEther(totalGasWei)
    } catch (loadError) {
      diplomas.value = []
      ownerAddress.value = ''
      issuedDiplomaCount.value = null
      totalIssuanceGasEth.value = null
      error.value = loadError.shortMessage || loadError.message || 'Diplome nije moguće učitati.'
    } finally {
      isLoading.value = false
    }
  }

  async function issueDiploma(ethereum, diploma) {
    if (!ethereum) throw new Error('MetaMask nije pronađen. Instalirajte ga i ponovno učitajte stranicu.')
    isLoading.value = true
    error.value = ''
    try {
      const provider = getBrowserProvider(ethereum)
      const network = await provider.getNetwork()
      if (network.chainId !== BigInt(DIPLOMA_CHAIN_ID)) {
        throw new Error('MetaMask nije povezan s mrežom pametnog ugovora. Odaberite Hardhat Localhost (ID lanca 31337).')
      }
      const contractCode = await provider.getCode(DIPLOMA_CHAIN_ADDRESS)
      if (contractCode === '0x') {
        throw new Error('Na ovoj adresi nije objavljen ugovor. Ponovno objavite ugovor i ažurirajte VITE_DIPLOMA_CHAIN_ADDRESS u frontend/.env.')
      }
      const signer = await provider.getSigner()
      const contract = getContract(signer)
      const signerAddress = await signer.getAddress()
      const currentOwner = await contract.owner()
      if (signerAddress.toLowerCase() !== currentOwner.toLowerCase()) {
        throw new Error(`Ovaj račun nije vlasnik ugovora. Povežite račun ${currentOwner} u MetaMasku.`)
      }

      const issueDate = new Date(`${diploma.issued}T00:00:00Z`)
      if (Number.isNaN(issueDate.getTime())) {
        throw new Error('Odaberite ispravan datum izdavanja diplome.')
      }
      const today = new Date()
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      if (diploma.issued > todayIso) {
        throw new Error('Datum izdavanja ne može biti u budućnosti.')
      }
      if (!diploma.pdf || (diploma.pdf.type && diploma.pdf.type !== 'application/pdf')) {
        throw new Error('Odabrana datoteka nije prepoznata kao PDF. Odaberite PDF datoteku.')
      }

      const pdfHash = await hashPdf(diploma.pdf)
      const issueArguments = [
        diploma.student,
        diploma.program,
        Math.floor(issueDate.getTime() / 1000),
        pdfHash,
      ]

      await contract.issueDiploma.staticCall(...issueArguments)
      const transaction = await contract.issueDiploma(...issueArguments)
      lastTransactionHash.value = transaction.hash
      const receipt = await transaction.wait()
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transakcija izdavanja diplome nije uspješno potvrđena.')
      }
      await loadDiplomas()
      return transaction.hash
    } catch (issueError) {
      const message = getDiplomaErrorMessage(issueError)
      error.value = message
      throw new Error(message, { cause: issueError })
    } finally {
      isLoading.value = false
    }
  }

  async function verifyDiplomaPdf(file) {
    if (!file || file.type !== 'application/pdf') {
      throw new Error('Odaberite PDF datoteku za provjeru.')
    }

    const pdfHash = await hashPdf(file)
    const contract = getContract(getReadOnlyProvider())
    const [id, studentName, studyName, issueDate, storedPdfHash] =
      await contract.getDiplomaByHash(pdfHash)

    return {
      id: id.toString(),
      student: studentName,
      program: studyName,
      issued: new Date(Number(issueDate) * 1000).toISOString().slice(0, 10),
      hash: storedPdfHash,
    }
  }

  return {
    diplomas, issuedDiplomaCount, totalIssuanceGasEth, ownerAddress, verifiedCount, isLoading, error, lastTransactionHash,
    loadDiplomas, issueDiploma, verifyDiplomaPdf,
  }
})
