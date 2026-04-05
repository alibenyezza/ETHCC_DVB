// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentPaymaster
/// @notice Manages USDC micro-payment budgets for AI agents on Arc
contract AgentPaymaster is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public vault;

    mapping(address => uint256) public agentBudgets;
    mapping(address => bool) public isAgent;
    address[] public agents;

    event AgentRegistered(address indexed agent);
    event AgentRemoved(address indexed agent);
    event AgentFunded(address indexed agent, uint256 amount);
    event PaymentMade(address indexed agent, address indexed service, uint256 amount);
    event VaultUpdated(address indexed newVault);

    modifier onlyVaultOrOwner() {
        require(msg.sender == vault || msg.sender == owner(), "AgentPaymaster: unauthorized");
        _;
    }

    modifier onlyAgent() {
        require(isAgent[msg.sender], "AgentPaymaster: not an agent");
        _;
    }

    constructor(address _usdc, address _vault) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        vault = _vault;
    }

    function registerAgent(address agent) external onlyOwner {
        require(!isAgent[agent], "AgentPaymaster: already registered");
        isAgent[agent] = true;
        agents.push(agent);
        emit AgentRegistered(agent);
    }

    function removeAgent(address agent) external onlyOwner {
        require(isAgent[agent], "AgentPaymaster: not an agent");
        isAgent[agent] = false;
        for (uint256 i = 0; i < agents.length; i++) {
            if (agents[i] == agent) {
                agents[i] = agents[agents.length - 1];
                agents.pop();
                break;
            }
        }
        emit AgentRemoved(agent);
    }

    function fundAgent(address agent, uint256 amount) external onlyVaultOrOwner {
        require(isAgent[agent], "AgentPaymaster: not an agent");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        agentBudgets[agent] += amount;
        emit AgentFunded(agent, amount);
    }

    function pay(address service, uint256 amount) external onlyAgent {
        require(agentBudgets[msg.sender] >= amount, "AgentPaymaster: insufficient budget");
        agentBudgets[msg.sender] -= amount;
        usdc.safeTransfer(service, amount);
        emit PaymentMade(msg.sender, service, amount);
    }

    function budgetOf(address agent) external view returns (uint256) {
        return agentBudgets[agent];
    }

    function getAgents() external view returns (address[] memory) {
        return agents;
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
        emit VaultUpdated(_vault);
    }
}
