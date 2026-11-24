// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    IDiplomaChainModul,
    IDiplomaChainToken
} from "./IDiplomaChain.sol";

contract DiplomaChain is
    ERC20,
    Ownable,
    IDiplomaChainToken,
    IDiplomaChainModul
{
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;
    uint256 private _nextDiplomaId = 1;

    error OwnershipRenunciationDisabled();
    error InvalidStudyNameFormat();
    error InvalidStudentName();
    error InvalidIssueDate();
    error InvalidPdfHash();

    struct Diploma {
        string studentName;
        string studyName;
        uint256 issueDate;
        bytes32 pdfHash;
        bool exists;
    }

    mapping(uint256 diplomaId => Diploma) private _diplomas;
    mapping(bytes32 pdfHash => uint256 diplomaId) private _diplomaIdsByPdfHash;

    // K12.
    constructor() ERC20("DiplomaChain", "DPLC") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // K3, K10, K11.
    function owner()
        public
        view
        override(Ownable, IDiplomaChainToken)
        returns (address)
    {
        return Ownable.owner();
    }

    // K3, K10, K11.
    function transferOwnership(address newOwner)
        public
        override(Ownable, IDiplomaChainToken)
    {
        require(
            msg.sender == owner(),
            "Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju."
        );
        Ownable.transferOwnership(newOwner);
    }

    function renounceOwnership() public view override onlyOwner {
        revert OwnershipRenunciationDisabled();
    }

    // K6, K9, K12.
    function totalSupply()
        public
        view
        override(ERC20, IERC20)
        returns (uint256)
    {
        return super.totalSupply();
    }

    // K6, K9, K12.
    function balanceOf(address account)
        public
        view
        override(ERC20, IERC20)
        returns (uint256)
    {
        return super.balanceOf(account);
    }

    // K6, K9.
    function allowance(address tokenOwner, address spender)
        public
        view
        override(ERC20, IERC20)
        returns (uint256)
    {
        return super.allowance(tokenOwner, spender);
    }

    // K6, K9.
    function approve(address spender, uint256 amount)
        public
        override(ERC20, IERC20)
        returns (bool)
    {
        return super.approve(spender, amount);
    }

    // K6, K9.
    function transferFrom(address from, address to, uint256 amount)
        public
        override(ERC20, IERC20)
        returns (bool)
    {
        return super.transferFrom(from, to, amount);
    }

    // K12.
    function decimals()
        public
        pure
        override(ERC20, IDiplomaChainToken)
        returns (uint8)
    {
        return 18;
    }

    // K7, K9, K12.
    function transfer(address to, uint256 amount)
        public
        override(ERC20, IERC20)
        returns (bool)
    {
        require(
            msg.sender == owner(),
            "Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju."
        );
        return super.transfer(to, amount);
    }

    // K8, K9, K12.
    function burn(uint256 amount) external override {
        require(
            msg.sender == owner(),
            "Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju."
        );
        require(
            amount <= balanceOf(msg.sender),
            "Nemate dovoljno tokena za spaljivanje."
        );
        _burn(msg.sender, amount);
    }

    // K1, K2, K3, K10, K11.
    function issueDiploma(
        string calldata studentName,
        string calldata studyName,
        uint256 issueDate,
        bytes32 pdfHash
    ) external override returns (uint256 diplomaId) {
        require(
            msg.sender == owner(),
            "Pristup odbijen: samo vlasnik ugovora moze izvrsiti ovu radnju."
        );
        if (bytes(studentName).length == 0) {
            revert InvalidStudentName();
        }
        if (!_isValidStudyName(studyName)) {
            revert InvalidStudyNameFormat();
        }
        if (issueDate == 0 || issueDate > block.timestamp) {
            revert InvalidIssueDate();
        }
        if (pdfHash == bytes32(0)) {
            revert InvalidPdfHash();
        }
        require(
            _diplomaIdsByPdfHash[pdfHash] == 0,
            "Diploma s tim hashom vec postoji. Nije moguce izdati duplikat."
        );

        diplomaId = _nextDiplomaId;
        _diplomas[diplomaId] = Diploma({
            studentName: studentName,
            studyName: studyName,
            issueDate: issueDate,
            pdfHash: pdfHash,
            exists: true
        });
        _diplomaIdsByPdfHash[pdfHash] = diplomaId;
        _nextDiplomaId++;

        emit DiplomaIssued(
            diplomaId,
            studentName,
            studyName,
            issueDate,
            pdfHash
        );
    }

    function _isValidStudyName(string calldata studyName)
        private
        pure
        returns (bool)
    {
        bytes calldata value = bytes(studyName);
        uint256 openParen;
        bool foundOpenParen;

        for (uint256 i = 0; i < value.length; i++) {
            if (value[i] == 0x28) {
                openParen = i;
                foundOpenParen = true;
                break;
            }
        }
        if (!foundOpenParen || openParen < 2 || value[openParen - 1] != 0x20) {
            return false;
        }

        for (uint256 i = 0; i < openParen - 1; i++) {
            if (!(value[i] >= 0x41 && value[i] <= 0x5a)) {
                return false;
            }
        }

        uint256 closeParen;
        bool foundCloseParen;
        for (uint256 i = openParen + 1; i < value.length; i++) {
            if (value[i] == 0x29) {
                closeParen = i;
                foundCloseParen = true;
                break;
            }
        }
        if (
            !foundCloseParen
                || closeParen == openParen + 1
                || closeParen + 3 >= value.length
                || value[closeParen + 1] != 0x20
                || value[closeParen + 2] != 0x2d
                || value[closeParen + 3] != 0x20
        ) {
            return false;
        }

        if (
            value[openParen + 1] == 0x20
                || value[closeParen - 1] == 0x20
        ) {
            return false;
        }

        bool foundDotInDegree;
        for (uint256 i = closeParen + 4; i < value.length; i++) {
            if (value[i] == 0x2e) {
                foundDotInDegree = true;
            } else if (
                value[i] != 0x20
                    && !(value[i] >= 0x30 && value[i] <= 0x39)
                    && !(value[i] >= 0x41 && value[i] <= 0x5a)
                    && !(value[i] >= 0x61 && value[i] <= 0x7a)
            ) {
                return false;
            }
        }

        if (value[value.length - 1] == 0x20) {
            return false;
        }
        return foundDotInDegree;
    }

    // K4, K5, K6.
    function getDiploma(uint256 diplomaId)
        external
        view
        override
        returns (
            string memory studentName,
            string memory studyName,
            uint256 issueDate,
            bytes32 pdfHash
        )
    {
        Diploma storage diploma = _diplomas[diplomaId];
        require(
            diploma.exists,
            "Diploma s tim ID-om ne postoji."
        );
        return (
            diploma.studentName,
            diploma.studyName,
            diploma.issueDate,
            diploma.pdfHash
        );
    }

    function getDiplomaByHash(bytes32 pdfHash)
        external
        view
        override
        returns (
            uint256 diplomaId,
            string memory studentName,
            string memory studyName,
            uint256 issueDate,
            bytes32 storedPdfHash
        )
    {
        diplomaId = _diplomaIdsByPdfHash[pdfHash];
        require(diplomaId != 0, "Diploma s tim hashom ne postoji.");

        Diploma storage diploma = _diplomas[diplomaId];
        return (
            diplomaId,
            diploma.studentName,
            diploma.studyName,
            diploma.issueDate,
            diploma.pdfHash
        );
    }

    // K1, K2, K11.
    function nextDiplomaId()
        external
        view
        override
        returns (uint256)
    {
        return _nextDiplomaId;
    }
}
