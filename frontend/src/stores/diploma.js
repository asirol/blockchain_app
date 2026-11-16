import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getBrowserProvider, getContract, hashPdf } from '../contracts/diplomaChain'

export const useDiplomaStore = defineStore('diplomas', () => {
  const activeProfile = ref('fakultet')
  const diplomas = ref([])
  const isLoading = ref(false)
  const error = ref('')
  const lastTransactionHash = ref('')

  const verifiedCount = computed(() => diplomas.value.filter((diploma) => diploma.status === 'Potvrđena').length)
  const isFaculty = computed(() => activeProfile.value === 'fakultet')

  function switchProfile(profile) {
    activeProfile.value = profile
  }

  async function loadDiplomas(ethereum) {
    if (!ethereum) return
    isLoading.value = true
    error.value = ''
    try {
      const contract = getContract(getBrowserProvider(ethereum))
      const nextId = Number(await contract.nextDiplomaId())
      const loaded = []
      for (let id = 1; id < nextId; id += 1) {
        const [studentName, studyName, issueDate, pdfHash] = await contract.getDiploma(id)
        loaded.push({
          id: String(id),
          student: studentName,
          program: studyName,
          issued: new Date(Number(issueDate) * 1000).toISOString().slice(0, 10),
          pdf: `diploma-${id}.pdf`,
          status: 'Potvrđena',
          hash: pdfHash,
        })
      }
      diplomas.value = loaded.reverse()
    } catch (loadError) {
      error.value = loadError.shortMessage || loadError.message || 'Diplome nije moguce ucitati.'
    } finally {
      isLoading.value = false
    }
  }

  async function issueDiploma(ethereum, diploma) {
    if (!ethereum) throw new Error('Najprije povežite MetaMask.')
    isLoading.value = true
    error.value = ''
    try {
      const provider = getBrowserProvider(ethereum)
      const signer = await provider.getSigner()
      const contract = getContract(signer)
      const pdfHash = await hashPdf(diploma.pdf)
      const transaction = await contract.issueDiploma(
        diploma.student,
        diploma.program,
        Math.floor(new Date(`${diploma.issued}T00:00:00Z`).getTime() / 1000),
        pdfHash,
      )
      lastTransactionHash.value = transaction.hash
      await transaction.wait()
      await loadDiplomas(ethereum)
      return transaction.hash
    } catch (issueError) {
      error.value = issueError.shortMessage || issueError.message || 'Izdavanje diplome nije uspjelo.'
      throw issueError
    } finally {
      isLoading.value = false
    }
  }

  async function verifyDiploma(ethereum, id) {
    if (!ethereum) throw new Error('MetaMask nije instaliran.')
    const contract = getContract(getBrowserProvider(ethereum))
    const [studentName, studyName, issueDate, pdfHash] = await contract.getDiploma(id)
    return {
      id: String(id),
      student: studentName,
      program: studyName,
      issued: new Date(Number(issueDate) * 1000).toISOString().slice(0, 10),
      pdf: `diploma-${id}.pdf`,
      status: 'Potvrđena',
      hash: pdfHash,
    }
  }

  return {
    diplomas, verifiedCount, isFaculty, activeProfile, isLoading, error, lastTransactionHash,
    switchProfile, loadDiplomas, issueDiploma, verifyDiploma,
  }
})
