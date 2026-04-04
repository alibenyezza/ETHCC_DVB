// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentPaymaster} from "../src/nanopay/AgentPaymaster.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract AgentPaymasterTest is Test {
    AgentPaymaster public paymaster;
    MockUSDC public usdc;

    address public owner = address(this);
    address public vaultAddr = makeAddr("vault");
    address public agent1 = makeAddr("agent1");
    address public agent2 = makeAddr("agent2");
    address public service = makeAddr("service");

    function setUp() public {
        usdc = new MockUSDC();
        paymaster = new AgentPaymaster(address(usdc), vaultAddr);

        usdc.mint(owner, 10_000e6);
        usdc.mint(vaultAddr, 10_000e6);
        usdc.approve(address(paymaster), type(uint256).max);

        vm.prank(vaultAddr);
        usdc.approve(address(paymaster), type(uint256).max);
    }

    function test_registerAgent() public {
        paymaster.registerAgent(agent1);
        assertTrue(paymaster.isAgent(agent1));

        address[] memory agents = paymaster.getAgents();
        assertEq(agents.length, 1);
        assertEq(agents[0], agent1);
    }

    function test_registerAgent_onlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        paymaster.registerAgent(agent1);
    }

    function test_fundAgent() public {
        paymaster.registerAgent(agent1);
        paymaster.fundAgent(agent1, 100e6);

        assertEq(paymaster.budgetOf(agent1), 100e6);
        assertEq(usdc.balanceOf(address(paymaster)), 100e6);
    }

    function test_fundAgent_fromVault() public {
        paymaster.registerAgent(agent1);

        vm.prank(vaultAddr);
        paymaster.fundAgent(agent1, 100e6);

        assertEq(paymaster.budgetOf(agent1), 100e6);
    }

    function test_pay() public {
        paymaster.registerAgent(agent1);
        paymaster.fundAgent(agent1, 100e6);

        vm.prank(agent1);
        paymaster.pay(service, 30e6);

        assertEq(paymaster.budgetOf(agent1), 70e6);
        assertEq(usdc.balanceOf(service), 30e6);
    }

    function test_pay_insufficientBudget() public {
        paymaster.registerAgent(agent1);
        paymaster.fundAgent(agent1, 10e6);

        vm.prank(agent1);
        vm.expectRevert("AgentPaymaster: insufficient budget");
        paymaster.pay(service, 20e6);
    }

    function test_pay_notAgent() public {
        vm.prank(agent2);
        vm.expectRevert("AgentPaymaster: not an agent");
        paymaster.pay(service, 10e6);
    }

    function test_removeAgent() public {
        paymaster.registerAgent(agent1);
        paymaster.registerAgent(agent2);

        paymaster.removeAgent(agent1);
        assertFalse(paymaster.isAgent(agent1));

        address[] memory agents = paymaster.getAgents();
        assertEq(agents.length, 1);
        assertEq(agents[0], agent2);
    }
}
