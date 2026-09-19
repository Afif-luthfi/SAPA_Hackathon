// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// =============================================================================
// LanguagePackRegistry
// -----------------------------------------------------------------------------
// Mencatat versi "language pack" (model isyarat + skema intent + metadata
// dataset) beserta persetujuan validator untuk BOT Chain.
//
// STATUS PENTING (baca sebelum mengevaluasi):
//  - Kontrak ini BELUM di-deploy. Semua perilaku yang dipakai aplikasi saat ini
//    adalah simulasi lokal (lihat src/chain/registry.ts) yang menerapkan aturan
//    yang sama.
//  - Alamat testnet akan dirilis hanya setelah deployment nyata. Sampai saat
//    itu, alamat publisher/validator di bawah adalah contoh semata.
//
// Aturan yang dijamin (sejalan FR-040..FR-047, bab 12 PRD):
//  - Hanya validator terdaftar yang dapat menyetujui atau menonaktifkan pack.
//  - Activasi memerlukan kuorum 2 dari 3 validator (FR-045).
//  - Satu pack aktif per region; pack aktif lama tersupersede (FR-046).
//  - Deprecation memerlukan proposal validator pertama + persetujuan validator
//    kedua yang berbeda (FR-047).
//  - Hash bernilai nol dan metadata kosong ditolak; persetujuan ganda ditolak.
// =============================================================================

contract LanguagePackRegistry {
    uint8 public constant QUORUM = 2;

    enum PackStatus { Proposed, Active, Rejected, Deprecated, Superseded }

    struct LanguagePack {
        address proposer;
        bytes32 datasetHash;
        bytes32 modelHash;
        bytes32 intentSchemaHash;
        uint8 regionId;
        string metadataURI;
        uint8 approvalCount;
        PackStatus status;
        uint256 createdAt;
        uint256 activatedAt;
        // Deprecation dua validator (FR-047).
        address deprecationProposer;
        bytes32 reasonHash;
        uint8 deprecationApprovals;
    }

    event PackSubmitted(address indexed proposer, uint256 indexed packId, uint8 regionId);
    event PackApproved(uint256 indexed packId, address indexed approver, uint8 totalApprovals);
    event PackActivated(uint256 indexed packId, uint8 regionId);
    event PackSuperseded(uint256 indexed packId, uint8 regionId);
    event DeprecationProposed(uint256 indexed packId, address indexed proposer);
    event PackDeprecated(uint256 indexed packId, uint8 regionId);

    mapping(address => bool) public validators;
    LanguagePack[] public packs;
    // regionId => index pack aktif (0 jika kosong).
    mapping(uint8 => uint256) public activePack;

    address public publisher;

    modifier onlyValidator() {
        require(isValidator(msg.sender), "Registry: bukan validator terdaftar");
        _;
    }

    constructor(address[] memory initialValidators) {
        publisher = msg.sender;
        for (uint256 i = 0; i < initialValidators.length; i++) {
            require(initialValidators[i] != address(0), "Registry: alamat validator kosong");
            validators[initialValidators[i]] = true;
            validatorIndex[initialValidators[i]] = ++validatorCount;
        }
    }

    function isValidator(address account) public view returns (bool) {
        return validators[account];
    }

    function packCount() external view returns (uint256) {
        return packs.length;
    }

    // --- Submit (boleh dari siapa saja, tidak harus validator) -------------
    function submitLanguagePack(
        bytes32 datasetHash,
        bytes32 modelHash,
        bytes32 intentSchemaHash,
        uint8 regionId,
        string calldata metadataURI
    ) external returns (uint256 packId) {
        require(datasetHash != bytes32(0), "Registry: datasetHash tidak boleh nol");
        require(modelHash != bytes32(0), "Registry: modelHash tidak boleh nol");
        require(intentSchemaHash != bytes32(0), "Registry: intentSchemaHash tidak boleh nol");
        require(bytes(metadataURI).length > 0, "Registry: metadataURI tidak boleh kosong");

        packId = packs.length;
        packs.push(LanguagePack({
            proposer: msg.sender,
            datasetHash: datasetHash,
            modelHash: modelHash,
            intentSchemaHash: intentSchemaHash,
            regionId: regionId,
            metadataURI: metadataURI,
            approvalCount: 0,
            status: PackStatus.Proposed,
            createdAt: block.timestamp,
            activatedAt: 0,
            deprecationProposer: address(0),
            reasonHash: bytes32(0),
            deprecationApprovals: 0
        }));
        emit PackSubmitted(msg.sender, packId, regionId);
    }

    // --- Aktivasi dengan kuorum (FR-045) -----------------------------------
    function approveLanguagePack(uint256 packId) external onlyValidator {
        require(packId < packs.length, "Registry: pack tidak ditemukan");
        LanguagePack storage pack = packs[packId];
        require(pack.status == PackStatus.Proposed, "Registry: hanya pack Proposed yang dapat disetujui");

        // Catat persetujuan per pack agar validator tidak menandatangani ganda.
        require(!hasApproved(packId, msg.sender), "Registry: persetujuan ganda");
        recordApproval(packId, msg.sender);

        pack.approvalCount += 1;
        emit PackApproved(packId, msg.sender, pack.approvalCount);

        if (pack.approvalCount >= QUORUM) {
            _activate(packId, pack);
        }
    }

    function _activate(uint256 packId, LanguagePack storage pack) internal {
        uint8 regionId = pack.regionId;
        uint256 previous = activePack[regionId];
        if (previous != 0 && previous < packs.length && packs[previous].status == PackStatus.Active) {
            packs[previous].status = PackStatus.Superseded;
            emit PackSuperseded(previous, regionId);
        }
        pack.status = PackStatus.Active;
        pack.activatedAt = block.timestamp;
        activePack[regionId] = packId;
        emit PackActivated(packId, regionId);
    }

    // --- Deprecation kuorum dua validator berbeda (FR-047) -----------------
    function proposeDeprecation(uint256 packId, bytes32 reasonHash) external onlyValidator {
        require(packId < packs.length, "Registry: pack tidak ditemukan");
        require(reasonHash != bytes32(0), "Registry: reasonHash tidak boleh nol");
        LanguagePack storage pack = packs[packId];
        require(pack.status == PackStatus.Active, "Registry: hanya pack aktif yang dapat dinonaktifkan");
        require(pack.deprecationProposer == address(0), "Registry: proposal deprecation sudah ada");

        pack.deprecationProposer = msg.sender;
        pack.reasonHash = reasonHash;
        emit DeprecationProposed(packId, msg.sender);
    }

    function approveDeprecation(uint256 packId) external onlyValidator {
        require(packId < packs.length, "Registry: pack tidak ditemukan");
        LanguagePack storage pack = packs[packId];
        require(pack.status == PackStatus.Active, "Registry: hanya pack aktif yang dapat dinonaktifkan");
        require(pack.deprecationProposer != address(0), "Registry: proposal deprecation belum ada");
        require(pack.deprecationProposer != msg.sender, "Registry: butuh validator kedua yang berbeda");
        require(!hasDeprecationApproved(packId, msg.sender), "Registry: persetujuan ganda");

        recordDeprecationApproval(packId, msg.sender);
        pack.deprecationApprovals += 1;

        if (pack.deprecationApprovals >= QUORUM) {
            pack.status = PackStatus.Deprecated;
            if (activePack[pack.regionId] == packId) {
                delete activePack[pack.regionId];
            }
            emit PackDeprecated(packId, pack.regionId);
        }
    }

    // --- Query --------------------------------------------------------------
    function getActivePack(uint8 regionId) external view returns (LanguagePack memory) {
        uint256 packId = activePack[regionId];
        require(packId != 0 && packId < packs.length, "Registry: tidak ada pack aktif");
        return packs[packId];
    }

    function getPack(uint256 packId) external view returns (LanguagePack memory) {
        require(packId < packs.length, "Registry: pack tidak ditemukan");
        return packs[packId];
    }

    // Approvals disimpan sebagai bit flags pada uint256 (max 256 validator).
    mapping(uint256 => uint256) internal packApprovals;
    mapping(uint256 => uint256) internal deprecationApprovals;

    function hasApproved(uint256 packId, address account) internal view returns (bool) {
        uint256 index = _validatorIndex(account);
        return (packApprovals[packId] & (1 << index)) != 0;
    }

    function hasDeprecationApproved(uint256 packId, address account) internal view returns (bool) {
        uint256 index = _validatorIndex(account);
        return (deprecationApprovals[packId] & (1 << index)) != 0;
    }

    function recordApproval(uint256 packId, address account) internal {
        packApprovals[packId] |= (1 << _validatorIndex(account));
    }

    function recordDeprecationApproval(uint256 packId, address account) internal {
        deprecationApprovals[packId] |= (1 << _validatorIndex(account));
    }

    // Indeks deterministik +1 agar bit 0 tidak pernah dipakai (packId 0 + validator 0).
    mapping(address => uint256) internal validatorIndex;
    uint256 internal validatorCount;

    function _validatorIndex(address account) internal view returns (uint256) {
        uint256 index = validatorIndex[account];
        require(index != 0, "Registry: validasi indeks");
        return index - 1;
    }
}