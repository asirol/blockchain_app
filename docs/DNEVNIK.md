# AI dnevnik

## T1 — Postavljanje projekta (19.10.2026.)
- Cilj termina: Upoznati se s promptanjem agentu i provjerom onoga što je napravio.
- Najkorisniji prompt (kopiran u cijelosti):
Napravi mi moderan i jednostavan Web3 frontend u Vue-u i Tailwindu za aplikaciju koja omogućuje fakultetima izdavanje digitalnih diploma na blockchainu te studentima i poslodavcima brzu provjeru njihove autentičnosti. 
- Što je AI napravio dobro: Napravio plan i pitao me potvrdu prije nego je krenuo s radom.
- Što je AI napravio drugačije nego što sam očekivao: Dodao je više elemenata na frontend nego što sam očekivala.
- Što sam dodao u AGENTS.md: Danas ništa
- Provjera: Pokrenula sam `npm run dev` na frontendu. 
- Commit: 831cdae864d44ff42998e932eac483af105027a4

## T2 — Upoznavanje s MetaMaskom (26.10.2026.)
- Cilj termina: Postaviti i naučiti osnove korištenja MetaMaska i Sepolie.
- Najkorisniji prompt (kopiran u cijelosti):
Na frontedu napravi mogućnost spajanja sa metamask walletom (svojim koji imam) i da mogu poslati trasakciju.
- Što je AI napravio dobro: Napravio je button koji se odmah mogao povezati na moj MetaMask i bilo je moguće slati transakcije. Prije same implementacije me pitao adresu mog walleta. 
- Što je AI napravio drugačije nego što sam očekivao: Podaci transakcije se nisu mogli mijenjati (iznos i račun), odnosno mogla sam slati samo defaultno postavljeni iznos sa vlastitog na vlastiti račun. To je popravljeno kroz dodatne promtove. 
- Što sam dodao u AGENTS.md: Danas ništa
- Provjera: Poslala sam 0.01 SepoliaETH na račun kolegice. 
- Commit: 84e1ee8526720ff8acb4060c7d07f1d2183fcbcc

## T3 — Specifikacija prije koda (2.11.2026.)
- Cilj termina: Napisati specifikaciju svog tokena i modula koja je dovoljno precizna da AI iz nje može napisati pametni ugovor bez nagađanja.
- Najkorisniji prompt (kopiran u cijelosti):
Ponašaj se kao poslovni analitičar za blockchain aplikacije. Gradim: 
Web3 aplikacija koja omogućuje fakultetu izdavanje digitalnih diploma na blockchainu, a studentima i poslodavcima provjeru autentičnosti tih diploma
Aplikacija ima token zajednice (ERC-20) i modul: provjera autentičnosti diploma.
Postavljaj mi pitanja jedno po jedno (najviše 12) dok ne dobiješ odgovor na svako pitanje
iz popisa odluka u nastavku. Ne predlaži funkcionalnosti koje nisam spomenuo; ako misliš
da nešto nedostaje, pitaj me.
Kad završimo, popuni docs/SPEC.md prema predlošku u toj datoteci.
Kriterije prihvaćanja piši isključivo u obliku Zadano / Kada / Tada, s točnom porukom
greške za neuspješne slučajeve. Ne piši kod.
- Što je AI napravio dobro: Sve što sam tražila je napisao u SPEC. 
- Što je AI napravio drugačije nego što sam očekivao: Bilo je nekoliko nedosljednosti koje sam morala ispravljati u SPEC i nije implementirao moj modul kada je radio interface i contract. 
- Što sam dodao u AGENTS.md: Danas ništa
- Provjera: Prošla sam kroz specifikaciju i provjerila je li sve onako kako želim. 
- Commit: 76e602da8c21a724831e8b218ccd0bcdb7cd6014

NALAZ | ODLUKA | OBRAZLOŽENJE
1. Nisu definirana pravila za prazno ime, prazan studij, prazan hash, predugačke stringove, nevažeći datum ili budući datum. Vlasnik može izdati formalno neupotrebljivu diplomu. | Prihvaćeno | Za svaki ulaz definirati validaciju: prazne vrijednosti, maksimalne duljine, format/hash duljinu i dopušteni raspon datuma, uz zaseban neuspješan test.
2. Svaka osoba koja zna ID može dobiti osobne podatke studenta. Specifikacija ne razmatra privatnost, curenje podataka ni mogućnost pogađanja sekvencijalnih ID-jeva. | Prihvaćeno | Kada se izda diploma i bilo koja osoba pozove getDiploma za ID-jeve 1 do nextDiplomaId - 1. Tada je očekivano javno otkrivanje podataka izričito potvrđeno ili je pristup ograničen.
3. Poruka tvrdi da je diploma „važeća” i „autentična”, iako se provjerava samo postojanje ID-a, bez PDF-a, potpisa ili statusa opoziva. Bilo koji postojeći zapis može biti označen autentičnim. | Odbijeno | Ako postoji, znači da je autentična jer se zapis ne može mijenjati.
4. Nije definirano ponašanje kada brojač dosegne maksimalnu vrijednost tipa. Također nije definirano treba li se brojač povećati ako transakcija ne uspije. | Prijvaćeno | Kada izdavanje ne uspije zbog bilo kojeg razloga. Tada se stanje brojača i mapa diploma ne mijenja. Definirati ponašanje pri maksimalnoj vrijednosti brojača.
5. Vlasnik može prenijeti vlasništvo na nedostupnu ili kompromitiranu adresu, nakon čega više nema legitimnog načina upravljanja. Nema potvrde primatelja ni recovery postupka. | Prihvaćeno. | Kada vlasnik prenese vlasništvo. Tada mora biti emitiran provjerljiv događaj, nova adresa mora biti jasno potvrđena, a specifikacija mora definirati postoji li recovery ili je gubitak trajni.

| Kriterij | Što sam kliknuo | Očekivano | Dobiveno (poruka iz konzole) |
|---|---|---|---|
| K12 — decimale tokena | S računa vlasnika pozvao sam `decimals()` | `18` | `"18"` |
| K3/K7 — ovlasti za transfer | S drugog računa pozvao sam `transfer()` | Poziv ne uspijeva uz poruku `"Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju."` | `"Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju."` |
| K8/K9 — burn iznad salda | S računa vlasnika pozvao sam `burn()` s iznosom većim od salda | Poziv ne uspijeva uz poruku `"Nemate dovoljno tokena za spaljivanje."` | `"Nemate dovoljno tokena za spaljivanje."` |