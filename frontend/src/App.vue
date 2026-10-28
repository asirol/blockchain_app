<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useDiplomaStore } from './stores/diploma'
import { useWalletStore } from './stores/wallet'

const store = useDiplomaStore()
const wallet = useWalletStore()
const activeView = ref('Pregled')
const showIssueModal = ref(false)
const showCalendar = ref(false)
const calendarRef = ref(null)
const showAllDiplomas = ref(false)
const copiedDiplomaId = ref('')
let copyFeedbackTimeout
const verificationId = ref('')
const verificationResult = ref(null)
const form = ref({ student: '', program: '', issued: '', pdf: null })
const showProfileMenu = ref(false)
const isFaculty = computed(() => store.isFaculty)
const showWalletPanel = ref(false)
const transactionSent = ref(false)
const transactionForm = ref({
  recipient: wallet.defaultRecipientAddress,
  amount: wallet.defaultAmountEth,
})

const calendarMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const monthFormatter = new Intl.DateTimeFormat('hr-HR', { month: 'long', year: 'numeric' })
const weekDays = ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne']
const calendarDays = computed(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []

  for (let index = 0; index < offset; index += 1) days.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  while (days.length % 7) days.push(null)
  return days
})
const calendarMonthLabel = computed(() => {
  const label = monthFormatter.format(calendarMonth.value)
  return label.charAt(0).toUpperCase() + label.slice(1)
})

function verifyDiploma() {
  const found = store.diplomas.find((diploma) => diploma.id.toLowerCase() === verificationId.value.trim().toLowerCase())
  verificationResult.value = found || { invalid: true }
}

function issueDiploma() {
  if (!isFaculty.value) return
  if (!form.value.student || !form.value.program || !form.value.issued || !form.value.pdf) return
  store.addDiploma(form.value)
  form.value = { student: '', program: '', issued: '', pdf: null }
  showIssueModal.value = false
  showCalendar.value = false
}

function openIssueModal() {
  showIssueModal.value = true
  showCalendar.value = false
  const selectedDate = form.value.issued ? new Date(`${form.value.issued}T00:00:00`) : new Date()
  calendarMonth.value = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
}

function selectIssuedDate(date) {
  if (!date) return
  form.value.issued = date
  showCalendar.value = false
}

function changeCalendarMonth(offset) {
  calendarMonth.value = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + offset, 1)
}

function selectPdf(event) {
  form.value.pdf = event.target.files?.[0] || null
}

function closeAllDiplomas() {
  showAllDiplomas.value = false
}

async function copyDiplomaId(id) {
  await navigator.clipboard.writeText(id)
  copiedDiplomaId.value = id
  clearTimeout(copyFeedbackTimeout)
  copyFeedbackTimeout = window.setTimeout(() => {
    copiedDiplomaId.value = ''
  }, 2000)
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && showCalendar.value) {
    showCalendar.value = false
    return
  }
  if (event.key === 'Escape' && showAllDiplomas.value) {
    closeAllDiplomas()
  }
}

function handleCalendarOutsideClick(event) {
  if (showCalendar.value && calendarRef.value && !calendarRef.value.contains(event.target)) {
    showCalendar.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('mousedown', handleCalendarOutsideClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('mousedown', handleCalendarOutsideClick)
  clearTimeout(copyFeedbackTimeout)
})

function downloadDiploma(diploma) {
  if (diploma.pdfUrl) {
    const link = document.createElement('a')
    link.href = diploma.pdfUrl
    link.download = diploma.pdf
    link.click()
    return
  }

  function exportReport() {
    const header = 'Student,Studij,Datum izdavanja,PDF,Status'
    const rows = store.diplomas.map((diploma) => [diploma.student, diploma.program, diploma.issued, diploma.pdf, diploma.status]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','))
    const url = URL.createObjectURL(new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'izvjestaj-diploma-chain.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function focusVerifier() {
    document.getElementById('verification-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT /F1 18 Tf 72 720 Td (DiplomaChain - digitalna diploma) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`
  const url = URL.createObjectURL(new Blob([pdfContent], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = diploma.pdf
  link.click()
  URL.revokeObjectURL(url)
}

function formatIssuedDate(value) {
  if (!value || !value.includes('-')) return value
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}.`
}

function switchProfile(profile) {
  store.switchProfile(profile)
  activeView.value = profile === 'fakultet' ? 'Pregled' : 'Pretraži diplome'
  verificationResult.value = null
  verificationId.value = ''
  showProfileMenu.value = false
}

async function connectWallet() {
  if (!isFaculty.value) return
  showWalletPanel.value = true
  await wallet.connect()
}

async function sendDemoTransaction() {
  if (!isFaculty.value) return
  transactionSent.value = false
  const recipient = transactionForm.value.recipient.trim()
  const amount = transactionForm.value.amount.trim()
  try {
    await wallet.sendDemoTransaction(recipient, amount)
    transactionSent.value = true
  } catch (transactionError) {
    wallet.error = transactionError.message || 'Slanje transakcije nije uspjelo.'
    transactionSent.value = false
  }
}

</script>

<template>
  <div class="min-h-screen bg-[#f5f8fc]">
    <main>
      <header class="flex h-[78px] items-center justify-between gap-4 border-b border-[#e5ebf5] bg-white px-6 sm:px-10">
        <div class="flex min-w-0 items-center gap-6 sm:gap-8">
          <div class="flex shrink-0 items-center gap-2">
            <svg class="h-6 w-6 text-[#2563eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M6 3.5h8l4 4V20.5H6z" stroke-linejoin="round"/>
              <path d="M14 3.5v4h4M8.5 12.5l2.2 2.2 4.8-4.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="font-display font-bold text-[#172b4d]">Diploma<span class="text-[#2563eb]">Chain</span></span>
          </div>
          <div class="hidden items-center gap-2 border-l border-[#e8eef6] pl-6 text-xs text-[#8795aa] sm:flex sm:pl-8">
            <span>Radni prostor</span><span>/</span><span class="font-semibold text-[#334155]">{{ activeView }}</span>
          </div>
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-4 sm:gap-5">
          <button v-if="isFaculty" @click="wallet.isConnected ? showWalletPanel = !showWalletPanel : connectWallet()" :disabled="wallet.isConnecting" class="flex items-center gap-2 rounded-xl border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2 text-xs font-bold text-[#1d4ed8] transition hover:border-[#93b4e8] disabled:cursor-wait disabled:opacity-60">
            <span class="h-2 w-2 rounded-full" :class="wallet.isConnected && wallet.isSepolia ? 'bg-[#48b989]' : 'bg-[#d89244]'"></span>
            {{ wallet.isConnecting ? 'Čekanje MetaMaska...' : (wallet.isConnected ? wallet.shortAccount : 'Poveži MetaMask') }}
          </button>
          <div class="relative border-l border-[#e8eef6] pl-5">
            <button @click="showProfileMenu = !showProfileMenu" class="flex items-center gap-2">
              <div class="grid h-8 w-8 place-items-center rounded-full bg-[#e8f0ff] text-xs font-bold text-[#2563eb]">{{ isFaculty ? 'FA' : 'KO' }}</div>
              <span class="hidden text-xs font-semibold text-[#334155] sm:block">{{ isFaculty ? 'Fakultet' : 'Korisnik' }}</span>
              <svg class="h-3 w-3 text-[#94a3b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div v-if="showProfileMenu" class="absolute right-0 top-11 z-30 w-48 rounded-xl border border-[#e5ebf5] bg-white p-2 shadow-soft">
              <p class="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Promijeni profil</p>
              <button @click="switchProfile('fakultet')" class="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#334155] hover:bg-[#eff6ff]">Fakultet <span v-if="isFaculty" class="ml-auto text-[#2563eb]">✓</span></button>
              <button @click="switchProfile('korisnik')" class="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#334155] hover:bg-[#eff6ff]">Korisnik <span v-if="!isFaculty" class="ml-auto text-[#2563eb]">✓</span></button>
            </div>
          </div>
        </div>
      </header>

      <div v-if="isFaculty && showWalletPanel" class="border-b border-[#dce7f4] bg-[#f7faff] px-6 py-4 sm:px-10">
        <div class="mx-auto flex max-w-[1320px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563eb]">MetaMask wallet</p>
            <p class="mt-1 text-xs text-[#475569]">Račun: <span class="font-mono">{{ wallet.account }}</span></p>
            <p class="mt-1 text-xs" :class="wallet.isSepolia ? 'text-[#328861]' : 'text-[#b85d73]'">
              {{ wallet.isSepolia ? 'Povezano na Sepolia testnu mrežu.' : 'Odaberite Sepolia mrežu u MetaMasku.' }}
            </p>
          </div>
          <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div class="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
              <input v-model.trim="transactionForm.recipient" autocomplete="off" aria-label="Adresa primatelja" placeholder="0x... adresa primatelja" class="rounded-lg border border-[#dbe6f5] bg-white px-3 py-2 text-xs font-mono text-[#334155] outline-none focus:border-[#60a5fa]" />
              <input v-model.trim="transactionForm.amount" autocomplete="off" aria-label="Iznos u Sepolia ETH" inputmode="decimal" placeholder="Iznos u Sepolia ETH" class="rounded-lg border border-[#dbe6f5] bg-white px-3 py-2 text-xs text-[#334155] outline-none focus:border-[#60a5fa]" />
              <p class="text-[10px] text-[#64748b]">Šalje se: <span class="font-mono">{{ transactionForm.recipient }}</span> · {{ transactionForm.amount }} Sepolia ETH</p>
            </div>
            <a v-if="!wallet.isInstalled" href="https://metamask.io/download/" target="_blank" rel="noreferrer" class="rounded-xl bg-[#2563eb] px-4 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8]">Instaliraj MetaMask</a>
            <button v-else @click="sendDemoTransaction" :disabled="wallet.isSending || !wallet.isSepolia" class="rounded-xl bg-[#2563eb] px-4 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50">
              {{ wallet.isSending ? 'Čekanje potvrde...' : 'Pošalji demo transakciju' }}
            </button>
            <a v-if="wallet.lastTransactionHash" :href="`https://sepolia.etherscan.io/tx/${wallet.lastTransactionHash}`" target="_blank" rel="noreferrer" class="text-xs font-bold text-[#2563eb]">Otvori na Etherscanu ↗</a>
          </div>
        </div>
        <p v-if="transactionSent" class="mx-auto mt-3 max-w-[1320px] text-xs font-semibold text-[#328861]">Transakcija je poslana na Sepolia mrežu.</p>
        <p v-if="wallet.error" class="mx-auto mt-3 max-w-[1320px] text-xs font-semibold text-[#b85d73]">{{ wallet.error }}</p>
      </div>

      <template v-if="isFaculty">
      <div class="mx-auto max-w-[1480px] px-5 py-8 sm:px-10 xl:px-16">
        <section class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p class="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563eb]">Utorak, 18. lipnja 2024.</p><h1 class="font-display text-[30px] font-bold tracking-tight text-[#172b4d]">Dobrodošli</h1><p class="mt-2 text-sm text-[#64748b]">Pregledajte i izdajte digitalne diplome svoje ustanove.</p></div>
          <button @click="openIssueModal" class="flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8]"><span class="text-base">+</span> Izdaj novu diplomu</button>
        </section>

        <section class="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <div class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#e8f0ff] p-2 text-[#2563eb]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg></span><span class="rounded-full bg-[#edfaf4] px-2 py-1 text-[10px] font-bold text-[#4db88a]">+12.5%</span></div><p class="text-[11px] font-semibold text-[#64748b]">Ukupno izdanih diploma</p><p class="mt-1 font-display text-2xl font-bold text-[#172b4d]">{{ store.diplomas.length + 127 }}</p></div>
          <div class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#e8f0ff] p-2 text-[#2563eb]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg></span><span class="text-[10px] font-bold text-[#a1a0b3]">Ukupno</span></div><p class="text-[11px] font-semibold text-[#64748b]">Potrošeno za blockchain gas</p><p class="mt-1 font-display text-2xl font-bold text-[#172b4d]">0.42 ETH</p></div>
        </section>

        <div class="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <section class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-6">
            <div class="mb-6 flex items-center justify-between"><div><h2 class="font-display text-base font-bold text-[#1e3a5f]">Nedavne diplome</h2><p class="mt-1 text-xs text-[#64748b]">Najnovije vjerodajnice vaše ustanove.</p></div><button @click="showAllDiplomas = true" class="text-xs font-bold text-[#2563eb]">Prikaži sve <span class="ml-1">→</span></button></div>
            <div class="overflow-x-auto"><table class="w-full min-w-[680px] text-left"><thead><tr class="border-b border-[#eaf0f7] text-[10px] uppercase tracking-wider text-[#94a3b8]"><th class="pb-3 font-bold">Student</th><th class="pb-3 font-bold">ID</th><th class="pb-3 font-bold">Studij</th><th class="pb-3 font-bold">Izdano</th><th class="pb-3 font-bold">PDF</th></tr></thead><tbody><tr v-for="diploma in store.diplomas" :key="diploma.id" class="border-b border-[#f1f5f9] last:border-0"><td class="py-4 text-xs font-semibold text-[#334155]">{{ diploma.student }}</td><td class="py-4"><button type="button" @click="copyDiplomaId(diploma.id)" :aria-label="copiedDiplomaId === diploma.id ? `ID diplome ${diploma.id} je kopiran` : `Kopiraj ID diplome ${diploma.id}`" aria-live="polite" class="font-mono text-[9px] font-normal text-[#2563eb] hover:text-[#1d4ed8]">{{ copiedDiplomaId === diploma.id ? 'Kopirano' : diploma.id }}</button></td><td class="py-4 text-xs text-[#64748b]">{{ diploma.program }}</td><td class="py-4 text-xs text-[#64748b]">{{ formatIssuedDate(diploma.issued) }}</td><td class="py-4"><button @click="downloadDiploma(diploma)" class="text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8]">Preuzmi PDF</button></td></tr></tbody></table></div>
          </section>
          <section id="verification-card" class="relative overflow-hidden rounded-2xl bg-[#12325b] p-6 text-white"><div class="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-[#4d6f9c] opacity-40"></div><div class="absolute -bottom-20 -right-3 h-48 w-48 rounded-full border border-[#4d6f9c] opacity-30"></div><div class="relative"><div class="mb-7 flex items-center justify-between"><div class="grid h-9 w-9 place-items-center rounded-xl bg-[#2563eb]"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3.5h8l4 4V20.5H6z" stroke-linejoin="round"/><path d="M14 3.5v4h4M8.5 12.5l2.2 2.2 4.8-4.8" stroke-linecap="round" stroke-linejoin="round"/></svg>          </div><span class="rounded-full border border-[#44668f] px-2.5 py-1 text-[9px] font-bold text-[#c4d5eb]">SEPOLIA TESTNA MREŽA</span></div><h2 class="font-display text-xl font-bold">Provjeri diplomu</h2><p class="mt-2 max-w-[270px] text-xs leading-5 text-[#c4d5eb]">Odmah provjerite je li vjerodajnica autentična i nepromijenjena.</p><div class="mt-7 flex gap-2 rounded-xl bg-white/10 p-1.5"><input v-model="verificationId" @keyup.enter="verifyDiploma" placeholder="Unesite ID diplome..." class="min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none placeholder:text-[#9db4d1]" /><button @click="verifyDiploma" class="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-[#1d4ed8]">Provjeri</button></div><div v-if="verificationResult" class="mt-3 rounded-lg bg-white/10 p-3 text-xs"><span v-if="!verificationResult.invalid" class="text-[#8ee2bd]">✓ Pronađena je autentična diploma: {{ verificationResult.student }}</span><span v-else class="text-[#ffabbc]">ID nije pronađen. Provjerite unos i pokušajte ponovno.</span></div></div></section>
        </div>

      </div>
      <div v-if="showAllDiplomas" class="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-[#172b4d]/40 p-4 backdrop-blur-sm sm:p-6" @click.self="closeAllDiplomas">
        <div role="dialog" aria-modal="true" aria-labelledby="all-diplomas-title" class="my-auto w-full max-w-[1180px] rounded-2xl bg-[#f7f8fc] p-5 shadow-2xl sm:p-8">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div><p class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563eb]">Fakultet</p><h2 id="all-diplomas-title" class="font-display text-2xl font-bold text-[#1e3a5f]">Sve diplome</h2><p class="mt-1 text-xs text-[#64748b]">Pregled svih izdanih vjerodajnica vaše ustanove.</p></div>
            <button @click="closeAllDiplomas" aria-label="Zatvori pregled svih diploma" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xl text-[#94a3b8] transition hover:bg-white hover:text-[#2563eb]">×</button>
          </div>
          <div class="overflow-x-auto rounded-2xl border border-[#e5ebf5] bg-white shadow-soft"><table class="w-full min-w-[760px] text-left"><thead><tr class="border-b border-[#eaf0f7] text-[10px] uppercase tracking-wider text-[#94a3b8]"><th class="p-4 font-bold">Student</th><th class="p-4 font-bold">ID</th><th class="p-4 font-bold">Studij</th><th class="p-4 font-bold">Izdano</th><th class="p-4 font-bold">PDF</th></tr></thead><tbody><tr v-for="diploma in store.diplomas" :key="`all-${diploma.id}`" class="border-b border-[#f1f5f9] last:border-0"><td class="p-4 text-xs font-semibold text-[#334155]">{{ diploma.student }}</td><td class="p-4"><button type="button" @click="copyDiplomaId(diploma.id)" :aria-label="copiedDiplomaId === diploma.id ? `ID diplome ${diploma.id} je kopiran` : `Kopiraj ID diplome ${diploma.id}`" aria-live="polite" class="font-mono text-[9px] font-normal text-[#2563eb] hover:text-[#1d4ed8]">{{ copiedDiplomaId === diploma.id ? 'Kopirano' : diploma.id }}</button></td><td class="p-4 text-xs text-[#64748b]">{{ diploma.program }}</td><td class="p-4 text-xs text-[#64748b]">{{ formatIssuedDate(diploma.issued) }}</td><td class="p-4"><button @click="downloadDiploma(diploma)" class="text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8]">Preuzmi PDF</button></td></tr></tbody></table></div>
        </div>
      </div>
      </template>

      <div v-else class="mx-auto max-w-[920px] px-5 py-10 sm:px-10 lg:px-14">
        <section class="mb-8">
          <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563eb]">Provjera vjerodajnica</p>
          <h1 class="font-display text-[30px] font-bold tracking-tight text-[#172b4d]">Pretražite diplomu</h1>
          <p class="mt-2 max-w-xl text-sm text-[#64748b]">Unesite ID diplome kako biste provjerili njezinu autentičnost na blockchainu.</p>
        </section>
        <section class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-6 sm:p-8">
          <div class="mb-6 flex items-center gap-3"><div class="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f0ff] text-[#2563eb]">⌕</div><div><h2 class="font-display text-base font-bold text-[#1e3a5f]">Pretraži diplomu</h2><p class="mt-1 text-xs text-[#64748b]">Provjera je dostupna svim korisnicima.</p></div></div>
          <div class="flex flex-col gap-3 sm:flex-row"><input v-model="verificationId" @keyup.enter="verifyDiploma" placeholder="ID diplome" class="min-w-0 flex-1 rounded-xl border border-[#dbe6f5] px-4 py-3 text-sm outline-none focus:border-[#60a5fa]" /><button @click="verifyDiploma" class="rounded-xl bg-[#2563eb] px-6 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8]">Provjeri diplomu</button></div>
          <div v-if="verificationResult" :class="verificationResult.invalid ? 'border-[#f2cad4] bg-[#fff7f8] text-[#b85d73]' : 'border-[#bce8d4] bg-[#f3fcf7] text-[#328861]'" class="mt-5 rounded-xl border p-4 text-sm">
            <strong v-if="!verificationResult.invalid" class="block">Diploma je autentična</strong><strong v-else class="block">Diploma nije pronađena</strong>
            <span v-if="!verificationResult.invalid" class="mt-1 block text-xs">Student: {{ verificationResult.student }} · Studij: {{ verificationResult.program }}</span><button v-if="!verificationResult.invalid" @click="downloadDiploma(verificationResult)" class="mt-3 text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8]">Preuzmi PDF diplome</button><span v-else class="mt-1 block text-xs">Provjerite ID i pokušajte ponovno.</span>
          </div>
        </section>
      </div>
    </main>

    <div v-if="showIssueModal && isFaculty" class="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-[#172b4d]/40 p-5 backdrop-blur-sm">
      <div class="max-h-[calc(100vh-2.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"><div class="mb-6 flex items-start justify-between"><div><h2 class="font-display text-xl font-bold text-[#1e3a5f]">Izdaj novu diplomu</h2><p class="mt-1 text-xs text-[#64748b]">Vjerodajnica će biti zabilježena na Sepoliji.</p></div><button @click="showIssueModal = false; showCalendar = false" aria-label="Zatvori modal" class="text-xl text-[#94a3b8]">×</button></div><label class="mb-2 block text-xs font-bold text-[#475569]">Ime i prezime studenta</label><input v-model="form.student" class="mb-4 w-full rounded-xl border border-[#dbe6f5] px-4 py-3 text-sm outline-none focus:border-[#60a5fa]" placeholder="Ime i prezime" /><label class="mb-2 block text-xs font-bold text-[#475569]">Naziv studija / smjera</label><input v-model="form.program" class="mb-4 w-full rounded-xl border border-[#dbe6f5] px-4 py-3 text-sm outline-none focus:border-[#60a5fa]" placeholder="Naziv studija / smjera" /><label class="mb-2 block text-xs font-bold text-[#475569]">Datum izdavanja</label><div ref="calendarRef" class="relative mb-4"><button type="button" @click="showCalendar = !showCalendar" :aria-expanded="showCalendar" aria-haspopup="dialog" class="flex w-full items-center justify-between rounded-xl border border-[#93b4e8] bg-[#f8fbff] px-4 py-3 text-left text-sm font-semibold text-[#2563eb] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe]"><span>{{ form.issued || 'Odaberi datum' }}</span><span aria-hidden="true">▾</span></button><div v-if="showCalendar" role="dialog" aria-label="Odabir datuma" class="absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-xl"><div class="mb-4 flex items-center justify-between"><button type="button" @click="changeCalendarMonth(-1)" aria-label="Prethodni mjesec" class="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold text-[#2563eb] hover:bg-[#eff6ff]">‹</button><strong class="text-sm text-[#1e3a5f]">{{ calendarMonthLabel }}</strong><button type="button" @click="changeCalendarMonth(1)" aria-label="Sljedeci mjesec" class="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold text-[#2563eb] hover:bg-[#eff6ff]">›</button></div><div class="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase text-[#94a3b8]"><span v-for="day in weekDays" :key="day">{{ day }}</span></div><div class="grid grid-cols-7 gap-1" role="grid"><span v-for="(date, index) in calendarDays" :key="date || `empty-${index}`" class="grid aspect-square place-items-center"><button v-if="date" type="button" @click="selectIssuedDate(date)" :aria-label="`Odaberi ${date}`" :aria-pressed="form.issued === date" class="grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold transition hover:bg-[#dbeafe] focus:outline-none focus:ring-2 focus:ring-[#60a5fa]" :class="form.issued === date ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]' : 'text-[#334155]'">{{ Number(date.slice(-2)) }}</button></span></div></div></div><label class="mb-2 block text-xs font-bold text-[#475569]">PDF diplome</label><input id="pdf-upload" @change="selectPdf" type="file" accept="application/pdf" class="hidden" /><label for="pdf-upload" class="mb-6 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#93b4e8] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#2563eb] transition hover:border-[#2563eb] hover:bg-[#eff6ff]"><span class="truncate">{{ form.pdf ? form.pdf.name : 'Odaberi PDF datoteku' }}</span><span class="shrink-0 rounded-lg bg-[#e8f0ff] px-3 py-2 text-xs font-bold text-[#2563eb]">Odaberi</span></label><div class="flex justify-end gap-3"><button @click="showIssueModal = false; showCalendar = false" class="rounded-xl px-4 py-3 text-xs font-bold text-[#64748b]">Odustani</button><button @click="issueDiploma" class="rounded-xl bg-[#2563eb] px-5 py-3 text-xs font-bold text-white shadow-blue">Izdaj diplomu</button></div></div>
    </div>
  </div>
</template>
