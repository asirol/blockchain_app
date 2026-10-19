# DiplomaChain

DiplomaChain je Web3 aplikacija za fakultete koja izdaje digitalne diplome na Sepolia blockchainu te studentima i poslodavcima omogućuje brzu provjeru njihove autentičnosti.

## Frontend

Frontend se nalazi u [frontend/](./frontend/) i koristi Vue 3, Vite, Pinia i Tailwind CSS. Trenutna verzija uključuje dva profila: profil Fakultet s mogućnošću izdavanja i pregleda diploma te profil Korisnik koji može samo pretraživati i provjeravati diplome pomoću njihovog ID-a.

### Pokretanje

```bash
cd frontend
npm install
npm run dev
```

Podaci su trenutno demo podaci; Web3 transakcije i adresa ugovora mogu se povezati kada ugovor bude implementiran.
