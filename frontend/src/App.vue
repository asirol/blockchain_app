<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useDiplomaStore } from './stores/diploma'
import { useWalletStore } from './stores/wallet'

const store = useDiplomaStore()
const wallet = useWalletStore()
const isFacultyRoute = ref(window.location.pathname.replace(/\/+$/, '') === '/fakultet')
const activeView = computed(() => isFacultyRoute.value ? 'Fakultetski pristup' : 'Javna provjera')
const showIssueModal = ref(false)
const showCalendar = ref(false)
const calendarRef = ref(null)
const showAllDiplomas = ref(false)
const copiedDiplomaId = ref('')
let copyFeedbackTimeout
const verificationPdf = ref(null)
const verificationResult = ref(null)
const verificationError = ref('')
const isVerifying = ref(false)
const issueError = ref('')
const form = ref({ student: '', program: '', issued: '', pdf: null })
const issueAttempted = ref(false)
const studyNamePattern = /^[A-ZČĆĐŠŽ]+ \([^()\r\n]+\) - (?=[A-Za-zČĆĐŠŽčćđšž0-9. ]*\.)[A-Za-zČĆĐŠŽčćđšž0-9][A-Za-zČĆĐŠŽčćđšž0-9.]*(?: [A-Za-zČĆĐŠŽčćđšž0-9][A-Za-zČĆĐŠŽčćđšž0-9.]*)*$/u
const isStudyNameValid = computed(() => studyNamePattern.test(form.value.program))
const isFutureDate = (date) => Boolean(date && date > todayDate)
const isContractOwner = computed(() => Boolean(
  wallet.account
  && store.ownerAddress
  && wallet.account.toLowerCase() === store.ownerAddress.toLowerCase(),
))
const hasFacultyAccess = computed(() => isContractOwner.value && wallet.isLocalhost)
const canIssueDiploma = hasFacultyAccess
const showWalletPanel = ref(false)
const transactionSent = ref(false)
const transactionForm = ref({
  recipient: wallet.defaultRecipientAddress,
  amount: wallet.defaultAmountEth,
})

const calendarMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const todayLabel = new Intl.DateTimeFormat('hr-HR', { dateStyle: 'full' }).format(new Date())
const today = new Date()
const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
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
const canGoNextMonth = computed(() => {
  const nextMonth = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 1)
  const firstDayOfNextMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
  return firstDayOfNextMonth <= todayDate
})

async function verifyDiploma() {
  verificationError.value = ''
  verificationResult.value = null
  if (!verificationPdf.value) {
    verificationError.value = 'Odaberite PDF datoteku za provjeru.'
    return
  }
  isVerifying.value = true
  try {
    verificationResult.value = await store.verifyDiplomaPdf(verificationPdf.value)
  } catch (error) {
    const message = error.reason
      || error.info?.error?.message
      || error.shortMessage
      || error.message
      || 'Provjera PDF-a nije uspjela.'
    if (message.includes('Diploma s tim hashom ne postoji.')) {
      verificationResult.value = { invalid: true }
    } else {
      verificationError.value = message
    }
  } finally {
    isVerifying.value = false
  }
}

async function issueDiploma() {
  if (!hasFacultyAccess.value) return
  issueAttempted.value = true
  issueError.value = ''
  if (!form.value.student.trim() || !isStudyNameValid.value || !form.value.issued || !form.value.pdf) {
    issueError.value = 'Sva polja su obvezna. Popunite crveno označena polja.'
    return
  }
  if (isFutureDate(form.value.issued)) {
    issueError.value = 'Datum izdavanja ne može biti u budućnosti.'
    return
  }
  if (!form.value.student || !form.value.issued || !form.value.pdf) return
  try {
    await store.issueDiploma(window.ethereum, form.value)
    form.value = { student: '', program: '', issued: '', pdf: null }
    issueAttempted.value = false
    showIssueModal.value = false
    showCalendar.value = false
  } catch (error) {
    issueError.value = error.shortMessage || error.message || 'Izdavanje diplome nije uspjelo.'
  }
}

function openIssueModal() {
  showIssueModal.value = true
  showCalendar.value = false
  issueAttempted.value = false
  issueError.value = ''
  const selectedDate = form.value.issued ? new Date(`${form.value.issued}T00:00:00`) : new Date()
  calendarMonth.value = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
}

function selectIssuedDate(date) {
  if (!date || isFutureDate(date)) return
  form.value.issued = date
  showCalendar.value = false
}

function changeCalendarMonth(offset) {
  const nextMonth = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + offset, 1)
  const firstDayOfNextMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
  if (offset > 0 && firstDayOfNextMonth > todayDate) return
  calendarMonth.value = nextMonth
}

function selectPdf(event) {
  form.value.pdf = event.target.files?.[0] || null
}

function selectVerificationPdf(event) {
  verificationPdf.value = event.target.files?.[0] || null
  verificationResult.value = null
  verificationError.value = ''
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
  store.loadDiplomas()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('mousedown', handleCalendarOutsideClick)
  clearTimeout(copyFeedbackTimeout)
})

function formatIssuedDate(value) {
  if (!value || !value.includes('-')) return value
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}.`
}

async function connectWallet() {
  if (!isFacultyRoute.value) return
  showWalletPanel.value = true
  await wallet.connect()
}

async function sendDemoTransaction() {
  if (!hasFacultyAccess.value) return
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
          <button v-if="isFacultyRoute && hasFacultyAccess" @click="showWalletPanel = !showWalletPanel" class="flex items-center gap-2 rounded-xl border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2 text-xs font-bold text-[#1d4ed8] transition hover:border-[#93b4e8]">
            <span class="h-2 w-2 rounded-full" :class="wallet.isConnected && wallet.isLocalhost ? 'bg-[#48b989]' : 'bg-[#d89244]'"></span>
            {{ wallet.shortAccount }}
          </button>
          <a :href="isFacultyRoute ? '/' : '/fakultet'" class="rounded-xl border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2 text-xs font-bold text-[#1d4ed8] transition hover:border-[#93b4e8]">
            {{ isFacultyRoute ? 'Javna provjera' : 'Pristup za fakultet' }}
          </a>
        </div>
      </header>

      <div v-if="isFacultyRoute && hasFacultyAccess && showWalletPanel" class="border-b border-[#dce7f4] bg-[#f7faff] px-6 py-4 sm:px-10">
        <div class="mx-auto flex max-w-[1320px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563eb]">MetaMask novčanik</p>
            <p class="mt-1 text-xs text-[#475569]">Račun: <span class="font-mono">{{ wallet.account }}</span></p>
            <p class="mt-1 text-xs" :class="wallet.isLocalhost ? 'text-[#328861]' : 'text-[#b85d73]'">
              {{ wallet.isLocalhost ? 'Povezano na lokalnu Hardhat mrežu.' : 'Odaberite Hardhat Localhost mrežu u MetaMasku.' }}
            </p>
          </div>
          <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div class="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
              <input v-model.trim="transactionForm.recipient" autocomplete="off" aria-label="Adresa primatelja" placeholder="0x... adresa primatelja" class="rounded-lg border border-[#dbe6f5] bg-white px-3 py-2 text-xs font-mono text-[#334155] outline-none focus:border-[#60a5fa]" />
              <input v-model.trim="transactionForm.amount" autocomplete="off" aria-label="Iznos u lokalnom ETH-u" inputmode="decimal" placeholder="Iznos u lokalnom ETH-u" class="rounded-lg border border-[#dbe6f5] bg-white px-3 py-2 text-xs text-[#334155] outline-none focus:border-[#60a5fa]" />
              <p class="text-[10px] text-[#64748b]">Šalje se: <span class="font-mono">{{ transactionForm.recipient }}</span> · {{ transactionForm.amount }} lokalnog ETH-a</p>
            </div>
            <a v-if="!wallet.isInstalled" href="https://metamask.io/download/" target="_blank" rel="noreferrer" class="rounded-xl bg-[#2563eb] px-4 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8]">Instaliraj MetaMask</a>
            <button v-else @click="sendDemoTransaction" :disabled="wallet.isSending || !wallet.isLocalhost" class="rounded-xl bg-[#2563eb] px-4 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50">
              {{ wallet.isSending ? 'Čekanje potvrde...' : 'Pošalji probnu transakciju' }}
            </button>
            <p v-if="wallet.lastTransactionHash" class="max-w-[320px] break-all text-[10px] text-[#64748b]">Hash lokalne transakcije: {{ wallet.lastTransactionHash }}</p>
          </div>
        </div>
        <p v-if="transactionSent" class="mx-auto mt-3 max-w-[1320px] text-xs font-semibold text-[#328861]">Transakcija je poslana na lokalnu Hardhat mrežu.</p>
        <p v-if="wallet.error" class="mx-auto mt-3 max-w-[1320px] text-xs font-semibold text-[#b85d73]">{{ wallet.error }}</p>
      </div>

      <template v-if="isFacultyRoute">
        <section v-if="!hasFacultyAccess" class="mx-auto max-w-[680px] px-5 py-16 sm:px-10">
          <div class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-8 text-center">
            <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563eb]">Fakultetski pristup</p>
            <h1 class="font-display text-2xl font-bold text-[#172b4d]">Prijava za fakultet</h1>
            <p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#64748b]">
              Za pristup povežite MetaMask s računom koji je vlasnik ovog ugovora. DiplomaChain provjerit će račun i mrežu prije prikaza fakultetskog sučelja.
            </p>
            <button @click="connectWallet" :disabled="wallet.isConnecting" class="mt-6 rounded-xl bg-[#2563eb] px-5 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-60">
              {{ wallet.isConnecting ? 'Čekanje MetaMaska...' : 'Poveži MetaMask za pristup' }}
            </button>
            <a v-if="!wallet.isInstalled" href="https://metamask.io/download/" target="_blank" rel="noreferrer" class="mt-4 block text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8]">Instaliraj MetaMask</a>
            <p v-if="wallet.account && !isContractOwner" class="mt-4 text-xs font-semibold text-[#b85d73]">
              Povezani račun nije vlasnik ugovora.<span v-if="store.ownerAddress" class="mt-1 block font-mono">Vlasnik: {{ store.ownerAddress }}</span>
            </p>
            <p v-else-if="isContractOwner && !wallet.isLocalhost" class="mt-4 text-xs font-semibold text-[#b85d73]">Odaberite Hardhat Localhost mrežu u MetaMasku.</p>
            <p v-if="wallet.error" class="mt-4 text-xs font-semibold text-[#b85d73]">{{ wallet.error }}</p>
            <p v-if="store.error" class="mt-4 text-xs font-semibold text-[#b85d73]">{{ store.error }}</p>
          </div>
        </section>
        <template v-else>
      <div class="mx-auto max-w-[1480px] px-5 py-8 sm:px-10 xl:px-16">
        <section class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p class="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563eb]">{{ todayLabel }}</p><h1 class="font-display text-[30px] font-bold tracking-tight text-[#172b4d]">Dobrodošli</h1><p class="mt-2 text-sm text-[#64748b]">Pregledajte i izdajte digitalne diplome svoje ustanove.</p></div>
          <button @click="openIssueModal" :disabled="!canIssueDiploma || store.isLoading" class="flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"><span class="text-base">+</span> Izdaj novu diplomu</button>
        </section>
        <p v-if="store.error" class="mb-5 rounded-xl border border-[#f2cad4] bg-[#fff7f8] px-4 py-3 text-xs font-semibold text-[#b85d73]">{{ store.error }}</p>
        <p v-else-if="!canIssueDiploma" class="mb-5 rounded-xl border border-[#dbe6f5] bg-white px-4 py-3 text-xs text-[#64748b]">
          Za izdavanje povežite MetaMask s mrežom Hardhat Localhost i računom vlasnika ugovora.
          <span v-if="store.ownerAddress" class="font-mono">Vlasnik: {{ store.ownerAddress }}</span>
        </p>

        <section class="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <div class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#e8f0ff] p-2 text-[#2563eb]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 0 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg></span></div><p class="text-[11px] font-semibold text-[#64748b]">Ukupno izdanih diploma</p><p class="mt-1 font-display text-2xl font-bold text-[#172b4d]">{{ store.issuedDiplomaCount ?? '—' }}</p></div>
          <div class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#e8f0ff] p-2 text-[#2563eb]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg></span></div><p class="text-[11px] font-semibold text-[#64748b]">Ukupne naknade za izdavanje diploma</p><p class="mt-1 font-display text-2xl font-bold text-[#172b4d]">{{ store.totalIssuanceGasEth === null ? '—' : `${store.totalIssuanceGasEth} ETH` }}</p></div>
        </section>

        <div class="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <section class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-6">
            <div class="mb-6 flex items-center justify-between"><div><h2 class="font-display text-base font-bold text-[#1e3a5f]">Nedavne diplome</h2><p class="mt-1 text-xs text-[#64748b]">Najnovije vjerodajnice vaše ustanove.</p></div><button @click="showAllDiplomas = true" class="text-xs font-bold text-[#2563eb]">Prikaži sve <span class="ml-1">→</span></button></div>
            <div v-if="store.isLoading && !store.diplomas.length" class="py-8 text-center text-xs text-[#64748b]">Učitavanje diploma s blockchaina...</div><div v-else-if="!store.diplomas.length" class="py-8 text-center text-xs text-[#64748b]">Još nema izdanih diploma na ugovoru.</div><div v-else class="overflow-x-auto"><table class="w-full min-w-[560px] text-left"><thead><tr class="border-b border-[#eaf0f7] text-[10px] uppercase tracking-wider text-[#94a3b8]"><th class="pb-3 font-bold">Student</th><th class="pb-3 font-bold">ID</th><th class="pb-3 font-bold">Studij</th><th class="pb-3 font-bold">Izdano</th></tr></thead><tbody><tr v-for="diploma in store.diplomas" :key="diploma.id" class="border-b border-[#f1f5f9] last:border-0"><td class="py-4 text-xs font-semibold text-[#334155]">{{ diploma.student }}</td><td class="py-4"><button type="button" @click="copyDiplomaId(diploma.id)" :aria-label="copiedDiplomaId === diploma.id ? `ID diplome ${diploma.id} je kopiran` : `Kopiraj ID diplome ${diploma.id}`" aria-live="polite" class="font-mono text-[9px] font-normal text-[#2563eb] hover:text-[#1d4ed8]">{{ copiedDiplomaId === diploma.id ? 'Kopirano' : diploma.id }}</button></td><td class="py-4 text-xs text-[#64748b]">{{ diploma.program }}</td><td class="py-4 text-xs text-[#64748b]">{{ formatIssuedDate(diploma.issued) }}</td></tr></tbody></table></div>
          </section>
          <section id="verification-card" class="rounded-2xl bg-[#12325b] p-6 text-white sm:p-8">
            <div class="mb-6 flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#c4d5eb]">⌕</div>
              <div>
                <h2 class="font-display text-base font-bold text-white">Provjeri PDF diplome</h2>
                <p class="mt-1 text-xs text-[#c4d5eb]">PDF se obrađuje lokalno; datoteka se ne šalje na blockchain.</p>
              </div>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row">
              <input type="file" accept="application/pdf" @change="selectVerificationPdf" class="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#2563eb]" />
              <button @click="verifyDiploma" :disabled="isVerifying || !verificationPdf" class="cursor-pointer rounded-xl bg-white px-6 py-3 text-xs font-bold text-[#1d4ed8] shadow-blue transition hover:bg-[#eff6ff] disabled:opacity-50">{{ isVerifying ? 'Provjera...' : 'Provjeri PDF' }}</button>
            </div>
            <div v-if="verificationResult" class="mt-5 rounded-xl border p-4 text-sm" :class="verificationResult.invalid ? 'border-[#d98ca0]/50 bg-[#fff7f8]/10 text-[#ffd9e1]' : 'border-[#8ee2bd]/50 bg-[#8ee2bd]/10 text-[#d8fbea]'">
            <template v-if="!verificationResult.invalid">
              <strong class="block">✓ Diploma je potvrđena i vjerodostojna</strong>
              <span class="mt-2 block text-xs leading-5"><span class="font-bold">Student:</span> {{ verificationResult.student }}<br><span class="font-bold">Studij:</span> {{ verificationResult.program }}<br><span class="font-bold">Izdano:</span> {{ formatIssuedDate(verificationResult.issued) }}</span>
            </template>
            <span v-else class="block"><strong class="block">Diploma nije potvrđena</strong><span class="mt-1 block text-xs">Datoteka mora biti točno ista kao ona korištena pri izdavanju.</span></span>
            </div>
            <p v-if="verificationError && verificationResult?.invalid !== true" class="mt-3 text-xs text-[#ffabbc]">{{ verificationError }}</p>
          </section>
        </div>

      </div>
      <div v-if="showAllDiplomas" class="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-[#172b4d]/40 p-4 backdrop-blur-sm sm:p-6 cursor-pointer" @click.self="closeAllDiplomas">
        <div role="dialog" aria-modal="true" aria-labelledby="all-diplomas-title" class="my-auto w-full max-w-[1180px] rounded-2xl bg-[#f7f8fc] p-5 shadow-2xl sm:p-8 cursor-default">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div><p class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563eb]">Fakultet</p><h2 id="all-diplomas-title" class="font-display text-2xl font-bold text-[#1e3a5f]">Sve diplome</h2><p class="mt-1 text-xs text-[#64748b]">Pregled svih izdanih vjerodajnica vaše ustanove.</p></div>
            <button @click="closeAllDiplomas" aria-label="Zatvori pregled svih diploma" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xl text-[#94a3b8] transition hover:bg-white hover:text-[#2563eb]">×</button>
          </div>
          <div class="overflow-x-auto rounded-2xl border border-[#e5ebf5] bg-white shadow-soft"><table class="w-full min-w-[640px] text-left"><thead><tr class="border-b border-[#eaf0f7] text-[10px] uppercase tracking-wider text-[#94a3b8]"><th class="p-4 font-bold">Student</th><th class="p-4 font-bold">ID</th><th class="p-4 font-bold">Studij</th><th class="p-4 font-bold">Izdano</th></tr></thead><tbody><tr v-for="diploma in store.diplomas" :key="`all-${diploma.id}`" class="border-b border-[#f1f5f9] last:border-0"><td class="p-4 text-xs font-semibold text-[#334155]">{{ diploma.student }}</td><td class="p-4"><button type="button" @click="copyDiplomaId(diploma.id)" :aria-label="copiedDiplomaId === diploma.id ? `ID diplome ${diploma.id} je kopiran` : `Kopiraj ID diplome ${diploma.id}`" aria-live="polite" class="font-mono text-[9px] font-normal text-[#2563eb] hover:text-[#1d4ed8]">{{ copiedDiplomaId === diploma.id ? 'Kopirano' : diploma.id }}</button></td><td class="p-4 text-xs text-[#64748b]">{{ diploma.program }}</td><td class="p-4 text-xs text-[#64748b]">{{ formatIssuedDate(diploma.issued) }}</td></tr></tbody></table></div>
        </div>
      </div>
      </template>
      </template>

      <div v-else class="mx-auto max-w-[920px] px-5 py-10 sm:px-10 lg:px-14">
        <section class="mb-8">
          <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563eb]">Provjera vjerodajnica</p>
          <h1 class="font-display text-[30px] font-bold tracking-tight text-[#172b4d]">Pretražite diplomu</h1>
          <p class="mt-2 max-w-xl text-sm text-[#64748b]">Učitajte PDF diplome kako bi se njegov hash usporedio sa zapisima na blockchainu.</p>
        </section>
        <section class="shadow-soft rounded-2xl border border-[#e5ebf5] bg-white p-6 sm:p-8">
          <div class="mb-6 flex items-center gap-3"><div class="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f0ff] text-[#2563eb]">⌕</div><div><h2 class="font-display text-base font-bold text-[#1e3a5f]">Provjeri PDF diplome</h2><p class="mt-1 text-xs text-[#64748b]">PDF se obrađuje lokalno; datoteka se ne šalje na blockchain.</p></div></div>
          <div class="flex flex-col gap-3 sm:flex-row"><input type="file" accept="application/pdf" @change="selectVerificationPdf" class="min-w-0 flex-1 rounded-xl border border-[#dbe6f5] px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#e8f0ff] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#2563eb]" /><button @click="verifyDiploma" :disabled="isVerifying || !verificationPdf" class="cursor-pointer rounded-xl bg-[#2563eb] px-6 py-3 text-xs font-bold text-white shadow-blue transition hover:bg-[#1d4ed8] disabled:opacity-50">{{ isVerifying ? 'Provjera...' : 'Provjeri PDF' }}</button></div>
          <div v-if="verificationResult" :class="verificationResult.invalid ? 'border-[#f2cad4] bg-[#fff7f8] text-[#b85d73]' : 'border-[#bce8d4] bg-[#f3fcf7] text-[#328861]'" class="mt-5 rounded-xl border p-4 text-sm">
            <strong v-if="!verificationResult.invalid" class="block">✓ Diploma je potvrđena i vjerodostojna</strong><strong v-else class="block">Diploma nije potvrđena</strong>
            <span v-if="!verificationResult.invalid" class="mt-2 block text-xs leading-5"><span class="font-bold">Student:</span> {{ verificationResult.student }}<br><span class="font-bold">Studij:</span> {{ verificationResult.program }}<br><span class="font-bold">Izdano:</span> {{ formatIssuedDate(verificationResult.issued) }}</span>
            <span v-else class="mt-1 block text-xs">Datoteka mora biti točno ista kao ona korištena pri izdavanju.</span>
          </div>
          <p v-if="verificationError && !verificationResult" class="mt-3 text-xs text-[#b85d73]">{{ verificationError }}</p>
        </section>
      </div>
    </main>

    <div v-if="showIssueModal && isFacultyRoute && hasFacultyAccess" class="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-[#172b4d]/40 p-5 backdrop-blur-sm">
      <div class="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
        <div class="mb-6 flex items-start justify-between">
          <div><h2 class="font-display text-xl font-bold text-[#1e3a5f]">Izdaj novu diplomu</h2><p class="mt-1 text-xs text-[#64748b]">Vjerodajnica će biti zabilježena na lokalnoj Hardhat mreži.</p></div>
          <button @click="showIssueModal = false; showCalendar = false" aria-label="Zatvori modal" class="text-xl text-[#94a3b8]">×</button>
        </div>
        <label class="mb-2 block text-xs font-bold text-[#475569]">Ime i prezime studenta</label>
        <input v-model.trim="form.student" :aria-invalid="issueAttempted && !form.student.trim() ? 'true' : undefined" class="mb-4 w-full rounded-xl border px-4 py-3 text-sm outline-none" :class="issueAttempted && !form.student.trim() ? 'border-[#dc6b7e] bg-[#fff8f9] focus:border-[#dc6b7e]' : 'border-[#dbe6f5] focus:border-[#60a5fa]'" placeholder="Ime i prezime" />

        <label class="mb-2 block text-xs font-bold text-[#475569]">Naziv studija / smjera</label>
        <input v-model.trim="form.program" :aria-invalid="issueAttempted && !isStudyNameValid ? 'true' : undefined" class="mb-1 w-full rounded-xl border px-4 py-3 text-sm outline-none" :class="issueAttempted && !isStudyNameValid ? 'border-[#dc6b7e] bg-[#fff8f9] focus:border-[#dc6b7e]' : 'border-[#dbe6f5] focus:border-[#60a5fa]'" placeholder="FIPU (Informatika) - univ. mag. inf." />
        <p class="mb-4 text-xs" :class="issueAttempted && !isStudyNameValid ? 'text-[#b85d73]' : 'text-[#64748b]'">Format: kratica fakulteta (naziv studija/smjera) - kratica stečenog naziva.</p>

        <label class="mb-2 block text-xs font-bold text-[#475569]">Datum izdavanja</label>
        <div ref="calendarRef" class="relative mb-4">
          <button type="button" @click="showCalendar = !showCalendar" :aria-expanded="showCalendar" aria-haspopup="dialog" class="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold outline-none" :class="issueAttempted && !form.issued ? 'border-[#dc6b7e] bg-[#fff8f9] text-[#b85d73]' : 'border-[#93b4e8] bg-[#f8fbff] text-[#2563eb] focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe]'">
            <span>{{ form.issued ? formatIssuedDate(form.issued) : 'Odaberi datum' }}</span><span aria-hidden="true">▾</span>
          </button>
          <div v-if="showCalendar" role="dialog" aria-label="Odabir datuma" class="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-2xl">
            <div class="mb-4 flex items-center justify-between">
              <button type="button" @click="changeCalendarMonth(-1)" aria-label="Prethodni mjesec" class="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold text-[#2563eb] hover:bg-[#eff6ff]">‹</button>
              <strong class="text-sm text-[#1e3a5f]">{{ calendarMonthLabel }}</strong>
              <button type="button" @click="changeCalendarMonth(1)" :disabled="!canGoNextMonth" aria-label="Sljedeći mjesec" class="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold text-[#2563eb] hover:bg-[#eff6ff] disabled:text-[#cbd5e1] disabled:hover:bg-transparent">›</button>
            </div>
            <div class="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase text-[#94a3b8]"><span v-for="day in weekDays" :key="day">{{ day }}</span></div>
            <div class="grid grid-cols-7 gap-1" role="grid">
              <span v-for="(date, index) in calendarDays" :key="date || `empty-${index}`" class="grid aspect-square place-items-center">
                <button v-if="date" type="button" @click="selectIssuedDate(date)" :disabled="isFutureDate(date)" :aria-label="`Odaberi ${formatIssuedDate(date)}`" :aria-pressed="form.issued === date" :aria-current="date === todayDate ? 'date' : undefined" class="grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#60a5fa]" :class="isFutureDate(date) ? 'cursor-not-allowed bg-[#f1f5f9] text-[#cbd5e1]' : form.issued === date ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]' : date === todayDate ? 'border border-[#2563eb] bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]' : 'text-[#334155] hover:bg-[#dbeafe]'">{{ Number(date.slice(-2)) }}</button>
              </span>
            </div>
          </div>
        </div>

        <label class="mb-2 block text-xs font-bold text-[#475569]">PDF diplome</label>
        <input id="pdf-upload" @change="selectPdf" type="file" accept="application/pdf" class="hidden" />
        <label for="pdf-upload" class="mb-6 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition" :class="issueAttempted && !form.pdf ? 'border-[#dc6b7e] bg-[#fff8f9] text-[#b85d73]' : 'border-[#93b4e8] bg-[#f8fbff] text-[#2563eb] hover:border-[#2563eb] hover:bg-[#eff6ff]'">
          <span class="truncate">{{ form.pdf ? form.pdf.name : 'Odaberi PDF datoteku' }}</span><span class="shrink-0 rounded-lg bg-[#e8f0ff] px-3 py-2 text-xs font-bold text-[#2563eb]">Odaberi</span>
        </label>
        <p v-if="issueError" class="mb-3 rounded-lg border border-[#f2cad4] bg-[#fff7f8] px-3 py-2 text-xs font-semibold text-[#b85d73]">{{ issueError }}</p>
        <div class="flex justify-end gap-3">
          <button @click="showIssueModal = false; showCalendar = false" class="rounded-xl px-4 py-3 text-xs font-bold text-[#64748b]">Odustani</button>
          <button @click="issueDiploma" :disabled="store.isLoading" class="rounded-xl bg-[#2563eb] px-5 py-3 text-xs font-bold text-white shadow-blue disabled:cursor-wait disabled:opacity-60">{{ store.isLoading ? 'Čekanje potvrde...' : 'Izdaj diplomu' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
