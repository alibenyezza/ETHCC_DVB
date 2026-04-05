'use client';

import { useState } from 'react';

export default function ConnectButtonWrapper() {
  const [connected, setConnected] = useState(false);

  if (!connected) {
    return (
      <button
        onClick={() => setConnected(true)}
        className="flex items-center gap-2 font-semibold text-sm px-5 py-2.5 border border-white/30 rounded-full text-white hover:bg-white/10 transition-all cursor-pointer"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs px-3 py-2 border border-white/20 rounded-full text-white/70">
        Arc Testnet
      </span>
      <span className="flex items-center gap-2 font-semibold text-sm px-4 py-2 border border-white/30 rounded-full text-white">
        0x7a3B...4f2E
      </span>
    </div>
  );
}
