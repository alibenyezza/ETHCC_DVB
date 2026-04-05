'use client';

import { MOCK_AGENTS, MOCK_VAULT } from '@/lib/mockData';

const CHAIN_COLORS: Record<string, string> = {
  eth: '#627EEA', base: '#0052FF', arb: '#28A0F0', avax: '#E84142', op: '#FF0420',
};

export default function AgentPerformance() {
  const totalCapital = MOCK_AGENTS.reduce((s, a) => s + a.currentCapital, 0);

  return (
    <div className="w-full mb-8">
      <div className="grid grid-cols-5 gap-4 mb-4 text-xs font-semibold text-white uppercase tracking-[0.2em] pb-3 border-b border-white/10">
        <div>Agent</div>
        <div>Capital</div>
        <div>Safety</div>
        <div>Target APY</div>
        <div className="text-right">Status</div>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_AGENTS.map((agent) => {
          const color = CHAIN_COLORS[agent.chain.toLowerCase()] || '#888';
          const safetyPct = Math.round(agent.safety * 100);

          return (
            <div key={agent.chain} className="grid grid-cols-5 gap-4 items-center text-sm font-medium">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="tracking-wide text-white">{agent.chain}</span>
              </div>
              <div className="text-white/80">${agent.currentCapital.toLocaleString('en-US')}</div>
              <div>
                <span className={safetyPct >= 70 ? 'text-green-400' : 'text-red-400'}>{safetyPct}%</span>
              </div>
              <div className="text-white/80">{agent.topYield.toFixed(1)}%</div>
              <div className="text-right">
                <span className="text-green-400 text-xs">Cycle #{agent.cycleCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-white/10 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-white text-xs uppercase tracking-widest">Total Active Capital</span>
          <span className="text-white font-light tracking-wide text-lg">
            ${totalCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/50 text-xs uppercase tracking-widest">Vault Total Assets (on-chain)</span>
          <span className="text-white/80">${MOCK_VAULT.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/50 text-xs uppercase tracking-widest">Arc Buffer (10%)</span>
          <span className="text-white/80">${MOCK_VAULT.localBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}
