// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ArcMindVault} from "../src/vault/ArcMindVault.sol";
import {CCTPBridge} from "../src/cctp/CCTPBridge.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockCCTPBridge} from "./mocks/MockCCTPBridge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ArcMindVaultTest is Test {
    ArcMindVault public vault;
    MockUSDC public usdc;
    MockCCTPBridge public mockBridge;

    address public owner = address(this);
    address public tee = makeAddr("tee");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 constant INITIAL_BALANCE = 10_000e6; // 10,000 USDC (6 dec)
    uint32 constant BASE_DOMAIN = 6;
    uint32 constant ARB_DOMAIN = 3;

    function setUp() public {
        usdc = new MockUSDC();
        mockBridge = new MockCCTPBridge(address(usdc));

        vault = new ArcMindVault(
            IERC20(address(usdc)),
            tee,
            address(mockBridge)
        );

        // Give users some USDC
        usdc.mint(alice, INITIAL_BALANCE);
        usdc.mint(bob, INITIAL_BALANCE);

        // Approve vault
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    // =========================================================================
    // Deposit / Withdraw
    // =========================================================================

    function test_deposit_mintsShares() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1000e6, alice);

        // First deposit: 1:1 ratio
        assertEq(shares, 1000e6);
        assertEq(vault.balanceOf(alice), 1000e6);
        assertEq(vault.totalAssets(), 1000e6);
    }

    function test_deposit_multipleUsers() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(bob);
        vault.deposit(2000e6, bob);

        assertEq(vault.totalAssets(), 3000e6);
        assertEq(vault.balanceOf(alice), 1000e6);
        assertEq(vault.balanceOf(bob), 2000e6);
    }

    function test_withdraw_burnsShares() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(alice);
        vault.withdraw(500e6, alice, alice);

        assertEq(vault.balanceOf(alice), 500e6);
        assertEq(usdc.balanceOf(alice), INITIAL_BALANCE - 500e6);
    }

    function test_redeem_works() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(alice);
        uint256 assets = vault.redeem(1000e6, alice, alice);

        assertEq(assets, 1000e6);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(usdc.balanceOf(alice), INITIAL_BALANCE);
    }

    // =========================================================================
    // totalAssets with remote capital
    // =========================================================================

    function test_totalAssets_includesRemote() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        // TEE allocates 500 to Base
        vm.prank(tee);
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 500e6);

        // Total should still be 1000 (500 local + 500 remote)
        assertEq(vault.totalAssets(), 1000e6);
        assertEq(vault.chainAllocations(BASE_DOMAIN), 500e6);
    }

    // =========================================================================
    // allocateToChain
    // =========================================================================

    function test_allocateToChain_updatesAccounting() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(tee);
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 500e6);

        assertEq(vault.chainAllocations(BASE_DOMAIN), 500e6);
        assertTrue(vault.isDomainSupported(BASE_DOMAIN));
    }

    function test_allocateToChain_onlyTEE() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(alice);
        vm.expectRevert("ArcMindVault: caller is not TEE");
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 500e6);
    }

    function test_allocateToChain_bufferEnforced() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        // Try to allocate 910 (would leave only 90 = 9% < 10% buffer)
        vm.prank(tee);
        vm.expectRevert("ArcMindVault: buffer violation");
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 910e6);
    }

    function test_allocateToChain_bufferEdgeCase() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        // Allocate exactly 900 (leaves 100 = exactly 10%)
        vm.prank(tee);
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 900e6);

        assertEq(vault.chainAllocations(BASE_DOMAIN), 900e6);
    }

    function test_allocateToChain_multipleChains() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(tee);
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 400e6);

        vm.prank(tee);
        vault.allocateToChain(ARB_DOMAIN, bytes32(uint256(uint160(alice))), 400e6);

        assertEq(vault.chainAllocations(BASE_DOMAIN), 400e6);
        assertEq(vault.chainAllocations(ARB_DOMAIN), 400e6);
        assertEq(vault.totalAssets(), 1000e6);

        uint32[] memory domains = vault.getSupportedDomains();
        assertEq(domains.length, 2);
    }

    // =========================================================================
    // recallFromChain
    // =========================================================================

    function test_recallFromChain_updatesAccounting() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(tee);
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 500e6);

        vm.prank(tee);
        vault.recallFromChain(BASE_DOMAIN, 200e6);

        assertEq(vault.chainAllocations(BASE_DOMAIN), 300e6);
    }

    function test_recallFromChain_cannotExceedAllocation() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(tee);
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 500e6);

        vm.prank(tee);
        vm.expectRevert("ArcMindVault: insufficient allocation");
        vault.recallFromChain(BASE_DOMAIN, 600e6);
    }

    // =========================================================================
    // Share price with yield
    // =========================================================================

    function test_sharePrice_increasesWithYield() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        // Simulate yield: send extra USDC directly to vault
        usdc.mint(address(vault), 100e6);

        // Now total assets = 1100, but shares = 1000
        assertEq(vault.totalAssets(), 1100e6);

        // Share price should be > 1:1
        uint256 assetsPerShare = vault.convertToAssets(1e6);
        assertGt(assetsPerShare, 1e6);
    }

    // =========================================================================
    // Admin
    // =========================================================================

    function test_setTEE_onlyOwner() public {
        address newTEE = makeAddr("newTEE");

        vm.prank(alice);
        vm.expectRevert();
        vault.setTEE(newTEE);

        // Owner can set
        vault.setTEE(newTEE);
        assertEq(vault.tee(), newTEE);
    }

    function test_removeSupportedDomain() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vault.addSupportedDomain(BASE_DOMAIN);
        assertTrue(vault.isDomainSupported(BASE_DOMAIN));

        vault.removeSupportedDomain(BASE_DOMAIN);
        assertFalse(vault.isDomainSupported(BASE_DOMAIN));
    }

    function test_removeSupportedDomain_failsWithActiveAllocation() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(tee);
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 500e6);

        vm.expectRevert("ArcMindVault: domain has active allocation");
        vault.removeSupportedDomain(BASE_DOMAIN);
    }

    // =========================================================================
    // View functions
    // =========================================================================

    function test_getRemoteCapital() public {
        vm.prank(alice);
        vault.deposit(1000e6, alice);

        vm.prank(tee);
        vault.allocateToChain(BASE_DOMAIN, bytes32(uint256(uint160(alice))), 400e6);

        assertEq(vault.getRemoteCapital(), 400e6);
        assertEq(vault.getLocalBalance(), 600e6);
    }
}
