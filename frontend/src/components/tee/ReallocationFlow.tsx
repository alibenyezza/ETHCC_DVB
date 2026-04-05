'use client';

import { MOCK_AGENTS } from '@/lib/mockData';
import { motion } from 'framer-motion';

const CHAIN_COLORS: Record<string, string> = {
  eth: '#627EEA', base: '#0052FF', arb: '#28A0F0', avax: '#E84142', op: '#FF0420',
};

export default function ReallocationFlow() {
  const sorted = [...MOCK_AGENTS].sort((a, b) => b.topYield - a.topYield);
  const totalCapital = MOCK_AGENTS.reduce((s, a) => s + a.currentCapital, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {sorted.map((agent, i) => {
          const color = CHAIN_COLORS[agent.chain.toLowerCase()] || '#888';
          const pct = (agent.currentCapital / totalCapital) * 100;

          return (
            <motion.div
              key={agent.chain}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="flex flex-col items-center p-3 rounded-lg border border-white/10 bg-black/40 min-w-[100px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold text-white">{agent.chain}</span>
              </div>

              <div className="w-full h-1.5 bg-white/10 rounded-full mb-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(5, pct)}%` }}
                  transition={{ delay: i * 0.08 + 0.2, duration: 0.5 }}
                />
              </div>

              <div className="text-center space-y-0.5">
                <p className="text-xs text-white/80 font-medium">${agent.currentCapital.toLocaleString('en-US')}</p>
                <p className="text-xs text-white/50">{pct.toFixed(1)}% of total</p>
                <p className="text-xs font-medium" style={{ color }}>{agent.topYield.toFixed(1)}% yield</p>
                <p className={`text-[10px] ${agent.safety >= 0.7 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                  safety {Math.round(agent.safety * 100)}%
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-white/40 pt-3 border-t border-white/5">
        <span>{MOCK_AGENTS.length} agents reporting</span>
        <span>Total: ${totalCapital.toLocaleString('en-US')}</span>
        <span>Last reallocation: 2h 14m ago</span>
      </div>
    </div>
  );
}
