<script setup>
import { computed, ref } from 'vue'
import { useDiplomaStore } from './stores/diploma'
import { useWalletStore } from './stores/wallet'

const store = useDiplomaStore()
const wallet = useWalletStore()
const activeView = ref('Pregled')
const showIssueModal = ref(false)
const verificationId = ref('')
const verificationResult = ref(null)
const form = ref({ student: '', program: '', issued: '', pdf: null })
const showProfileMenu = ref(false)
const showAllDiplomas = ref(false)
const networkPeriod = ref('6m')
const isFaculty = computed(() => store.isFaculty)
const showWalletPanel = ref(false)
const transactionSent = ref(false)
const transactionForm = ref({
  recipient: wallet.defaultRecipientAddress,
  amount: wallet.defaultAmountEth,
})

const facultyNavItems = [
  { label: 'Pregled', icon: 'grid' },
]
const userNavItems = [{ label: 'Pretraži diplome', icon: 'scan' }]
const navItems = computed(() => isFaculty.value ? facultyNavItems : userNavItems)
const networkBars = computed(() => {
  const bars = {
    '30d': [45, 62, 54, 76, 68, 85],
    '3m': [42, 58, 49, 74, 66, 88, 79, 93],
    '6m': [36, 52, 42, 70, 57, 86, 64, 94, 75, 100, 82, 90],
    all: [28, 38, 45, 34, 52, 48, 63, 58, 75, 68, 86, 92],
  }
  return bars[networkPeriod.value]
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
}

function selectPdf(event) {
  form.value.pdf = event.target.files?.[0] || null
}

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
  showWalletPanel.value = true
  await wallet.connect()
}

async function sendDemoTransaction() {
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
  <div class="min-h-screen bg-[#f7f8fc]">
    <aside class="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-[#ececf4] bg-white px-5 py-7 lg:flex">
      <div class="mb-14 flex items-center gap-3 px-2">
        <div class="grid h-9 w-9 place-items-center rounded-xl bg-[#6b55d9] text-white shadow-lilac">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>
        </div>
        <span class="font-display text-[17px] font-bold tracking-tight text-[#252344]">Diploma<span class="text-[#7059dc]">Chain</span></span>
      </div>

      <div class="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a6a6b9]">Radni prostor</div>
      <nav class="space-y-1">
        <button v-for="item in navItems" :key="item.label" @click="activeView = item.label" :class="activeView === item.label ? 'bg-[#f0edff] font-semibold text-[#6b55d9]' : 'text-[#77788e] hover:bg-[#f8f7fd]'" class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] transition">
          <svg v-if="item.icon === 'grid'" class="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
          <svg v-else-if="item.icon === 'file'" class="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>
          <svg v-else class="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6M11 8v6"/></svg>
          {{ item.label }}
        </button>
      </nav>

    </aside>

    <main class="lg:ml-[248px]">
      <header class="flex h-[78px] items-center justify-between border-b border-[#ececf4] bg-white px-6 sm:px-10">
        <div class="flex items-center gap-3 lg:hidden">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-[#6b55d9] text-white"><span class="font-bold">✳</span></div>
          <span class="font-display font-bold text-[#252344]">Diploma<span class="text-[#7059dc]">Chain</span></span>
        </div>
        <div class="hidden items-center gap-2 text-xs text-[#9292a8] sm:flex">
          <span>Radni prostor</span><span>/</span><span class="font-semibold text-[#3d3b5b]">{{ activeView }}</span>
        </div>
        <div class="ml-auto flex items-center gap-5">
          <button @click="wallet.isConnected ? showWalletPanel = !showWalletPanel : connectWallet()" :disabled="wallet.isConnecting" class="flex items-center gap-2 rounded-xl border border-[#e5e2f5] bg-[#faf9ff] px-3 py-2 text-xs font-bold text-[#604bc9] transition hover:border-[#c9c0f5] disabled:cursor-wait disabled:opacity-60">
            <span class="h-2 w-2 rounded-full" :class="wallet.isConnected && wallet.isSepolia ? 'bg-[#48b989]' : 'bg-[#d89244]'"></span>
            {{ wallet.isConnecting ? 'Čekanje MetaMaska...' : (wallet.isConnected ? wallet.shortAccount : 'Poveži MetaMask') }}
          </button>
          <div class="relative border-l border-[#eeeef5] pl-5">
            <button @click="showProfileMenu = !showProfileMenu" class="flex items-center gap-2">
              <div class="grid h-8 w-8 place-items-center rounded-full bg-[#f1e9ff] text-xs font-bold text-[#785fcf]">{{ isFaculty ? 'FA' : 'KO' }}</div>
              <span class="hidden text-xs font-semibold text-[#4a4864] sm:block">{{ isFaculty ? 'Fakultet' : 'Korisnik' }}</span>
              <svg class="h-3 w-3 text-[#aaa9ba]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div v-if="showProfileMenu" class="absolute right-0 top-11 z-30 w-48 rounded-xl border border-[#ecebf4] bg-white p-2 shadow-soft">
              <p class="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#aaa9b8]">Promijeni profil</p>
              <button @click="switchProfile('fakultet')" class="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#4a4864] hover:bg-[#f7f5ff]">Fakultet <span v-if="isFaculty" class="ml-auto text-[#6b55d9]">✓</span></button>
              <button @click="switchProfile('korisnik')" class="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#4a4864] hover:bg-[#f7f5ff]">Korisnik <span v-if="!isFaculty" class="ml-auto text-[#6b55d9]">✓</span></button>
            </div>
          </div>
        </div>
      </header>

      <div v-if="showWalletPanel" class="border-b border-[#e9e7f2] bg-[#fbfaff] px-6 py-4 sm:px-10">
        <div class="mx-auto flex max-w-[1320px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8877d3]">MetaMask wallet</p>
            <p class="mt-1 text-xs text-[#5b5973]">Račun: <span class="font-mono">{{ wallet.account }}</span></p>
            <p class="mt-1 text-xs" :class="wallet.isSepolia ? 'text-[#328861]' : 'text-[#b85d73]'">
              {{ wallet.isSepolia ? 'Povezano na Sepolia testnu mrežu.' : 'Odaberite Sepolia mrežu u MetaMasku.' }}
            </p>
          </div>
          <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div class="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
              <input v-model.trim="transactionForm.recipient" autocomplete="off" aria-label="Adresa primatelja" placeholder="0x... adresa primatelja" class="rounded-lg border border-[#e5e2f5] bg-white px-3 py-2 text-xs font-mono text-[#4a4864] outline-none focus:border-[#8d7ce2]" />
              <input v-model.trim="transactionForm.amount" autocomplete="off" aria-label="Iznos u Sepolia ETH" inputmode="decimal" placeholder="Iznos u Sepolia ETH" class="rounded-lg border border-[#e5e2f5] bg-white px-3 py-2 text-xs text-[#4a4864] outline-none focus:border-[#8d7ce2]" />
              <p class="text-[10px] text-[#77768d]">Šalje se: <span class="font-mono">{{ transactionForm.recipient }}</span> · {{ transactionForm.amount }} Sepolia ETH</p>
            </div>
            <a v-if="!wallet.isInstalled" href="https://metamask.io/download/" target="_blank" rel="noreferrer" class="rounded-xl bg-[#6b55d9] px-4 py-3 text-xs font-bold text-white shadow-lilac transition hover:bg-[#5942c4]">Instaliraj MetaMask</a>
            <button v-else @click="sendDemoTransaction" :disabled="wallet.isSending || !wallet.isSepolia" class="rounded-xl bg-[#6b55d9] px-4 py-3 text-xs font-bold text-white shadow-lilac transition hover:bg-[#5942c4] disabled:cursor-not-allowed disabled:opacity-50">
              {{ wallet.isSending ? 'Čekanje potvrde...' : 'Pošalji demo transakciju' }}
            </button>
            <a v-if="wallet.lastTransactionHash" :href="`https://sepolia.etherscan.io/tx/${wallet.lastTransactionHash}`" target="_blank" rel="noreferrer" class="text-xs font-bold text-[#6b55d9]">Otvori na Etherscanu ↗</a>
          </div>
        </div>
        <p v-if="transactionSent" class="mx-auto mt-3 max-w-[1320px] text-xs font-semibold text-[#328861]">Transakcija je poslana na Sepolia mrežu.</p>
        <p v-if="wallet.error" class="mx-auto mt-3 max-w-[1320px] text-xs font-semibold text-[#b85d73]">{{ wallet.error }}</p>
      </div>

      <template v-if="isFaculty">
      <div class="mx-auto max-w-[1320px] px-5 py-8 sm:px-10 lg:px-14">
        <section class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p class="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#8877d3]">Utorak, 18. lipnja 2024.</p><h1 class="font-display text-[30px] font-bold tracking-tight text-[#292747]">Dobrodošli <span class="text-2xl">✦</span></h1><p class="mt-2 text-sm text-[#8c8ba1]">Pregledajte i izdajte digitalne diplome svoje ustanove.</p></div>
          <button @click="showIssueModal = true" class="flex items-center justify-center gap-2 rounded-xl bg-[#6b55d9] px-5 py-3 text-xs font-bold text-white shadow-lilac transition hover:bg-[#5942c4]"><span class="text-base">+</span> Izdaj novu diplomu</button>
        </section>

        <section class="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <div class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#eeeaff] p-2 text-[#6b55d9]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg></span><span class="rounded-full bg-[#edfaf4] px-2 py-1 text-[10px] font-bold text-[#4db88a]">+12.5%</span></div><p class="text-[11px] font-semibold text-[#9695a9]">Ukupno izdanih diploma</p><p class="mt-1 font-display text-2xl font-bold text-[#292747]">{{ store.diplomas.length + 127 }}</p></div>
          <div class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#fbeafa] p-2 text-[#c36acb]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg></span><span class="text-[10px] font-bold text-[#a1a0b3]">Ukupno</span></div><p class="text-[11px] font-semibold text-[#9695a9]">Potrošeno za blockchain gas</p><p class="mt-1 font-display text-2xl font-bold text-[#292747]">0.42 ETH</p></div>
        </section>

        <div class="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <section class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-6">
            <div class="mb-6 flex items-center justify-between"><div><h2 class="font-display text-base font-bold text-[#302d4b]">Nedavne diplome</h2><p class="mt-1 text-xs text-[#9998ab]">Najnovije vjerodajnice vaše ustanove.</p></div><button @click="showAllDiplomas = true" class="text-xs font-bold text-[#6b55d9]">Prikaži sve <span class="ml-1">→</span></button></div>
            <div class="overflow-x-auto"><table class="w-full min-w-[620px] text-left"><thead><tr class="border-b border-[#f0f0f6] text-[10px] uppercase tracking-wider text-[#aaa9b8]"><th class="pb-3 font-bold">Student</th><th class="pb-3 font-bold">Studij</th><th class="pb-3 font-bold">Izdano</th><th class="pb-3 font-bold">PDF</th><th class="pb-3 font-bold">Status</th></tr></thead><tbody><tr v-for="diploma in store.diplomas" :key="diploma.id" class="border-b border-[#f5f5f8] last:border-0"><td class="py-4 text-xs font-semibold text-[#46445e]">{{ diploma.student }}<span class="mt-1 block font-mono text-[9px] font-normal text-[#aaa9b8]">{{ diploma.id }}</span></td><td class="py-4 text-xs text-[#77768d]">{{ diploma.program }}</td><td class="py-4 text-xs text-[#77768d]">{{ formatIssuedDate(diploma.issued) }}</td><td class="py-4"><button @click="downloadDiploma(diploma)" class="text-xs font-bold text-[#6b55d9] hover:text-[#4f3bb9]">Preuzmi PDF</button></td><td class="py-4"><span :class="diploma.status === 'Potvrđena' ? 'bg-[#edfaf4] text-[#45aa82]' : 'bg-[#fff5e8] text-[#d89244]'" class="rounded-full px-2.5 py-1 text-[10px] font-bold">{{ diploma.status }}</span></td></tr></tbody></table></div>
          </section>
          <section id="verification-card" class="relative overflow-hidden rounded-2xl bg-[#282444] p-6 text-white"><div class="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-[#615c83] opacity-40"></div><div class="absolute -bottom-20 -right-3 h-48 w-48 rounded-full border border-[#615c83] opacity-30"></div><div class="relative"><div class="mb-7 flex items-center justify-between"><div class="grid h-9 w-9 place-items-center rounded-xl bg-[#6653c7]"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>          </div><span class="rounded-full border border-[#5a5578] px-2.5 py-1 text-[9px] font-bold text-[#b7b2d1]">SEPOLIA TESTNA MREŽA</span></div><h2 class="font-display text-xl font-bold">Provjeri diplomu</h2><p class="mt-2 max-w-[270px] text-xs leading-5 text-[#aaa6c1]">Odmah provjerite je li vjerodajnica autentična i nepromijenjena.</p><div class="mt-7 flex gap-2 rounded-xl bg-white/10 p-1.5"><input v-model="verificationId" @keyup.enter="verifyDiploma" placeholder="Unesite ID diplome..." class="min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none placeholder:text-[#8d89a8]" /><button @click="verifyDiploma" class="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-[#51429e]">Provjeri</button></div><div v-if="verificationResult" class="mt-3 rounded-lg bg-white/10 p-3 text-xs"><span v-if="!verificationResult.invalid" class="text-[#8ee2bd]">✓ Pronađena je autentična diploma: {{ verificationResult.student }}</span><span v-else class="text-[#ffabbc]">ID nije pronađen. Provjerite unos i pokušajte ponovno.</span></div><button v-else @click="focusVerifier" class="mt-4 text-xs font-bold text-[#aaa3e8]">Saznajte više o provjeri <span class="ml-1">→</span></button></div></section>
        </div>

        <section class="mt-6 grid gap-6 xl:grid-cols-[1fr_1.45fr]">
          <div class="shadow-soft grid-dots rounded-2xl border border-[#eeeeF5] bg-white p-6"><div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="font-display text-base font-bold text-[#302d4b]">Aktivnost mreže</h2><p class="mt-1 text-xs text-[#9998ab]">Izdane diplome kroz vrijeme</p></div><select v-model="networkPeriod" class="rounded-lg bg-[#f5f3ff] px-2 py-1 text-[10px] font-bold text-[#6b55d9] outline-none"><option value="30d">Posljednjih 30 dana</option><option value="3m">Posljednja 3 mjeseca</option><option value="6m">Posljednjih 6 mjeseci</option><option value="all">Sve vrijeme</option></select></div><div class="mt-8 flex h-28 items-end gap-3 px-2"><div v-for="(height, index) in networkBars" :key="index" class="flex-1 rounded-t-md bg-gradient-to-t from-[#dcd4ff] to-[#8975e5]" :style="{ height: `${height}%`, opacity: index < 3 ? 0.45 : 0.9 }"></div></div><div class="mt-3 flex justify-between px-1 text-[9px] text-[#aaa9b8]"><span v-if="networkPeriod === '6m'">Sij</span><span v-if="networkPeriod === '6m'">Vel</span><span v-if="networkPeriod === '6m'">Ožu</span><span v-if="networkPeriod === '6m'">Tra</span><span v-if="networkPeriod === '6m'">Svi</span><span v-if="networkPeriod === '6m'">Lip</span><span v-else>Početak razdoblja</span><span v-if="networkPeriod !== '6m'">Danas</span></div></div>
          <div class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-6"><div class="mb-5 flex items-center justify-between"><div><h2 class="font-display text-base font-bold text-[#302d4b]">Brze radnje</h2><p class="mt-1 text-xs text-[#9998ab]">Najčešći zadaci nadohvat ruke.</p></div><span class="text-xl text-[#c8c4df]">✦</span></div><div class="grid gap-3 sm:grid-cols-3"><button @click="showIssueModal = true" class="group rounded-xl border border-[#ecebf4] p-4 text-left transition hover:border-[#c9c0f5] hover:bg-[#faf9ff]"><span class="mb-5 grid h-8 w-8 place-items-center rounded-lg bg-[#eeeaff] text-[#7059dc]">+</span><span class="block text-xs font-bold text-[#45425e]">Izdaj diplomu</span><span class="mt-1 block text-[10px] text-[#9998ab]">Izradite novu vjerodajnicu</span></button><button @click="verificationId = ''; verificationResult = null; focusVerifier()" class="group rounded-xl border border-[#ecebf4] p-4 text-left transition hover:border-[#c9c0f5] hover:bg-[#faf9ff]"><span class="mb-5 grid h-8 w-8 place-items-center rounded-lg bg-[#e8f7f6] text-[#49a6a0]">⌕</span><span class="block text-xs font-bold text-[#45425e]">Provjeri diplomu</span><span class="mt-1 block text-[10px] text-[#9998ab]">Provjerite autentičnost</span></button><button @click="exportReport" class="group rounded-xl border border-[#ecebf4] p-4 text-left transition hover:border-[#c9c0f5] hover:bg-[#faf9ff]"><span class="mb-5 grid h-8 w-8 place-items-center rounded-lg bg-[#fff1df] text-[#db994a]">↗</span><span class="block text-xs font-bold text-[#45425e]">Izvezi izvještaj</span><span class="mt-1 block text-[10px] text-[#9998ab]">Preuzmite podatke o aktivnosti</span></button></div></div>
        </section>
      </div>
      <div v-if="showAllDiplomas" class="fixed inset-0 z-20 overflow-y-auto bg-[#f7f8fc] p-5 sm:p-10">
        <div class="mx-auto max-w-[1180px]">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div><p class="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8877d3]">Fakultet</p><h2 class="font-display text-2xl font-bold text-[#302d4b]">Sve diplome</h2></div>
            <button @click="showAllDiplomas = false" class="rounded-xl border border-[#e5e4ee] bg-white px-4 py-2 text-xs font-bold text-[#6b55d9]">Natrag na pregled</button>
          </div>
          <div class="overflow-x-auto rounded-2xl border border-[#eeeeF5] bg-white shadow-soft"><table class="w-full min-w-[680px] text-left"><thead><tr class="border-b border-[#f0f0f6] text-[10px] uppercase tracking-wider text-[#aaa9b8]"><th class="p-4 font-bold">Student</th><th class="p-4 font-bold">Studij</th><th class="p-4 font-bold">Izdano</th><th class="p-4 font-bold">PDF</th><th class="p-4 font-bold">Status</th></tr></thead><tbody><tr v-for="diploma in store.diplomas" :key="`all-${diploma.id}`" class="border-b border-[#f5f5f8] last:border-0"><td class="p-4 text-xs font-semibold text-[#46445e]">{{ diploma.student }}<span class="mt-1 block font-mono text-[9px] font-normal text-[#aaa9b8]">{{ diploma.id }}</span></td><td class="p-4 text-xs text-[#77768d]">{{ diploma.program }}</td><td class="p-4 text-xs text-[#77768d]">{{ formatIssuedDate(diploma.issued) }}</td><td class="p-4"><button @click="downloadDiploma(diploma)" class="text-xs font-bold text-[#6b55d9]">Preuzmi PDF</button></td><td class="p-4"><span class="rounded-full bg-[#edfaf4] px-2.5 py-1 text-[10px] font-bold text-[#45aa82]">{{ diploma.status }}</span></td></tr></tbody></table></div>
        </div>
      </div>
      </template>

      <div v-else class="mx-auto max-w-[920px] px-5 py-10 sm:px-10 lg:px-14">
        <section class="mb-8">
          <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#8877d3]">Provjera vjerodajnica</p>
          <h1 class="font-display text-[30px] font-bold tracking-tight text-[#292747]">Pretražite diplomu</h1>
          <p class="mt-2 max-w-xl text-sm text-[#8c8ba1]">Unesite ID diplome kako biste provjerili njezinu autentičnost na blockchainu.</p>
        </section>
        <section class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-6 sm:p-8">
          <div class="mb-6 flex items-center gap-3"><div class="grid h-10 w-10 place-items-center rounded-xl bg-[#eeeaff] text-[#6b55d9]">⌕</div><div><h2 class="font-display text-base font-bold text-[#302d4b]">Pretraži diplomu</h2><p class="mt-1 text-xs text-[#9998ab]">Provjera je dostupna svim korisnicima.</p></div></div>
          <div class="flex flex-col gap-3 sm:flex-row"><input v-model="verificationId" @keyup.enter="verifyDiploma" placeholder="ID diplome" class="min-w-0 flex-1 rounded-xl border border-[#e5e4ee] px-4 py-3 text-sm outline-none focus:border-[#8d7ce2]" /><button @click="verifyDiploma" class="rounded-xl bg-[#6b55d9] px-6 py-3 text-xs font-bold text-white shadow-lilac transition hover:bg-[#5942c4]">Provjeri diplomu</button></div>
          <div v-if="verificationResult" :class="verificationResult.invalid ? 'border-[#f2cad4] bg-[#fff7f8] text-[#b85d73]' : 'border-[#bce8d4] bg-[#f3fcf7] text-[#328861]'" class="mt-5 rounded-xl border p-4 text-sm">
            <strong v-if="!verificationResult.invalid" class="block">Diploma je autentična</strong><strong v-else class="block">Diploma nije pronađena</strong>
            <span v-if="!verificationResult.invalid" class="mt-1 block text-xs">Student: {{ verificationResult.student }} · Studij: {{ verificationResult.program }}</span><button v-if="!verificationResult.invalid" @click="downloadDiploma(verificationResult)" class="mt-3 text-xs font-bold text-[#6b55d9] hover:text-[#4f3bb9]">Preuzmi PDF diplome</button><span v-else class="mt-1 block text-xs">Provjerite ID i pokušajte ponovno.</span>
          </div>
        </section>
      </div>
    </main>

    <div v-if="showIssueModal && isFaculty" class="fixed inset-0 z-30 grid place-items-center bg-[#24213d]/40 p-5 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><div class="mb-6 flex items-start justify-between"><div><h2 class="font-display text-xl font-bold text-[#302d4b]">Izdaj novu diplomu</h2><p class="mt-1 text-xs text-[#9998ab]">Vjerodajnica će biti zabilježena na Sepoliji.</p></div><button @click="showIssueModal = false" class="text-xl text-[#aaa9b8]">×</button></div><label class="mb-2 block text-xs font-bold text-[#55536d]">Ime i prezime studenta</label><input v-model="form.student" class="mb-4 w-full rounded-xl border border-[#e5e4ee] px-4 py-3 text-sm outline-none focus:border-[#8d7ce2]" placeholder="Ime i prezime" /><label class="mb-2 block text-xs font-bold text-[#55536d]">Naziv studija / smjera</label><input v-model="form.program" class="mb-4 w-full rounded-xl border border-[#e5e4ee] px-4 py-3 text-sm outline-none focus:border-[#8d7ce2]" placeholder="Naziv studija / smjera" /><label class="mb-2 block text-xs font-bold text-[#55536d]">Datum izdavanja</label><input v-model="form.issued" type="date" class="mb-4 w-full rounded-xl border border-[#e5e4ee] px-4 py-3 text-sm outline-none focus:border-[#8d7ce2]" /><label class="mb-2 block text-xs font-bold text-[#55536d]">PDF diplome</label><input @change="selectPdf" type="file" accept="application/pdf" class="mb-6 w-full rounded-xl border border-[#e5e4ee] px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#eeeaff] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#6b55d9]" /><div class="flex justify-end gap-3"><button @click="showIssueModal = false" class="rounded-xl px-4 py-3 text-xs font-bold text-[#77768d]">Odustani</button><button @click="issueDiploma" class="rounded-xl bg-[#6b55d9] px-5 py-3 text-xs font-bold text-white shadow-lilac">Izdaj diplomu</button></div></div>
    </div>
  </div>
</template>
