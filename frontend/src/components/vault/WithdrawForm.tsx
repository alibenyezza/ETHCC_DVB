'use client';

import { useState } from 'react';

export default function WithdrawForm() {
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [done, setDone] = useState(false);

  const handleWithdraw = () => {
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      setDone(true);
      setAmount('');
      setTimeout(() => setDone(false), 3000);
    }, 2000);
  };

  return (
    <div className="p-6 bg-black/40 backdrop-blur-md rounded-xl border border-gray-800/60 w-full flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-4 text-white/90 uppercase tracking-wider text-sm">Withdraw</h3>

      <div className="relative mb-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={withdrawing}
          className="w-full bg-white/5 border border-gray-700/50 rounded-lg py-4 px-4 text-2xl text-white outline-none focus:border-white/30 transition-colors disabled:opacity-50"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button
            onClick={() => setAmount('78100')}
            className="text-xs font-semibold uppercase text-white/60 hover:text-white transition-colors bg-white/10 px-2 py-1 rounded cursor-pointer"
          >
            Max
          </button>
          <span className="text-sm font-semibold text-white/80 mr-1">USDC</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm text-white/50 mb-2 px-1">
        <div className="flex justify-between">
          <span>Your Shares</span>
          <span className="text-white/80 font-medium">85,230.45 arcMIND</span>
        </div>
        <div className="flex justify-between">
          <span>Max Withdraw</span>
          <span className="text-white/80 font-medium">78,100.00 USDC</span>
        </div>
      </div>
      <div className="flex justify-between text-sm text-white/50 mb-auto px-1 pb-6">
        <span>Share Price</span>
        <span className="text-white/60 font-medium">1.032 USDC</span>
      </div>

      <button
        onClick={handleWithdraw}
        disabled={withdrawing || !amount || Number(amount) <= 0}
        className="w-full py-4 bg-transparent border border-white/40 text-white font-bold uppercase tracking-wider rounded-lg hover:bg-white/10 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
      >
        {withdrawing ? 'Processing...' : done ? 'Withdrawal Confirmed!' : 'Withdraw Capital'}
      </button>

      {done && (
        <p className="text-green-400 text-xs mt-3 text-center animate-pulse">
          USDC sent to 0x7a3B...4f2E
        </p>
      )}
    </div>
  );
}
