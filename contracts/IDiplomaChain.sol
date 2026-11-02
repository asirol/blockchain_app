// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDiplomaChainToken is IERC20 {
    // Uloga: fakultet (trenutni vlasnik); SPEC: K3, K10.
    function owner() external view returns (address);

    // Uloga: fakultet (trenutni vlasnik); SPEC: K3, K10, K11.
    function transferOwnership(address newOwner) external;

    // Uloga: fakultet; SPEC: K6, K12.
    function decimals() external view returns (uint8);

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
