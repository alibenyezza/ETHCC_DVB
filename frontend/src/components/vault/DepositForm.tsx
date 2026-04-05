'use client';

import { useState } from 'react';

export default function DepositForm() {
  const [amount, setAmount] = useState('25000');
  const [depositing, setDepositing] = useState(false);
  const [done, setDone] = useState(false);

  const handleDeposit = () => {
    setDepositing(true);
    setTimeout(() => {
      setDepositing(false);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    }, 2000);
  };

  return (
    <div className="p-6 bg-black/40 backdrop-blur-md rounded-xl border border-gray-800/60 w-full flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-4 text-white/90 uppercase tracking-wider text-sm">Deposit</h3>

      <div className="relative mb-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={depositing}
          className="w-full bg-white/5 border border-gray-700/50 rounded-lg py-4 px-4 text-2xl text-white outline-none focus:border-white/30 transition-colors disabled:opacity-50"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button
            onClick={() => setAmount('42500')}
            className="text-xs font-semibold uppercase text-white/60 hover:text-white transition-colors bg-white/10 px-2 py-1 rounded cursor-pointer"
          >
            Max
          </button>
          <span className="text-sm font-semibold text-white/80 mr-1">USDC</span>
        </div>
      </div>

      <div className="flex justify-between text-sm text-white/50 mb-2 px-1">
        <span>Wallet Balance</span>
        <span className="text-white/80 font-medium">42,500.00 USDC</span>
      </div>
      <div className="flex justify-between text-sm text-white/50 mb-auto px-1 pb-6">
        <span>Already Deposited</span>
        <span className="text-green-400/80 font-medium">312,750.00 USDC</span>
      </div>

      <button
        onClick={handleDeposit}
        disabled={depositing || !amount || Number(amount) <= 0}
        className="w-full py-4 bg-white/90 text-black font-bold uppercase tracking-wider rounded-lg hover:bg-white transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
      >
        {depositing ? 'Approving USDC...' : done ? 'Deposit Confirmed!' : 'Supply Capital'}
      </button>

      {done && (
        <p className="text-green-400 text-xs mt-3 text-center animate-pulse">
          +25,000 USDC deposited into ArcMindVault
        </p>
      )}
    </div>
  );
}
