# Sigurnosni pregled: DiplomaChain

| # | Provjera | Rezultat | Napomena |
|---|---|---|---|
| P1 | Za svaku funkciju koja mijenja stanje: tko je smije pozvati? Odgovara li to matrici ovlasti u SPEC-u? | Problem | `issueDiploma`, `transfer`, `burn` i `transferOwnership` ograničeni su na vlasnika. `approve` dopušta svakom korisniku postavljanje vlastitog odobrenja, a `transferFrom` provodi ERC-20 odobrenje; oboje je prema SPEC-u. Naslijeđeni `renounceOwnership` mijenja vlasništvo, ali nije naveden u SPEC-u. |
| P2 | Postoji li funkcija koja mijenja stanje, a nema nikakvu provjeru pozivatelja? Je li to namjerno? | U redu | `approve` može pozvati bilo tko, ali mijenja samo vlastito odobrenje, što je standardno ERC-20 ponašanje navedeno u SPEC-u. `transferFrom` provjerava odobrenje i saldo u naslijeđenom ERC-20 kodu; `renounceOwnership` ograničen je na vlasnika. |
| P3 | Koristi li ugovor igdje `tx.origin`? | U redu | Nijedna funkcija ne koristi `tx.origin`. |
| P4 | Provjeravaju li se svi ulazi: nulta adresa, 0, najveći iznos, duljina teksta? | Problem | `issueDiploma` ne ograničava prazna imena/studij, nulti `pdfHash` ni duljinu tekstova. Validaciju adresa i iznosa ERC-20 funkcija obavlja naslijeđeni `ERC20`; `transferOwnership` koristi provjeru `Ownable` za novu adresu. |
| P5 | Može li netko zaobići pravilo preko naslijeđene funkcije? | Problem | `transfer` dopušta samo vlasniku, ali odobreni korisnik može pozvati `transferFrom` i prenijeti tokene jer naslijeđeni ERC-20 `_transfer` ne poziva ograničenu funkciju `transfer`. `approve` omogućuje stvaranje takvog odobrenja. Ako je namjera da se tokeni ne mogu prenositi putem drugih korisnika, treba zatvoriti i taj put. `renounceOwnership` je naslijeđen preko `Ownable`, nije nadjačan u ugovoru. |
| P6 | Ima li blok `unchecked` ili verziju Solidityja ispod 0.8? | U redu | Ugovor koristi `pragma solidity ^0.8.24` i nema blok `unchecked`. |
| P7 | Ima li petlju preko niza koji raste? | U redu | Ugovor nema petlji niti iteracije preko rastućeg niza. |
| P8 | Ima li ugovor tajnu ili osobni podatak u varijabli? | Problem | `Diploma.studentName` pohranjuje ime studenta, a `issueDiploma` ga čini javno dostupnim na blockchainu. SPEC navodi da su podaci diploma javni, no osobni podaci su trajni i ne mogu se ukloniti s lanca. |
| P9 | Emitira li svaka promjena ovlasti događaj? | U redu | `transferOwnership` poziva `Ownable.transferOwnership`, koji emitira `OwnershipTransferred`. Naslijeđeni `renounceOwnership` također emitira taj događaj. |
| P10 | Što se dogodi ako vlasnik izgubi ključ ili pozove `renounceOwnership`? | Problem | Odluka: `renounceOwnership` nije prihvatljiv jer vlasništvo postaje nulta adresa i nitko više ne može izvršavati vlasničke funkcije, uključujući `issueDiploma`, `transfer` i `burn`. Gubitak ključa također onemogućuje pristup tim funkcijama. `renounceOwnership` je naslijeđen preko `Ownable`, a nije nadjačan. |

## Nalazi AI pregledavača

| # | Nalaz | Ozbiljnost (AI) | Odluka | Razlog | Test |
|---|---|---|---|---|---|
| N1 | Naslijeđeni `renounceOwnership` trajno onemogućuje vlasničke funkcije postavljanjem vlasnika na nultu adresu. | Srednja | Prihvaćen | Napad se može demonstrirati u ugovoru: vlasnik poziva naslijeđenu funkciju, `owner()` postaje `address(0)`, a daljnji pozivi `issueDiploma` i `transferOwnership` odbijaju se provjerama vlasnika. Ovo nije u SPEC-u i nema opravdanu funkcionalnu svrhu. | S1 |
