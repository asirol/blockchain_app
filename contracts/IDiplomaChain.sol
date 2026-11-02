// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDiplomaChainToken {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Uloga: fakultet (trenutni vlasnik); SPEC: K3, K10.
    function owner() external view returns (address);

    // Uloga: fakultet (trenutni vlasnik); SPEC: K3, K10, K11.
    function transferOwnership(address newOwner) external;

    // Uloga: fakultet i javni citatelji; SPEC: K6, K12.
    function totalSupply() external view returns (uint256);

    // Uloga: fakultet; SPEC: K6, K9, K12.
    function balanceOf(address account) external view returns (uint256);

    // Uloga: fakultet; SPEC: K6, K12.
    function decimals() external view returns (uint8);

    // Uloga: fakultet (trenutni vlasnik); SPEC: K7, K9, K10, K12.
    function transfer(address to, uint256 amount) external returns (bool);

    // Uloga: fakultet (trenutni vlasnik); SPEC: K8, K9, K12.
    function burn(uint256 amount) external;
}

interface IDiplomaChainModul {
    event DiplomaIssued(
        uint256 indexed diplomaId,
        string studentName,
        string studyName,
        uint256 issueDate,
        bytes32 pdfHash
    );
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Uloga: fakultet (trenutni vlasnik); SPEC: K1, K2, K3, K10, K11.
    function issueDiploma(
        string calldata studentName,
        string calldata studyName,
        uint256 issueDate,
        bytes32 pdfHash
    ) external returns (uint256 diplomaId);

    // Uloga: bilo koji korisnik, bez novcanika; SPEC: K4, K5, K6.
    function getDiploma(uint256 diplomaId)
        external
        view
        returns (
            string memory studentName,
            string memory studyName,
            uint256 issueDate,
            bytes32 pdfHash
        );

    // Uloga: bilo koji korisnik; SPEC: K1, K11.
    function nextDiplomaId() external view returns (uint256);

    // Uloga: fakultet (trenutni vlasnik); SPEC: K3, K10, K11.
    function owner() external view returns (address);

    // Uloga: fakultet (trenutni vlasnik); SPEC: K3, K10, K11.
    function transferOwnership(address newOwner) external;
}
