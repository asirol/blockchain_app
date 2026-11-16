# DiplomaChain

DiplomaChain je Web3 aplikacija za fakultete koja izdaje digitalne diplome na Sepolia blockchainu te studentima i poslodavcima omogućuje brzu provjeru njihove autentičnosti.

## Frontend

Frontend se nalazi u [frontend/](./frontend/) i koristi Vue 3, Vite, Pinia i Tailwind CSS. Trenutna verzija uključuje dva profila: profil Fakultet s mogućnošću izdavanja i pregleda diploma te profil Korisnik koji može samo pretraživati i provjeravati diplome pomoću njihovog ID-a.

### Pokretanje lokalnog Web3 toka

1. U jednom terminalu pokrenite lokalni čvor:

```bash
npx hardhat node
```

2. U drugom terminalu deployajte ugovor i zapamtite ispisanu adresu:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. Kopirajte `frontend/.env.example` u `frontend/.env` i postavite adresu ugovora.
U MetaMasku importirajte jedan od računa koje je ispisao `hardhat node` i dodajte mrežu
`Hardhat Localhost` (RPC `http://127.0.0.1:8545`, chain ID `31337`).

```bash
cd frontend
npm install
npm run dev
```

Frontend sada koristi ABI ugovora i stvarne pozive `issueDiploma` i `getDiploma`.
Izdavanje je moguće samo MetaMask računom koji je owner deployanog ugovora.
