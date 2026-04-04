// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CCTPBridge} from "../cctp/CCTPBridge.sol";
import {ITokenMessengerV2} from "../interfaces/ITokenMessenger.sol";

/// @title ArcMindVault
/// @notice ERC-4626 vault on Arc. Users deposit USDC, receive arcMIND shares.
///         Only TEE can allocate/recall capital cross-chain via CCTP.
/// @dev USDC on Arc has 6 decimals (verified on-chain). arcMIND also 6 decimals.
contract ArcMindVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public tee;
    CCTPBridge public cctpBridge;

    uint256 public constant BUFFER_BPS = 1000; // 10%
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Capital allocated to each chain, tracked by CCTP domain ID
    mapping(uint32 => uint256) public chainAllocations;

    /// @notice List of active domain IDs
    uint32[] public supportedDomains;
    mapping(uint32 => bool) public isDomainSupported;

    // --- Events ---
    event AllocatedToChain(uint32 indexed domain, uint256 amount);
    event RecalledFromChain(uint32 indexed domain, uint256 amount);
    event TEEUpdated(address indexed newTEE);
    event CCTPBridgeUpdated(address indexed newBridge);
    event DomainAdded(uint32 indexed domain);
    event DomainRemoved(uint32 indexed domain);

    // --- Modifiers ---
    modifier onlyTEE() {
        require(msg.sender == tee, "ArcMindVault: caller is not TEE");
        _;
    }

    constructor(
        IERC20 _usdc,
        address _tee,
        address _cctpBridge
    )
        ERC4626(_usdc)
        ERC20("ArcMind Vault", "arcMIND")
        Ownable(msg.sender)
    {
        tee = _tee;
        cctpBridge = CCTPBridge(_cctpBridge);
        // Pre-approve TokenMessenger for max USDC (Arc precompile needs separate TX approve)
        IERC20(_usdc).approve(address(CCTPBridge(_cctpBridge).tokenMessenger()), type(uint256).max);
    }

    // =========================================================================
    // ERC-4626 Override
    // =========================================================================

    /// @notice Total assets = local USDC + capital deployed on all chains
    function totalAssets() public view override returns (uint256) {
        uint256 localBalance = IERC20(asset()).balanceOf(address(this));
        uint256 remoteTotal = 0;
        for (uint256 i = 0; i < supportedDomains.length; i++) {
            remoteTotal += chainAllocations[supportedDomains[i]];
        }
        return localBalance + remoteTotal;
    }

    // =========================================================================
    // TEE-Only Functions
    // =========================================================================

    /// @notice Allocate capital to a remote chain via CCTP
    /// @param destinationDomain CCTP domain ID of destination
    /// @param recipient Recipient address on destination chain (bytes32)
    /// @param amount Amount of USDC to send
    function allocateToChain(
        uint32 destinationDomain,
        bytes32 recipient,
        uint256 amount
    ) external onlyTEE nonReentrant {
        uint256 localBalance = IERC20(asset()).balanceOf(address(this));
        require(amount <= localBalance, "ArcMindVault: insufficient local balance");

        // Buffer check: after allocation, local must be >= 10% of total
        // totalAssets() stays constant because we move from local to chainAllocations
        uint256 localAfter = localBalance - amount;
        uint256 total = totalAssets();
        require(
            localAfter * BPS_DENOMINATOR >= total * BUFFER_BPS,
            "ArcMindVault: buffer violation"
        );

        // Update accounting
        chainAllocations[destinationDomain] += amount;
        _addDomainIfNew(destinationDomain);

        // Transfer USDC to TEE — TEE handles CCTP depositForBurn as EOA
        // (Arc USDC precompile blocklist rejects depositForBurn from contracts)
        IERC20(asset()).safeTransfer(tee, amount);

        emit AllocatedToChain(destinationDomain, amount);
    }

    /// @notice Record that capital is being recalled from a remote chain
    /// @dev Only updates accounting. Actual USDC arrives via CCTP separately.
    function recallFromChain(uint32 sourceDomain, uint256 amount) external onlyTEE {
        require(
            chainAllocations[sourceDomain] >= amount,
            "ArcMindVault: insufficient allocation"
        );
        chainAllocations[sourceDomain] -= amount;
        emit RecalledFromChain(sourceDomain, amount);
    }

    // =========================================================================
    // Admin Functions
    // =========================================================================

    function setTEE(address _tee) external onlyOwner {
        tee = _tee;
        emit TEEUpdated(_tee);
    }

    function setCCTPBridge(address _cctpBridge) external onlyOwner {
        cctpBridge = CCTPBridge(_cctpBridge);
        emit CCTPBridgeUpdated(_cctpBridge);
    }

    function addSupportedDomain(uint32 domain) external onlyOwner {
        _addDomainIfNew(domain);
    }

    function removeSupportedDomain(uint32 domain) external onlyOwner {
        require(isDomainSupported[domain], "ArcMindVault: domain not supported");
        require(chainAllocations[domain] == 0, "ArcMindVault: domain has active allocation");

        isDomainSupported[domain] = false;
        for (uint256 i = 0; i < supportedDomains.length; i++) {
            if (supportedDomains[i] == domain) {
                supportedDomains[i] = supportedDomains[supportedDomains.length - 1];
                supportedDomains.pop();
                break;
            }
        }
        emit DomainRemoved(domain);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    function getSupportedDomains() external view returns (uint32[] memory) {
        return supportedDomains;
    }

    function getRemoteCapital() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < supportedDomains.length; i++) {
            total += chainAllocations[supportedDomains[i]];
        }
        return total;
    }

    function getLocalBalance() external view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    // =========================================================================
    // Internal
    // =========================================================================

    function _addDomainIfNew(uint32 domain) internal {
        if (!isDomainSupported[domain]) {
            isDomainSupported[domain] = true;
            supportedDomains.push(domain);
            emit DomainAdded(domain);
        }
    }
}
