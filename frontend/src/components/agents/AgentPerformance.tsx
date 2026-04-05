import React from 'react';

const AgentPerformance = () => {
  const performanceData = [
    {
      chain: 'Base',
      allocation: '40,000 USDC',
      apy: '6.1%',
      pnl: '+$2,450.20',
      status: 'success'
    },
    {
      chain: 'Arbitrum',
      allocation: '30,000 USDC',
      apy: '5.3%',
      pnl: '+$1,590.80',
      status: 'success'
    },
    {
      chain: 'Ethereum',
      allocation: '15,000 USDC',
      apy: '3.2%',
      pnl: '+$480.00',
      status: 'warning'
    },
    {
      chain: 'Polygon',
      allocation: '0 USDC',
      apy: '1.5%',
      pnl: '-$12.50',
      status: 'danger'
    }
  ];

  return (
    <div className="w-full mb-8">
      <div className="grid grid-cols-4 gap-4 mb-4 text-xs font-semibold text-white uppercase tracking-[0.2em] pb-3 border-b border-white/10">
        <div>Agent</div>
        <div>Allocation</div>
        <div>Target APY</div>
        <div className="text-right">Net PnL</div>
      </div>
      
      <div className="flex flex-col gap-4">
        {performanceData.map((data, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-4 items-center text-sm font-medium">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span className="tracking-wide text-white">{data.chain}</span>
            </div>
            <div className="text-white">{data.allocation}</div>
            <div className="text-white">{data.apy}</div>
            <div className={`text-right tracking-wider ${data.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
              {data.pnl}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-4 flex justify-between items-center">
        <span className="text-white text-xs uppercase tracking-widest">Total Active Capital</span>
        <span className="text-white font-light tracking-wide text-lg">85,000.00 USDC</span>
      </div>
    </div>
  );
};

export default AgentPerformance;
