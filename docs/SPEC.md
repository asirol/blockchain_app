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
- Mogu biti primatelji tokena na blockchainu, ali aplikacija im ne daje
  korisničko sučelje za slanje, primanje ili upravljanje tokenima.

## Funkcije ugovora

### Precizni ABI potpisi i događaji

Ugovor se sastoji od sučelja `IDiplomaChainToken` i
`IDiplomaChainModul`. Oba sučelja koriste Solidity pragma verziju
`^0.8.24`.

#### Modul diploma

- `issueDiploma(string studentName, string studyName, uint256 issueDate, bytes32 pdfHash)`
  vraća `uint256 diplomaId`.
- `getDiploma(uint256 diplomaId)` vraća
  `(string studentName, string studyName, uint256 issueDate, bytes32 pdfHash)`.
- `nextDiplomaId()` vraća `uint256`.
- `nextDiplomaId` počinje od `1`, povećava se nakon svakog uspješnog
  izdavanja i nikad se ne smanjuje niti reciklira.
- `DiplomaIssued(uint256 indexed diplomaId, string studentName,
  string studyName, uint256 issueDate, bytes32 pdfHash)` emitira se nakon
  uspješnog izdavanja diplome.

#### Vlasništvo

- `owner()` vraća `address` trenutnog vlasnika.
- `transferOwnership(address newOwner)` ne vraća vrijednost.
- Nakon uspješnog prijenosa emitira se
  `OwnershipTransferred(address indexed previousOwner,
  address indexed newOwner)`.
- Događaj `OwnershipTransferred` dio je i token sučelja i modula diploma.

#### Token

`IDiplomaChainToken` izlaže sljedeće funkcije:

- `owner()` vraća `address`.
- `transferOwnership(address newOwner)` ne vraća vrijednost.
- `totalSupply()` vraća `uint256`.
- `balanceOf(address account)` vraća `uint256`.
- `decimals()` vraća `uint8`.
- `transfer(address to, uint256 amount)` vraća `bool`.
- `burn(uint256 amount)` ne vraća vrijednost.

Token sučelje emitira standardni događaj
`Transfer(address indexed from, address indexed to, uint256 value)` i
događaj `OwnershipTransferred` koji nasljeđuje OpenZeppelin `Ownable`.
`IDiplomaChainToken` nasljeđuje OpenZeppelin sučelje `IERC20`, pa su
`allowance`, `approve` i `transferFrom` dio sučelja i ABI-ja ugovora.
Njihovo ponašanje je standardno OpenZeppelin ERC-20 ponašanje. Te funkcije
nisu dio korisničkog sučelja aplikacije, ali postoje u ABI-ju.

Ugovor tokena zove se `DiplomaChain` i nalazi se u datoteci
`contracts/DiplomaChain.sol`. ERC-20 naziv tokena je `DiplomaChain`, a simbol
tokena je `DPLC`.

Sve funkcije deklarirane u `IDiplomaChainToken`, uključujući funkcije
naslijeđene iz `IERC20`, moraju biti eksplicitno implementirane u
`DiplomaChain`. Implementacije mogu delegirati standardno ponašanje
OpenZeppelin baznim ugovorima.

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
- Tokene može primiti svaka valjana, nenulta blockchain adresa, uključujući
  ostale korisnike. Ne postoji posebno ograničenje broja tokena koje jedna
  adresa smije primiti.
- Najveći iznos jednog `transfer` poziva jednak je trenutačnom saldu
  pošiljatelja. Za `transferFrom` vrijedi i ograničenje trenutačnog
  odobrenja (`allowance`). Ne postoji dodatni limit po transakciji.
- `transfer` ugovora tokena smije pozvati samo trenutni vlasnik. Poziv s druge
  adrese ne uspijeva uz poruku:
  `Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju.`
- `burn(amount)` spaljuje samo vlastite tokene fakulteta.
- Pokušaj spaljivanja većeg iznosa od vlastitog salda ne uspijeva uz poruku:
  `Nemate dovoljno tokena za spaljivanje.`
- Nema zamrzavanja, oduzimanja tokena ni administratorskog burnanja tuđih
  tokena.
- Governance glasovanje nije u opsegu ove verzije.
- `approve` i `transferFrom` nisu dio korisničkog sučelja ove verzije.
- `approve`, `allowance` i `transferFrom` postoje u ABI-ju zbog nasljeđivanja
  OpenZeppelin `IERC20` sučelja. Njihovo standardno ERC-20 ponašanje nije
  dodatno ograničeno pravilom vlasnika ugovora.
- Član koji posjeduje tokene ne može ih poslati izravnim pozivom `transfer`,
  jer je ta funkcija u ugovoru ograničena na vlasnika. Može odobriti
  potrošača funkcijom `approve`, nakon čega odobreni potrošač može koristiti
  `transferFrom`, prema standardnim pravilima ERC-20. Te radnje nisu
  dostupne kroz korisničko sučelje.

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
- Aplikacija nema backend ni trajnu izvanlančanu bazu osobnih podataka.
  Odabrani PDF može se privremeno držati u memoriji preglednika radi rada
  sučelja, ali se ne šalje u ugovor i nije trajno pohranjen aplikacijom.

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

### Dodatna pravila i rubni slučajevi

#### Pristup ERC-20 funkcijama

- **Zadano** je da je pozivatelj adresa koja nije trenutni vlasnik ugovora.
- **Kada** izravno pozove `transfer` ili `burn`.
- **Tada** poziv ne uspije uz odgovarajuću poruku o odbijenom pristupu, a
  ograničenje nije samo vizualno skrivanje funkcije u sučelju.

- **Zadano** je da bilo koji korisnik izravno pozove `balanceOf`, `allowance`,
  `approve` ili `transferFrom`.
- **Kada** poziv poštuje standardna pravila ERC-20 funkcije.
- **Tada** funkcija primjenjuje standardno OpenZeppelin ERC-20 ponašanje i
  nije ograničena vlasništvom ugovora.

- **Zadano** je da trenutni vlasnik ugovora izvršava `transfer` na valjanu
  adresu.
- **Kada** potvrdi transakciju.
- **Tada** saldo pošiljatelja i primatelja mijenja se za točan iznos, a
  primatelj može tokene dalje koristiti prema pravilima za `transfer`,
  `approve` i `transferFrom`. Ne postoji dodatni limit po transakciji osim
  salda pošiljatelja.

- **Zadano** je da član ima tokene i želi ih poslati drugom članu.
- **Kada** pokuša izravno pozvati `transfer`.
- **Tada** poziv ne uspijeva jer je `transfer` ograničen na vlasnika. Ako
  član prethodno pozove `approve` za potrošača, taj potrošač može izvršiti
  `transferFrom` prema standardnim ERC-20 pravilima; to nije dostupno kroz
  korisničko sučelje.

- **Zadano** je da su `approve` i `transferFrom` izvan korisničkog sučelja,
  ali postoje u ABI-ju zbog OpenZeppelin `IERC20` sučelja.
- **Kada** se provjeri ABI ugovora i izravno pozovu te funkcije.
- **Tada** primjenjuju standardno OpenZeppelin ERC-20 ponašanje i nisu
  ograničene pravilom vlasnika ugovora.

#### Prijenos vlasništva

- **Zadano** je da vlasnik poziva `transferOwnership`.
- **Kada** je `newOwner` nulta adresa, trenutni vlasnik ili adresa ugovora.
- **Tada** ugovor primjenjuje standardnu OpenZeppelin `Ownable` validaciju.
  Nulta adresa uzrokuje standardnu custom grešku
  `OwnableInvalidOwner(address)`. Ponašanje za adresu trenutnog vlasnika i
  adresu ugovora jednako je standardnoj OpenZeppelin implementaciji i mora
  biti pokriveno testovima.

- **Zadano** je da je prijenos vlasništva uspješno potvrđen.
- **Kada** se vlasništvo prenese na novu adresu.
- **Tada** `owner()` vraća novu adresu, emitira se provjerljiv događaj,
  prethodni vlasnik više nema administratorske ovlasti, a specifikacija
  potvrđuje da saldo tokena ostaje na prethodnoj adresi; prijenos vlasništva
  sam po sebi ne prenosi tokene.

- **Zadano** je da je vlasništvo preneseno na nedostupnu ili kompromitiranu
  adresu.
- **Kada** se pokuša vratiti pristup ugovoru.
- **Tada** postupak oporavka mora biti izričito definiran i testiran ili se
  potvrđuje da je gubitak administratorskog pristupa trajan.

#### Validacija diploma

- **Zadano** je da vlasnik poziva `issueDiploma`.
- **Kada** pošalje prazno ime i prezime, prazan naziv studija, prazan hash,
  nevažeći format ili duljinu hasha, predugačak tekst, nevažeći datum ili
  datum u budućnosti.
- **Tada** poziv ne uspije, stanje ugovora se ne mijenja i za svaki slučaj
  postoji definirana točna poruka greške.

- **Zadano** je da se hash diploma računa iz standardiziranog ulaza.
- **Kada** se pokuša izdati isti `bytes32` hash, uključujući nulti hash ako
  nije dopušten.
- **Tada** ugovor odbija duplikat i ne povećava `nextDiplomaId`; algoritam
  hashiranja i ulazni format moraju biti unaprijed definirani.

- **Zadano** je da izdavanje diplome ne uspije zbog bilo kojeg razloga.
- **Kada** se transakcija izvrši.
- **Tada** `nextDiplomaId` i podaci diploma ostaju nepromijenjeni.

- **Zadano** je da `nextDiplomaId` dosegne najveću vrijednost svojeg tipa.
- **Kada** se pokuša izdati nova diploma.
- **Tada** poziv ne uspije bez preljeva i bez promjene stanja, uz definiranu
  točnu poruku.

#### Javna dostupnost podataka i ID-jevi

- **Zadano** je da je izdana barem jedna diploma.
- **Kada** bilo koja osoba pozove `getDiploma` za svaki ID od `1` do
  `nextDiplomaId - 1`.
- **Tada** javna dostupnost podataka o studentu mora biti izričito potvrđena
  kao namjerno ponašanje ili mora biti uvedeno ograničenje pristupa.

- **Zadano** je da korisnik unese ID `0`, negativan broj, decimalni broj,
  broj veći od zadnje izdane diplome ili broj izvan raspona tipa.
- **Kada** pokrene javnu provjeru.
- **Tada** sučelje odbija unos prije poziva ili prikazuje definiranu poruku
  za nepostojeći ID, bez slanja neispravne transakcije.

#### ERC-20 rubni slučajevi i količine

- **Zadano** je da vlasnik pokušava izvršiti ERC-20 radnju.
- **Kada** pokušava transferirati više od salda, transferirati na nultu
  adresu ili adresu ugovora, spaliti `0` tokena ili spaliti cijeli saldo.
- **Tada** za svaki slučaj postoji izričito definirano dopušteno ili
  nedopušteno ponašanje, promjena `totalSupply` i promjena salda te
  neuspješan test gdje je primjenjivo.

- **Zadano** je da je deployment završen.
- **Kada** se provjere `decimals()`, `totalSupply()` i početni saldo.
- **Tada** `decimals()` iznosi `18`, `totalSupply()` iznosi
  `1.000.000 * 10^18` najmanjih jedinica, a cijeli iznos pripada početnom
  vlasniku.

- **Zadano** je da pošiljatelj ili odobreni potrošač šalje tokene.
- **Kada** je iznos veći od salda pošiljatelja ili, kod `transferFrom`,
  veći od odobrenja.
- **Tada** standardna ERC-20 validacija odbija poziv, stanje se ne mijenja i
  ne postoji zaseban limit primatelja.

#### Najgori slučaj modula

- Dvostruko glasovanje nije moguće jer governance modul nije podržan.
- Kupnja tokenima, bodovi i ciljevi nisu definirani, pa za njih ne postoje
  poslovna pravila ni scenariji neuspjeha.
- Iskaznice nisu dio sustava i nije definiran postupak izdavanja druge
  iskaznice.
- Neuspješni pozivi, poput slanja više tokena od dostupnog salda ili
  spaljivanja više tokena od vlastitog salda, revertiraju i ne mijenjaju
  stanje ugovora.

#### Ovlasti i odgovornost administratora

- **Zadano** je da trenutni vlasnik izdaje diplomu.
- **Kada** izda diplomu s proizvoljnim podacima ili više diploma u kratkom
  vremenu.
- **Tada** ugovor provjerava samo eksplicitno definirana pravila, a svaki
  poziv emitira dovoljan događaj za naknadnu reviziju; dodatno odobrenje,
  ograničenje brzine i postupak za pogrešno izdanu diplomu moraju biti
  izričito označeni kao podržani ili izvan opsega.

#### Mreža, novčanik i transakcije

- **Zadano** je da je odabrani chain ID različit od `11155111`.
- **Kada** fakultet pokuša izdati diplomu ili izvršiti ERC-20 radnju kroz
  aplikaciju.
- **Tada** aplikacija ne šalje transakciju i traži prebacivanje na Sepoliju;
  ograničenje mreže u sučelju ne smatra se sigurnosnom kontrolom ugovora.

- **Zadano** je da MetaMask nije instaliran, povezivanje je odbijeno,
  korisnik odbije potpis, transakcija istekne ili bude vraćena, ili se
  promijene račun ili mreža tijekom rada.
- **Kada** korisnik pokuša izvršiti radnju.
- **Tada** sučelje prikazuje konkretnu grešku, ne prikazuje lažni uspjeh i
  ne ažurira stanje dok potvrđena transakcija nije uspješna.

- **Zadano** je da korisnik otvara javnu provjeru u čistom browser profilu
  bez MetaMaska i bez autentikacije.
- **Kada** provjeri postojeći i nepostojeći ID.
- **Tada** read-only provjera vraća odgovarajuće rezultate preko unaprijed
  definiranog RPC izvora, bez zahtjeva za novčanikom.

#### Granice tehničke provjerljivosti

- **Zadano** je da se u specifikaciji koristi pojam „fakultet” ili
  „fakultetski novčanik”.
- **Kada** se postavi proizvoljna blockchain adresa.
- **Tada** sustav je tretira samo kao on-chain vlasnika, osim ako nije
  definiran i testiran zaseban postupak provjere identiteta fakulteta.

- **Zadano** je da se provjerava tvrdnja da token nije sredstvo plaćanja ni
  vrijednosni papir.
- **Kada** se provode tehnički testovi ugovora.
- **Tada** se provjeravaju samo konkretna pravila ugovora, poput nepostojanja
  funkcija kupnje, prodaje, povrata ili obveze izdavatelja; pravni status
  tokena nije kriterij koji blockchain test može sam potvrditi.

- **Zadano** je da se provjerava što se ne sprema na blockchain.
- **Kada** se analiziraju payload transakcije, izvorni kod aplikacije i
  zapisivanje podataka.
- **Tada** payload ne sadrži sirovi PDF ni privatne ključeve, a dokumentirano
  je da se tvrdnja ne odnosi automatski na RPC providera, browser ili
  korisnički novčanik.

## Sljedivost

| Funkcija | Kriteriji |
|---|---|
| konstruktor `DiplomaChain()` | K12 — početna količina tokena i početni saldo vlasnika |
| `issueDiploma(string,string,uint256,bytes32) returns (uint256)` | K1 — uspješno izdavanje; K2 — validacija podataka i duplikata; K3 — pristup samo vlasniku; K10 — ovlasti i revizija; K11 — brojač i prijenos vlasništva |
| `DiplomaIssued(uint256 indexed,string,string,uint256,bytes32)` | K1 — uspješno izdavanje; K10 — događaj za reviziju |
| `getDiploma(uint256) returns (string,string,uint256,bytes32)` | K4 — postojeća diploma; K5 — nepostojeći ID; K6 — javna provjera bez novčanika |
| `nextDiplomaId() returns (uint256)` | K1 — početna vrijednost i povećanje; K2 — neuspješno izdavanje ne mijenja stanje; K11 — gornja granica brojača |
| `owner() returns (address)` | K3 — trenutni vlasnik i ovlasti; K10 — on-chain identitet administratora; K11 — stanje nakon prijenosa |
| `transferOwnership(address)` | K3 — samo vlasnik; K10 — administrativna ovlast; K11 — validacija i promjena vlasništva |
| `OwnershipTransferred(address indexed,address indexed)` | K3 — prijenos vlasništva; K10 — provjerljiv događaj; K11 — potvrda novog vlasnika |
| `totalSupply() returns (uint256)` | K6 — prikaz tokena; K9 — nepromjenjiva ukupna količina; K12 — početna količina tokena |
| `balanceOf(address) returns (uint256)` | K6 — prikaz salda vlasnika; K9 — provjera salda prije token-radnje; K12 — početni saldo |
| `allowance(address,address) returns (uint256)` | K6 — prikaz tokena; K9 — standardno ERC-20 ponašanje i rubni slučajevi |
| `approve(address,uint256) returns (bool)` | K6 — token-radnje u ABI-ju; K9 — standardno ERC-20 ponašanje i rubni slučajevi |
| `transferFrom(address,address,uint256) returns (bool)` | K6 — token-radnje u ABI-ju; K9 — standardno ERC-20 ponašanje i rubni slučajevi |
| `decimals() returns (uint8)` | K12 — 18 decimala |
| `transfer(address,uint256) returns (bool)` | K7 — prijenos tokena; K9 — rubni slučajevi transfera; K12 — ažuriranje salda |
| `burn(uint256)` | K8 — spaljivanje vlastitih tokena; K9 — saldo i rubni slučajevi burna; K12 — promjena `totalSupply` |
| `Transfer(address indexed,address indexed,uint256)` | K7 — revizija prijenosa; K8 — revizija spaljivanja; K9 — promjena salda i ukupne količine |

Kriteriji K1–K12 u ovoj tablici pokrivaju, redom: izdavanje diplome,
validaciju diplome, vlasništvo i pristup, provjeru postojeće diplome,
ponašanje za nepostojeći ID, javnu provjeru i prikaz tokena, transfer tokena,
burn tokena, ERC-20 rubne slučajeve, administratorsku reviziju, brojač i
prijenos vlasništva te početne token-količine i decimale. Mrežna ograničenja,
ponašanje MetaMaska i read-only RPC-a provjeravaju se na razini aplikacije,
dok je njihova on-chain funkcionalna točka u ovoj tablici navedena uz
odgovarajuću funkciju.
