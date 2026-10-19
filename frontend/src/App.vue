<script setup>
import { ref } from 'vue'
import { useDiplomaStore } from './stores/diploma'

const store = useDiplomaStore()
const activeView = ref('Pregled')
const showIssueModal = ref(false)
const verificationId = ref('')
const verificationResult = ref(null)
const form = ref({ student: '', program: '' })

const navItems = [
  { label: 'Pregled', icon: 'grid' },
  { label: 'Moje diplome', icon: 'file' },
  { label: 'Provjeri diplomu', icon: 'scan' },
]

function verifyDiploma() {
  const found = store.diplomas.find((diploma) => diploma.id.toLowerCase() === verificationId.value.trim().toLowerCase())
  verificationResult.value = found || { invalid: true }
}

function issueDiploma() {
  if (!form.value.student || !form.value.program) return
  store.addDiploma(form.value)
  form.value = { student: '', program: '' }
  showIssueModal.value = false
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

      <div class="mt-auto rounded-2xl bg-[#f7f5ff] p-4">
        <div class="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-[#e5dfff] text-[#6b55d9]">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/></svg>
        </div>
        <p class="mb-1 text-xs font-semibold text-[#403c68]">Novi ste u blockchainu?</p>
        <p class="mb-3 text-[11px] leading-4 text-[#8c8aa5]">Saznajte kako DiplomaChain čuva vjerodajnice.</p>
        <button class="text-[11px] font-bold text-[#6b55d9]">Pročitajte vodič <span class="ml-1">→</span></button>
      </div>
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
          <button class="relative text-[#85859c]"><span class="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#e7789a]"></span><svg class="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button>
          <div class="flex items-center gap-2 border-l border-[#eeeef5] pl-5"><div class="grid h-8 w-8 place-items-center rounded-full bg-[#f1e9ff] text-xs font-bold text-[#785fcf]">JM</div><span class="hidden text-xs font-semibold text-[#4a4864] sm:block">Josip Maric</span><svg class="h-3 w-3 text-[#aaa9ba]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></div>
        </div>
      </header>

      <div class="mx-auto max-w-[1320px] px-5 py-8 sm:px-10 lg:px-14">
        <section class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p class="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#8877d3]">Utorak, 18. lipnja 2024.</p><h1 class="font-display text-[30px] font-bold tracking-tight text-[#292747]">Dobro jutro, Josipe <span class="text-2xl">✦</span></h1><p class="mt-2 text-sm text-[#8c8ba1]">Evo što se događa s vašim vjerodajnicama.</p></div>
          <button @click="showIssueModal = true" class="flex items-center justify-center gap-2 rounded-xl bg-[#6b55d9] px-5 py-3 text-xs font-bold text-white shadow-lilac transition hover:bg-[#5942c4]"><span class="text-base">+</span> Izdaj novu diplomu</button>
        </section>

        <section class="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#eeeaff] p-2 text-[#6b55d9]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg></span><span class="rounded-full bg-[#edfaf4] px-2 py-1 text-[10px] font-bold text-[#4db88a]">+12.5%</span></div><p class="text-[11px] font-semibold text-[#9695a9]">Ukupno izdanih diploma</p><p class="mt-1 font-display text-2xl font-bold text-[#292747]">{{ store.diplomas.length + 127 }}</p></div>
          <div class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#e9f8f8] p-2 text-[#43a5a0]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg></span><span class="rounded-full bg-[#edfaf4] px-2 py-1 text-[10px] font-bold text-[#4db88a]">+8.2%</span></div><p class="text-[11px] font-semibold text-[#9695a9]">Potvrđeno ovaj mjesec</p><p class="mt-1 font-display text-2xl font-bold text-[#292747]">84</p></div>
          <div class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#fff2df] p-2 text-[#d89244]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg></span><span class="rounded-full bg-[#fff5e8] px-2 py-1 text-[10px] font-bold text-[#d89244]">Potrebna provjera</span></div><p class="text-[11px] font-semibold text-[#9695a9]">Izdavanje na čekanju</p><p class="mt-1 font-display text-2xl font-bold text-[#292747]">6</p></div>
          <div class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-5"><div class="mb-5 flex items-start justify-between"><span class="rounded-lg bg-[#fbeafa] p-2 text-[#c36acb]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg></span><span class="text-[10px] font-bold text-[#a1a0b3]">Ukupno</span></div><p class="text-[11px] font-semibold text-[#9695a9]">Potrošeno za blockchain gas</p><p class="mt-1 font-display text-2xl font-bold text-[#292747]">0.42 ETH</p></div>
        </section>

        <div class="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <section class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-6">
            <div class="mb-6 flex items-center justify-between"><div><h2 class="font-display text-base font-bold text-[#302d4b]">Nedavne diplome</h2><p class="mt-1 text-xs text-[#9998ab]">Najnovije vjerodajnice vaše ustanove.</p></div><button @click="activeView = 'Moje diplome'" class="text-xs font-bold text-[#6b55d9]">Prikaži sve <span class="ml-1">→</span></button></div>
            <div class="overflow-x-auto"><table class="w-full min-w-[570px] text-left"><thead><tr class="border-b border-[#f0f0f6] text-[10px] uppercase tracking-wider text-[#aaa9b8]"><th class="pb-3 font-bold">Student</th><th class="pb-3 font-bold">Studij</th><th class="pb-3 font-bold">Izdano</th><th class="pb-3 font-bold">Status</th><th class="pb-3"></th></tr></thead><tbody><tr v-for="diploma in store.diplomas" :key="diploma.id" class="border-b border-[#f5f5f8] last:border-0"><td class="py-4 text-xs font-semibold text-[#46445e]">{{ diploma.student }}<span class="mt-1 block font-mono text-[9px] font-normal text-[#aaa9b8]">{{ diploma.id }}</span></td><td class="py-4 text-xs text-[#77768d]">{{ diploma.program }}</td><td class="py-4 text-xs text-[#77768d]">{{ diploma.issued }}</td><td class="py-4"><span :class="diploma.status === 'Potvrđena' ? 'bg-[#edfaf4] text-[#45aa82]' : 'bg-[#fff5e8] text-[#d89244]'" class="rounded-full px-2.5 py-1 text-[10px] font-bold">{{ diploma.status }}</span></td><td class="py-4 text-right text-[#aaa9b8]">â€˘â€˘â€˘</td></tr></tbody></table></div>
          </section>
          <section class="relative overflow-hidden rounded-2xl bg-[#282444] p-6 text-white"><div class="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-[#615c83] opacity-40"></div><div class="absolute -bottom-20 -right-3 h-48 w-48 rounded-full border border-[#615c83] opacity-30"></div><div class="relative"><div class="mb-7 flex items-center justify-between"><div class="grid h-9 w-9 place-items-center rounded-xl bg-[#6653c7]"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>          </div><span class="rounded-full border border-[#5a5578] px-2.5 py-1 text-[9px] font-bold text-[#b7b2d1]">SEPOLIA TESTNA MREŽA</span></div><h2 class="font-display text-xl font-bold">Provjeri diplomu</h2><p class="mt-2 max-w-[270px] text-xs leading-5 text-[#aaa6c1]">Odmah provjerite je li vjerodajnica autentična i nepromijenjena.</p><div class="mt-7 flex gap-2 rounded-xl bg-white/10 p-1.5"><input v-model="verificationId" @keyup.enter="verifyDiploma" placeholder="Unesite ID diplome..." class="min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none placeholder:text-[#8d89a8]" /><button @click="verifyDiploma" class="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-[#51429e]">Provjeri</button></div><div v-if="verificationResult" class="mt-3 rounded-lg bg-white/10 p-3 text-xs"><span v-if="!verificationResult.invalid" class="text-[#8ee2bd]">✓ Pronađena je autentična diploma: {{ verificationResult.student }}</span><span v-else class="text-[#ffabbc]">ID nije pronađen. Provjerite unos i pokušajte ponovno.</span></div><button v-else @click="activeView = 'Provjeri diplomu'" class="mt-4 text-xs font-bold text-[#aaa3e8]">Saznajte više o provjeri <span class="ml-1">→</span></button></div></section>
        </div>

        <section class="mt-6 grid gap-6 xl:grid-cols-[1fr_1.45fr]">
          <div class="shadow-soft grid-dots rounded-2xl border border-[#eeeeF5] bg-white p-6"><div class="flex items-center justify-between"><div><h2 class="font-display text-base font-bold text-[#302d4b]">Aktivnost mreže</h2><p class="mt-1 text-xs text-[#9998ab]">Izdane diplome kroz vrijeme</p></div><span class="rounded-lg bg-[#f5f3ff] px-2 py-1 text-[10px] font-bold text-[#6b55d9]">Posljednjih 6 mjeseci⌄</span></div><div class="mt-8 flex h-28 items-end gap-3 px-2"><div v-for="(height, index) in [36, 52, 42, 70, 57, 86, 64, 94, 75, 100, 82, 90]" :key="index" class="flex-1 rounded-t-md bg-gradient-to-t from-[#dcd4ff] to-[#8975e5]" :style="{ height: `${height}%`, opacity: index < 3 ? 0.45 : 0.9 }"></div></div><div class="mt-3 flex justify-between px-1 text-[9px] text-[#aaa9b8]"><span>Sij</span><span>Vel</span><span>Ožu</span><span>Tra</span><span>Svi</span><span>Lip</span></div></div>
          <div class="shadow-soft rounded-2xl border border-[#eeeeF5] bg-white p-6"><div class="mb-5 flex items-center justify-between"><div><h2 class="font-display text-base font-bold text-[#302d4b]">Brze radnje</h2><p class="mt-1 text-xs text-[#9998ab]">Najčešći zadaci nadohvat ruke.</p></div><span class="text-xl text-[#c8c4df]">✦</span></div><div class="grid gap-3 sm:grid-cols-3"><button @click="showIssueModal = true" class="group rounded-xl border border-[#ecebf4] p-4 text-left transition hover:border-[#c9c0f5] hover:bg-[#faf9ff]"><span class="mb-5 grid h-8 w-8 place-items-center rounded-lg bg-[#eeeaff] text-[#7059dc]">+</span><span class="block text-xs font-bold text-[#45425e]">Izdaj diplomu</span><span class="mt-1 block text-[10px] text-[#9998ab]">Izradite novu vjerodajnicu</span></button><button @click="activeView = 'Provjeri diplomu'" class="group rounded-xl border border-[#ecebf4] p-4 text-left transition hover:border-[#c9c0f5] hover:bg-[#faf9ff]"><span class="mb-5 grid h-8 w-8 place-items-center rounded-lg bg-[#e8f7f6] text-[#49a6a0]">⌕</span><span class="block text-xs font-bold text-[#45425e]">Provjeri diplomu</span><span class="mt-1 block text-[10px] text-[#9998ab]">Provjerite autentičnost</span></button><button class="group rounded-xl border border-[#ecebf4] p-4 text-left transition hover:border-[#c9c0f5] hover:bg-[#faf9ff]"><span class="mb-5 grid h-8 w-8 place-items-center rounded-lg bg-[#fff1df] text-[#db994a]">↗</span><span class="block text-xs font-bold text-[#45425e]">Izvezi izvještaj</span><span class="mt-1 block text-[10px] text-[#9998ab]">Preuzmite podatke o aktivnosti</span></button></div></div>
        </section>
      </div>
    </main>

    <div v-if="showIssueModal" class="fixed inset-0 z-30 grid place-items-center bg-[#24213d]/40 p-5 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><div class="mb-6 flex items-start justify-between"><div><h2 class="font-display text-xl font-bold text-[#302d4b]">Izdaj novu diplomu</h2><p class="mt-1 text-xs text-[#9998ab]">Vjerodajnica će biti zabilježena na Sepoliji.</p></div><button @click="showIssueModal = false" class="text-xl text-[#aaa9b8]">Ă—</button></div><label class="mb-2 block text-xs font-bold text-[#55536d]">Ime studenta</label><input v-model="form.student" class="mb-4 w-full rounded-xl border border-[#e5e4ee] px-4 py-3 text-sm outline-none focus:border-[#8d7ce2]" placeholder="npr. Petra Horvat" /><label class="mb-2 block text-xs font-bold text-[#55536d]">Studijski program</label><input v-model="form.program" class="mb-6 w-full rounded-xl border border-[#e5e4ee] px-4 py-3 text-sm outline-none focus:border-[#8d7ce2]" placeholder="npr. Računarstvo" /><div class="flex justify-end gap-3"><button @click="showIssueModal = false" class="rounded-xl px-4 py-3 text-xs font-bold text-[#77768d]">Odustani</button><button @click="issueDiploma" class="rounded-xl bg-[#6b55d9] px-5 py-3 text-xs font-bold text-white shadow-lilac">Izdaj diplomu</button></div></div>
    </div>
  </div>
</template>
