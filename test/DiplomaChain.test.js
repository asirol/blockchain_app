import { network } from "hardhat";
const { ethers } = await network.connect();

import { expect } from "chai";

describe("DiplomaChain", function () {
  let diplomaChain;
  let owner;
  let recipient;
  let otherUser;

  const initialSupply = ethers.parseUnits("1000000", 18);
  const accessDenied =
    "Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju.";

  beforeEach(async function () {
    [owner, recipient, otherUser] = await ethers.getSigners();
    const DiplomaChain = await ethers.getContractFactory("DiplomaChain");
    diplomaChain = await DiplomaChain.deploy();
    await diplomaChain.waitForDeployment();
  });

  it("K1: uspjesno izdaje diplomu, povecava brojac i emitira dogadaj", async function () {
    const issueDate = 1735689600;
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("pdf-k1"));

    await expect(
      diplomaChain.issueDiploma(
        "Ana Anic",
        "FIPU (Racunarstvo) - univ. mag. ing. inf.",
        issueDate,
        pdfHash
      )
    )
      .to.emit(diplomaChain, "DiplomaIssued")
      .withArgs(1n, "Ana Anic", "FIPU (Racunarstvo) - univ. mag. ing. inf.", issueDate, pdfHash);

    expect(await diplomaChain.nextDiplomaId()).to.equal(2n);
    expect(await diplomaChain.getDiploma(1n)).to.deep.equal([
      "Ana Anic",
      "FIPU (Racunarstvo) - univ. mag. ing. inf.",
      1735689600n,
      pdfHash,
    ]);
  });

  it("odbija studij koji nije u trazenom formatu", async function () {
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("invalid-study-name"));

    await expect(
      diplomaChain.issueDiploma("Ana Anic", "FER Racunarstvo", 1735689600, pdfHash)
    ).to.be.revertedWithCustomError(diplomaChain, "InvalidStudyNameFormat");

    expect(await diplomaChain.nextDiplomaId()).to.equal(1n);
  });

  it("odbija studij bez kratica stecenog naziva", async function () {
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("invalid-degree-name"));

    await expect(
      diplomaChain.issueDiploma("Ana Anic", "FIPU (Informatika) - diploma", 1735689600, pdfHash)
    ).to.be.revertedWithCustomError(diplomaChain, "InvalidStudyNameFormat");
  });

  it("odbija prazno ime, buduci datum i prazan PDF hash", async function () {
    await expect(
      diplomaChain.issueDiploma("", "FIPU (Informatika) - univ. mag. inf.", 1735689600, ethers.ZeroHash)
    ).to.be.revertedWithCustomError(diplomaChain, "InvalidStudentName");

    await expect(
      diplomaChain.issueDiploma("Ana Anic", "FIPU (Informatika) - univ. mag. inf.", 4102444800, ethers.keccak256(ethers.toUtf8Bytes("future")))
    ).to.be.revertedWithCustomError(diplomaChain, "InvalidIssueDate");

    await expect(
      diplomaChain.issueDiploma("Ana Anic", "FIPU (Informatika) - univ. mag. inf.", 1735689600, ethers.ZeroHash)
    ).to.be.revertedWithCustomError(diplomaChain, "InvalidPdfHash");
  });

  it("K2: odbija izdavanje diplome s duplikatom hasha i ne mijenja brojac", async function () {
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("pdf-k2"));
    await diplomaChain.issueDiploma("Ivo Ivic", "PRAV (Pravo) - univ. bacc. iur.", 1735689600, pdfHash);

    await expect(
      diplomaChain.issueDiploma("Maja Majic", "MEF (Medicina) - dr. med.", 1735689601, pdfHash)
    ).to.be.revertedWith(
      "Diploma s tim hashom vec postoji. Nije moguce izdati duplikat."
    );

    expect(await diplomaChain.nextDiplomaId()).to.equal(2n);
    expect(await diplomaChain.getDiploma(1n)).to.deep.equal([
      "Ivo Ivic",
      "PRAV (Pravo) - univ. bacc. iur.",
      1735689600n,
      pdfHash,
    ]);
  });

  it("K3: odbija neovlasteno izdavanje i prijenos vlasnistva", async function () {
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("pdf-k3"));

    await expect(
      diplomaChain
        .connect(otherUser)
        .issueDiploma("Student", "FIPU (Informatika) - univ. mag. inf.", 1735689600, pdfHash)
    ).to.be.revertedWith(accessDenied);

    await expect(
      diplomaChain.connect(otherUser).transferOwnership(recipient.address)
    ).to.be.revertedWith(accessDenied);
  });

  it("K4: bilo koji korisnik cita postojecu diplomu", async function () {
    const issueDate = 1735689600;
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("pdf-k4"));
    await diplomaChain.issueDiploma(
      "Sara Saric",
      "EFZG (Ekonomija) - univ. bacc. oec.",
      issueDate,
      pdfHash
    );

    expect(await diplomaChain.connect(otherUser).getDiploma(1n)).to.deep.equal([
      "Sara Saric",
      "EFZG (Ekonomija) - univ. bacc. oec.",
      1735689600n,
      pdfHash,
    ]);
  });

  it("K5: odbija citanje nepostojece diplome", async function () {
    await expect(diplomaChain.connect(otherUser).getDiploma(1n)).to.be
      .revertedWith("Diploma s tim ID-om ne postoji.");
  });

  it("K6: javna provjera koristi samo ID i ne zahtijeva transakciju", async function () {
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("pdf-k6"));
    await diplomaChain.issueDiploma(
      "Luka Lukic",
      "AF (Arhitektura) - univ. bacc. ing. arch.",
      1735689600,
      pdfHash
    );

    // Hardhat poziv preko read-only providera predstavlja javno citanje bez novcanika.
    const diploma = await diplomaChain.getDiploma.staticCall(1n);
    expect(diploma).to.deep.equal([
      "Luka Lukic",
      "AF (Arhitektura) - univ. bacc. ing. arch.",
      1735689600n,
      pdfHash,
    ]);
  });

  it("PDF provjera: javno pronalazi diplomu po hashu datoteke", async function () {
    const issueDate = 1735689600;
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("pdf-by-hash"));
    await diplomaChain.issueDiploma(
      "Mia Matic",
      "PMF (Biologija) - univ. bacc. biol.",
      issueDate,
      pdfHash
    );

    expect(
      await diplomaChain.connect(otherUser).getDiplomaByHash(pdfHash)
    ).to.deep.equal([
      1n,
      "Mia Matic",
      "PMF (Biologija) - univ. bacc. biol.",
      BigInt(issueDate),
      pdfHash,
    ]);
  });

  it("PDF provjera: odbija nepoznati hash", async function () {
    const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("nepoznati-pdf"));

    await expect(
      diplomaChain.connect(otherUser).getDiplomaByHash(unknownHash)
    ).to.be.revertedWith("Diploma s tim hashom ne postoji.");
  });

  it("K7: vlasnik prenosi tokene i emitira Transfer", async function () {
    const amount = ethers.parseUnits("25", 18);

    await expect(diplomaChain.transfer(recipient.address, amount))
      .to.emit(diplomaChain, "Transfer")
      .withArgs(owner.address, recipient.address, amount);

    expect(await diplomaChain.balanceOf(owner.address)).to.equal(
      initialSupply - amount
    );
    expect(await diplomaChain.balanceOf(recipient.address)).to.equal(amount);
  });

  it("K8: vlasnik spaljuje vlastite tokene", async function () {
    const amount = ethers.parseUnits("40", 18);

    await diplomaChain.burn(amount);

    expect(await diplomaChain.balanceOf(owner.address)).to.equal(
      initialSupply - amount
    );
    expect(await diplomaChain.totalSupply()).to.equal(initialSupply - amount);
  });

  it("K9: odbija burn veci od vlastitog salda", async function () {
    await expect(diplomaChain.burn(initialSupply + 1n)).to.be.revertedWith(
      "Nemate dovoljno tokena za spaljivanje."
    );
  });

  it("K10: prenosi vlasnistvo i emitira OwnershipTransferred", async function () {
    await expect(diplomaChain.transferOwnership(recipient.address))
      .to.emit(diplomaChain, "OwnershipTransferred")
      .withArgs(owner.address, recipient.address);

    expect(await diplomaChain.owner()).to.equal(recipient.address);
  });

  it("K11: neuspjesno neovlasteno izdavanje ostavlja brojac i stanje nepromijenjenima", async function () {
    const pdfHash = ethers.keccak256(ethers.toUtf8Bytes("pdf-k11"));
    const nextIdBefore = await diplomaChain.nextDiplomaId();

    await expect(
      diplomaChain
        .connect(otherUser)
        .issueDiploma("Student", "FIPU (Informatika) - univ. mag. inf.", 1735689600, pdfHash)
    ).to.be.revertedWith(accessDenied);

    expect(await diplomaChain.nextDiplomaId()).to.equal(nextIdBefore);
    await expect(diplomaChain.getDiploma(1n)).to.be.revertedWith(
      "Diploma s tim ID-om ne postoji."
    );
  });

  it("K12: postavlja pocetne ERC-20 parametre i saldo vlasnika", async function () {
    expect(await diplomaChain.name()).to.equal("DiplomaChain");
    expect(await diplomaChain.symbol()).to.equal("DPLC");
    expect(await diplomaChain.decimals()).to.equal(18n);
    expect(await diplomaChain.totalSupply()).to.equal(initialSupply);
    expect(await diplomaChain.balanceOf(owner.address)).to.equal(initialSupply);
  });

  it("S1: odbija renounceOwnership i zadrzava postojeceg vlasnika", async function () {
    await expect(diplomaChain.renounceOwnership())
      .to.be.revertedWithCustomError(
        diplomaChain,
        "OwnershipRenunciationDisabled"
      );

    expect(await diplomaChain.owner()).to.equal(owner.address);
  });
});
