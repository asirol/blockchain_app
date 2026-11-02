# Specifikacija

DiplomaChain je Web3 aplikacija za izdavanje digitalnih diploma na Sepolia
testnoj mreži i javnu provjeru njihove autentičnosti.

## Korisnici i uloge

### Fakultet (vlasnik ugovora)

- Pri deploymentu adresa fakultetskog MetaMask novčanika postaje vlasnik
  ugovora (`owner`).
- Povezuje MetaMask na Sepolia mrežu.
- Izdaje diplome.
- Prenosi vlasništvo ugovora na drugi fakultetski novčanik.
- Provjerava diplome.
- Koristi ERC-20 funkcije prikaza salda, transfera i spaljivanja vlastitih
  tokena.

### Ostali korisnici

- Njihova jedina funkcija je javna provjera autentičnosti diplome unosom ID-a.
- Provjera ne zahtijeva novčanik, prijavu ni registraciju.
- Ne mogu izvršavati ERC-20 radnje i za njih se u sučelju ne prikazuju
  funkcije prikaza salda, transfera ni burnanja.

## Funkcije ugovora

### Modul diploma

- `issueDiploma` automatski generira sljedeći ID iz brojača
  `nextDiplomaId`.
- Brojač počinje od `1`, povećava se za svaku novu diplomu i nikad se ne
  smanjuje niti reciklira.
- Diploma sadrži ime i prezime studenta, naziv studija/smjera, datum izdavanja
  i hash PDF-a diplome.
- Isti hash PDF-a ne smije biti izdan više puta.
- Opoziv diplome nije podržan u ovoj verziji.
- `getDiploma` omogućuje javno čitanje podataka prema ID-u. Za nepostojeći ID
  funkcija revertira s porukom: `Diploma s tim ID-om ne postoji.`
- Javna provjera koristi samo ID diplome. Hash se pri provjeri ne uspoređuje s
  PDF-om. Usporedba hasha s PDF-om nije dio ove verzije.
- Poziv funkcije `issueDiploma` s adrese koja nije vlasnik ugovora ne uspijeva
  uz poruku: `Pristup odbijen: samo vlasnik ugovora može izvršiti ovu radnju.`
- Pokušaj izdavanja već postojećeg hasha ne uspijeva uz poruku:
  `Diploma s tim hashom već postoji. Nije moguće izdati duplikat.`

### Vlasništvo

- `owner()` vraća trenutnog vlasnika ugovora.
- `transferOwnership(newOwner)` prenosi vlasništvo na drugi fakultetski
  novčanik.
- `issueDiploma` i `transferOwnership` dostupni su samo vlasniku ugovora.
- Poziv funkcije `transferOwnership` s adrese koja nije vlasnik ugovora ne
  uspijeva uz poruku: `Pristup odbijen: samo vlasnik ugovora može izvršiti ovu radnju.`

### ERC-20 token zajednice

- Token služi kao nagrada i priznanje za doprinos ekosustavu.
- Token nije sredstvo plaćanja ni vrijednosni papir.
- Pri deploymentu se jednom izdaje ukupno `1.000.000` tokena s `18` decimala.
- Cijela početna količina dodjeljuje se vlasniku ugovora.
- `mint` funkcija ne postoji; ukupna količina ne može se povećati.
- ERC-20 prikaz salda, `transfer` i `burn(amount)` dostupni su samo fakultetu
  (vlasniku ugovora) uz povezan MetaMask na Sepolia mreži.
- `burn(amount)` spaljuje samo vlastite tokene fakulteta.
- Pokušaj spaljivanja većeg iznosa od vlastitog salda ne uspijeva uz poruku:
  `Nemate dovoljno tokena za spaljivanje.`
- Nema zamrzavanja, oduzimanja tokena ni administratorskog burnanja tuđih
  tokena.
- Governance glasovanje nije u opsegu ove verzije.
- `approve` i `transferFrom` nisu dio korisničkog sučelja ove verzije.

## Tko smije što

| Radnja | Fakultet (vlasnik ugovora) | Ostali korisnici |
|---|---:|---:|
| Izdavanje diplome | Da, uz MetaMask | Ne |
| Prijenos vlasništva | Da, uz MetaMask | Ne |
| Čitanje i provjera diplome | Da | Da |
| Prikaz ERC-20 salda | Da, uz MetaMask | Ne |
| ERC-20 transfer | Da, uz MetaMask | Ne |
| Burn vlastitih tokena | Da, uz MetaMask | Ne |
| Mint tokena | Ne postoji | Ne postoji |
| Opoziv diplome | Ne postoji | Ne postoji |
| Governance glasovanje | Nije u opsegu | Nije u opsegu |

Fakultet može izvršavati izdavanje diploma i ERC-20 radnje samo na Sepolia
mreži s chain ID-em `11155111`. Aplikacija ne podržava mainnet ni druge mreže. Ostali korisnici mogu samo javno provjeravati diplome.

## Što se NE sprema na blockchain

- Sirovi PDF diplome.
- Sadržaj PDF-a; sprema se samo njegov hash.
- Podaci za prijavu ili registraciju, jer te funkcionalnosti nisu podržane.
- Privatni ključevi.

## Kriteriji prihvaćanja

### Izdavanje i vlasništvo

- **Zadano** je da je MetaMask fakulteta povezan na Sepolia mrežu, da je
  povezana adresa jednaka `owner()` i da hash PDF-a još ne postoji.
- **Kada** fakultet pozove `issueDiploma` s imenom i prezimenom studenta,
  nazivom studija/smjera, datumom izdavanja i hashom PDF-a.
- **Tada** ugovor dodjeljuje sljedeći jedinstveni ID počevši od `1`, sprema
  podatke diplome i povećava brojač za `1`.

- **Zadano** je da hash PDF-a već postoji u ugovoru.
- **Kada** fakultet pokuša izdati diplomu s istim hashom.
- **Tada** poziv ne uspije i prikazuje se točna poruka:
  `Diploma s tim hashom već postoji. Nije moguće izdati duplikat.`

- **Zadano** je da pozivatelj nije vlasnik ugovora.
- **Kada** pokuša pozvati `issueDiploma` ili `transferOwnership`.
- **Tada** poziv ne uspije i prikazuje se točna poruka:
  `Pristup odbijen: samo vlasnik ugovora može izvršiti ovu radnju.`

### Javna provjera diplome

- **Zadano** je da ID diplome postoji.
- **Kada** bilo koji korisnik provjeri diplomu unosom tog ID-a bez novčanika,
  prijave i registracije.
- **Tada** prikazuju se podaci pronađeni na blockchainu i točna poruka:
  `✅ Diploma je važeća. Podaci su pronađeni na blockchainu.`

- **Zadano** je da ID diplome ne postoji.
- **Kada** bilo koji korisnik provjeri diplomu unosom tog ID-a.
- **Tada** prikazuje se točna poruka:
  `❌ Diploma s tim ID-om ne postoji.`

- **Zadano** je da korisnik želi provjeriti autentičnost diplome.
- **Kada** otvori javnu provjeru.
- **Tada** provjera koristi samo ID, ne zahtijeva unos PDF-a i ne uspoređuje
  hash s PDF-om.

### ERC-20 token

- **Zadano** je da je deployment završen.
- **Kada** se provjere ukupna količina i saldo vlasnika ugovora.
- **Tada** ukupna količina iznosi `1.000.000` tokena s `18` decimala, a cijela
  količina pripada fakultetu.

- **Zadano** je da je fakultet povezao MetaMask na Sepolia mrežu i ima
  dovoljan saldo.
- **Kada** potvrdi ERC-20 transfer ili burn transakciju u MetaMasku.
- **Tada** stanje tokena se ažurira prema potvrđenoj transakciji.

- **Zadano** je da fakultet nema dovoljno vlastitih tokena za burn.
- **Kada** pokuša spaliti veći iznos od vlastitog salda.
- **Tada** poziv ne uspije i prikazuje se točna poruka:
  `Nemate dovoljno tokena za spaljivanje.`

- **Zadano** je da je korisnik ostali korisnik.
- **Kada** pokuša izvršiti ERC-20 radnju kroz web sučelje.
- **Tada** ERC-20 radnje nisu dostupne jer ih sučelje prikazuje samo fakultetu.

### Mreža i pristup

- **Zadano** je da je MetaMask povezan na mrežu različitu od Sepolia.
- **Kada** fakultet pokuša izdati diplomu ili izvršiti ERC-20 radnju.
- **Tada** transakcija se ne pokreće i sučelje traži prebacivanje na Sepolia
  mrežu s chain ID-em `11155111`.

- **Zadano** je da korisnik želi javno provjeriti diplomu.
- **Kada** otvori modul provjere.
- **Tada** provjera je dostupna bez novčanika, prijave i registracije.
