import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useDiplomaStore = defineStore('diplomas', () => {
  const activeProfile = ref('fakultet')
  const diplomas = ref([
    { id: 'DPL-2024-0842', student: 'Ana Kovac', program: 'Racunarstvo', issued: '12. lip 2024.', pdf: 'diploma-ana-kovac.pdf', status: 'Potvrđena', hash: '0x7f...c921' },
    { id: 'DPL-2024-0841', student: 'Marko Babic', program: 'Ekonomija', issued: '10. lip 2024.', pdf: 'diploma-marko-babic.pdf', status: 'Potvrđena', hash: '0x91...ab04' },
    { id: 'DPL-2024-0840', student: 'Ivana Juric', program: 'Dizajn', issued: '08. lip 2024.', pdf: 'diploma-ivana-juric.pdf', status: 'Potvrđena', hash: '0xaa...210f' },
    { id: 'DPL-2024-0839', student: 'Luka Maric', program: 'Strojarstvo', issued: '05. lip 2024.', pdf: 'diploma-luka-maric.pdf', status: 'Potvrđena', hash: '0x32...e87b' },
  ])

  const verifiedCount = computed(() => diplomas.value.filter((diploma) => diploma.status === 'Potvrđena').length)
  const isFaculty = computed(() => activeProfile.value === 'fakultet')

  function switchProfile(profile) {
    activeProfile.value = profile
  }

  function addDiploma(diploma) {
    diplomas.value.unshift({
      ...diploma,
      id: `DPL-2024-${String(842 + diplomas.value.length + 1).padStart(4, '0')}`,
      issued: diploma.issued,
      pdf: diploma.pdf.name,
      pdfUrl: URL.createObjectURL(diploma.pdf),
      status: 'Potvrđena',
      hash: '0x--...----',
    })
  }

  return { diplomas, verifiedCount, isFaculty, activeProfile, switchProfile, addDiploma }
})
