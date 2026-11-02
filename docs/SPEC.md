# Specifikacija

DiplomaChain je Web3 aplikacija za izdavanje digitalnih diploma na Sepolia
testnoj mrezi i javnu provjeru njihove autenticnosti.

## Korisnici i uloge

### Fakultet (vlasnik ugovora)

- Pri deploymentu adresa fakulteta postaje vlasnik ugovora (`owner`).
- Vlasnik izdaje diplome, prenosi vlasnistvo i upravlja vlastitim tokenima.
- Vlasnik moze javno citati podatke diploma.

### Ostali korisnici

- Mogu javno citati i provjeravati diplome bez novcanika.
- Ne mogu izdavati diplome, prenositi vlasnistvo, pozivati `transfer` ili
  `burn`.
- `approve`, `allowance` i `transferFrom` ostaju standardne ERC-20 funkcije
  dostupne kroz ABI, ali nisu dio korisnickog sucelja.

## Funkcije ugovora

Ugovor koristi Solidity `^0.8.24`, OpenZeppelin Contracts 5.x i nalazi se u
[contracts/DiplomaChain.sol](../contracts/DiplomaChain.sol).

### Modul diploma

- `issueDiploma(string,string,uint256,bytes32)` vraca `uint256 diplomaId`.
- `getDiploma(uint256)` vraca ime studenta, studij, datum izdavanja i hash PDF-a.
- `nextDiplomaId()` pocinje od `1` i povecava se nakon uspjesnog izdavanja.
- Isti `pdfHash` ne moze biti izdan vise puta.
- `DiplomaIssued` sadrzi ID, podatke studenta, datum i hash.
- Podaci diplome su javni; sirovi PDF se ne sprema na blockchain.

### Vlasnistvo

- `owner()` vraca trenutnog vlasnika.
- `transferOwnership(address)` prenosi vlasnistvo i emitira
  `OwnershipTransferred`.
- Vlasnicka prava provjeravaju se on-chain, a preneseno vlasnistvo ne prenosi
  ERC-20 saldo.

### ERC-20 token

- Naziv je `DiplomaChain`, simbol `DPLC`, a broj decimala je `18`.
- Pri deploymentu se kuje `1.000.000 * 10^18` tokena vlasniku.
- Ne postoji funkcija `mint`.
- `transfer` i `burn` moze pozvati samo trenutni vlasnik.
- `approve`, `allowance` i `transferFrom` koriste standardno OpenZeppelin
  ERC-20 ponasanje.

## Matrica ovlasti

| Funkcija | Fakultet (Vlasnik) | Ostali korisnici |
|---|---|---|
| `issueDiploma` | Da | Ne |
| `getDiploma` | Da | Da |
| `nextDiplomaId` | Da | Da |
| `owner` | Da | Da |
| `transferOwnership` | Da | Ne |
| `totalSupply` | Da | Da |
| `balanceOf` | Da | Da |
| `decimals` | Da | Da |
| `transfer` | Da | Ne |
| `burn` | Da | Ne |
| `approve` | Da | Da |
| `allowance` | Da | Da |
| `transferFrom` | Da | Da |

## Kriteriji prihvacanja

Svaki kriterij koristi oblik **Zadano / Kada / Tada**. Poruke navedene u
kriterijima potpuno se podudaraju s porukama u ugovoru.

### K1 - Uspjesno izdavanje

- **Zadano:** Vlasnik pozove ugovor s novim `pdfHash` vrijednostima.
- **Kada:** Pozove `issueDiploma` s podacima studenta, studija, datumom i
  hashom PDF-a.
- **Tada:** Ugovor sprema diplomu s ID-em `1` ili sljedecim slobodnim ID-em,
  povecava `nextDiplomaId` i emitira `DiplomaIssued`.

### K2 - Odbijanje duplikata

- **Zadano:** `pdfHash` je vec spremljen.
- **Kada:** Vlasnik pokusa ponovno izdati diplomu s istim hashom.
- **Tada:** Poziv ne uspije s porukom
  `Diploma s tim hashom vec postoji. Nije moguce izdati duplikat.`
  i brojac se ne mijenja.

### K3 - Kontrola vlasnika

- **Zadano:** Pozivatelj nije trenutni vlasnik.
- **Kada:** Pozove `issueDiploma` ili `transferOwnership`.
- **Tada:** Poziv ne uspije s porukom
  `Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju.`

### K4 - Citanje postojece diplome

- **Zadano:** Diploma s trazenim ID-em postoji.
- **Kada:** Bilo koji korisnik pozove `getDiploma`.
- **Tada:** Funkcija vrati tocne podatke spremljene diplome bez transakcije.

### K5 - Neuspjesno citanje nepostojece diplome

- **Zadano:** Diploma s trazenim ID-em ne postoji.
- **Kada:** Bilo koji korisnik pozove `getDiploma`.
- **Tada:** Poziv ne uspije s porukom `Diploma s tim ID-om ne postoji.`

### K6 - Javna provjera

- **Zadano:** Korisnik ima samo ID diplome i nema povezan novcanik.
- **Kada:** Provjeri postojeci ID kroz javni modul.
- **Tada:** Podaci su dostupni za citanje bez prijave, a provjera koristi samo
  ID i ne zahtijeva slanje PDF-a.

### K7 - Transfer vlasnika tokena

- **Zadano:** Trenutni vlasnik ima dovoljan saldo i valjana odredisna adresa
  nije nulta.
- **Kada:** Vlasnik pozove `transfer`.
- **Tada:** Saldo vlasnika se smanji, saldo primatelja poveca i emitira se
  `Transfer`.

### K8 - Burn vlastitih tokena

- **Zadano:** Vlasnik ima dovoljan saldo.
- **Kada:** Vlasnik pozove `burn` s iznosom koji nije veci od salda.
- **Tada:** Vlasnikov saldo i `totalSupply` smanje se za tocno taj iznos.

### K9 - Odbijanje burna bez salda

- **Zadano:** Vlasnik nema dovoljno vlastitih tokena.
- **Kada:** Pozove `burn` s iznosom vecim od vlastitog salda.
- **Tada:** Poziv ne uspije s porukom `Nemate dovoljno tokena za spaljivanje.`

### K10 - Prijenos vlasnistva

- **Zadano:** Trenutni vlasnik navede valjanu novu adresu.
- **Kada:** Pozove `transferOwnership`.
- **Tada:** `owner()` vrati novu adresu i emitira se `OwnershipTransferred`.

### K11 - Brojac i nepromijenjeno stanje nakon neuspjeha

- **Zadano:** Izdavanje ne uspije zbog neovlastenog poziva ili duplikata.
- **Kada:** Transakcija se izvrsi.
- **Tada:** `nextDiplomaId` i podaci diploma ostanu nepromijenjeni, a za
  neovlasteni poziv vrijedi poruka
  `Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju.`

### K12 - Pocetni ERC-20 parametri

- **Zadano:** Deployment ugovora je uspjesan.
- **Kada:** Provjere se `name`, `symbol`, `decimals`, `totalSupply` i saldo
  pocetnog vlasnika.
- **Tada:** Vrijednosti su `DiplomaChain`, `DPLC`, `18` i
  `1.000.000 * 10^18`, a cijela pocetna kolicina pripada vlasniku.

## Mreza i ogranicenja

- Ciljana mreza je Sepolia s chain ID-em `11155111`.
- Sirovi PDF, privatni kljucevi i podaci za prijavu ne spremaju se na
  blockchain.
- Opoziv diploma, governance i dodatna funkcija `mint` nisu u opsegu.
