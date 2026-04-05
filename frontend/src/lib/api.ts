'use client';

import { useState, useEffect, useCallback } from 'react';

// Agent API base URL — agents run on port 3100
const API_BASE = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:3100';

// ─── Types (matching AgentServer responses) ─────────────────

export interface AgentStatus {
  chain: string;
  running: boolean;
  cycleCount: number;
  currentCapital: number;
  positions: number;
  zgComputeConnected: boolean;
  zgStorageConnected: boolean;
  latestProposal: {
    timestamp: number;
    confidence: number;
    safety: number;
    positions: number;
    optimalCapital: number;
  } | null;
}

export interface StatusResponse {
  agents: AgentStatus[];
  count: number;
  timestamp: number;
}

export interface Position {
  protocol: string;
  pool_id: string;
  action: 'deposit' | 'withdraw' | 'harvest';
  amount_pct: number;
  raw_yield: number;
  post_deposit_yield: number;
  reasoning: string;
}

export interface AgentProposal {
  agent: string;
  timestamp: number;
  strategy: {
    positions: Position[];
    harvest: {
      pending_rewards_usd: number;
      harvest_profitable: boolean;
      optimal_harvest_time: string;
      reasoning: string;
    };
  };
  allocation_curve: Array<{ capital: number; blended_yield: number }>;
  safety: {
    overall_score: number;
    protocol_scores: Record<string, number>;
    alerts: Array<{ type: string; severity: string; message: string; timestamp: number }>;
    chain_health: { sequencer: string; gas_gwei: number; recent_reorgs: number };
  };
  current_capital: number;
  optimal_capital: number;
  min_useful_capital: number;
  confidence: number;
  last_7d_actual_yield: number;
  prediction_accuracy_30d: number;
}

export interface ProposalsResponse {
  proposals: Record<string, AgentProposal>;
  count: number;
  timestamp: number;
}

// ─── Fetch helpers ──────────────────────────────────────────

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Hooks ──────────────────────────────────────────────────

/** Poll GET /status every `interval` ms */
export function useAgentStatus(interval = 5000) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await fetchJSON<StatusResponse>('/status');
    if (result) setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, interval]);

  return { data, loading, refresh };
}

/** Poll GET /proposals every `interval` ms */
export function useProposals(interval = 5000) {
  const [data, setData] = useState<ProposalsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await fetchJSON<ProposalsResponse>('/proposals');
    if (result) setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, interval]);

  return { data, loading, refresh };
}

/** Fetch a single agent's proposal */
export function useAgentProposal(chain: string, interval = 5000) {
  const [data, setData] = useState<AgentProposal | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await fetchJSON<AgentProposal>(`/proposals/${chain.toLowerCase()}`);
    if (result) setData(result);
    setLoading(false);
  }, [chain]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, interval]);

  return { data, loading, refresh };
}
