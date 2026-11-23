# DiplomaChain

DiplomaChain je Web3 aplikacija za fakultete koja izdaje digitalne diplome na Sepolia blockchainu te studentima i poslodavcima omogućuje brzu provjeru njihove autentičnosti.

## Frontend

Frontend se nalazi u [frontend/](./frontend/) i koristi Vue 3, Vite, Pinia i Tailwind CSS. Javna provjera dostupna je na `/`, a fakultetsko sučelje na `/fakultet`. Pristup fakultetskom sučelju zahtijeva povezivanje MetaMask računa koji je vlasnik ugovora. Javna provjera ne zahtijeva novčanik.

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

Frontend sada koristi ABI ugovora i stvarne pozive `issueDiploma`, `getDiploma`
i `getDiplomaByHash`.
Čitanje diploma radi preko lokalnog RPC-a bez MetaMaska; MetaMask se koristi za
transakciju izdavanja i mora biti povezan na račun vlasnika ugovora. Nakon
deploya provjerite da `VITE_DIPLOMA_CHAIN_ADDRESS` u `frontend/.env` odgovara
ispisanoj adresi ugovora. Početni Hardhat račun koji je deployao ugovor je vlasnik.
Za provjeru autentičnosti učitajte istu PDF datoteku koja je korištena pri
izdavanju; preglednik lokalno izračuna njezin hash i traži odgovarajući zapis na
ugovoru. Datoteka se ne šalje na blockchain. Nakon izmjene pametnog ugovora
potrebno ga je ponovno deployati i ažurirati adresu u `frontend/.env`.
