'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ShieldCheckIcon, ShieldAlertIcon } from 'lucide-react';

const CHAIN_COLORS: Record<string, string> = {
  eth: '#627EEA', base: '#0052FF', arb: '#28A0F0', avax: '#E84142', op: '#FF0420',
};

interface Position {
  protocol: string;
  action: 'deposit' | 'withdraw' | 'harvest';
  amount_pct: number;
  raw_yield: number;
  post_deposit_yield: number;
  reasoning: string;
}

interface AgentData {
  chain: string;
  currentCapital: number;
  safety: number;
  confidence: number;
  topYield: number;
  optimalCapital: number;
  last7dYield: number;
  accuracy: number;
  strategy: Position[];
  harvest: { pending_rewards_usd: number; harvest_profitable: boolean; optimal_harvest_time: string };
  curve: Array<{ capital: number; blended_yield: number }>;
}

export default function AgentCard({ agent }: { agent: AgentData }) {
  const [expanded, setExpanded] = useState(false);
  const color = CHAIN_COLORS[agent.chain.toLowerCase()] || '#888';
  const safetyPct = Math.round(agent.safety * 100);
  const isSafe = agent.safety >= 0.7;

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-black/30 backdrop-blur-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-white tracking-wide">{agent.chain}</span>
          <span className="text-xs text-white/40">{agent.strategy.length} positions</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {isSafe ? <ShieldCheckIcon size={14} className="text-green-400" /> : <ShieldAlertIcon size={14} className="text-red-400" />}
            <span className={`text-xs font-medium ${isSafe ? 'text-green-400' : 'text-red-400'}`}>{safetyPct}%</span>
          </div>
          <span className="text-xs text-white/60">conf. {Math.round(agent.confidence * 100)}%</span>
          <span className="text-xs text-white/80 font-medium">${agent.currentCapital.toLocaleString('en-US')}</span>
          {expanded ? <ChevronUpIcon size={14} className="text-white/40" /> : <ChevronDownIcon size={14} className="text-white/40" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Positions</p>
            <div className="space-y-2">
              {agent.strategy.map((pos, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${pos.action === 'deposit' ? 'bg-green-500/20 text-green-400' : pos.action === 'withdraw' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {pos.action}
                    </span>
                    <span className="text-white/80">{pos.protocol}</span>
                    <span className="text-white/40">{pos.amount_pct}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/50">raw {pos.raw_yield.toFixed(1)}%</span>
                    <span className="text-white/80 font-medium">post {pos.post_deposit_yield.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Yield Curve</p>
            <div className="flex gap-3 overflow-x-auto">
              {agent.curve.map((pt, i) => (
                <div key={i} className="flex flex-col items-center text-xs shrink-0">
                  <span className="text-white/80 font-medium">{pt.blended_yield.toFixed(1)}%</span>
                  <div className="w-8 rounded-full mt-1" style={{ height: `${Math.max(8, pt.blended_yield * 8)}px`, backgroundColor: `${color}40` }} />
                  <span className="text-white/40 mt-1">${(pt.capital / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          </div>

          {agent.harvest.harvest_profitable && (
            <div className="text-xs text-yellow-400/80">
              Pending rewards: ${agent.harvest.pending_rewards_usd.toFixed(0)} — harvest {agent.harvest.optimal_harvest_time}
            </div>
          )}

          <div className="flex gap-4 text-xs text-white/40 pt-1 border-t border-white/5">
            <span>7d yield: {agent.last7dYield.toFixed(1)}%</span>
            <span>accuracy: {Math.round(agent.accuracy * 100)}%</span>
            <span>optimal: ${agent.optimalCapital.toLocaleString('en-US')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
