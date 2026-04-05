"use client";

import { WalletIcon } from "lucide-react";
import StarBorder from "@/components/ui/StarBorder";

export default function ConnectButtonWrapper() {
  const handleConnect = () => {
    // Demain nous mettrons l'ouverture du Modal Wagmi/Rainbow ici.
    console.log("Connect Wallet cliqué depuis le header !");
  };

  return (
    <button 
      onClick={handleConnect}
      className="flex items-center gap-2 font-semibold text-sm px-5 py-2.5 border border-white/30 rounded-full text-white hover:bg-white/10 transition-all cursor-pointer"
    >
      <WalletIcon size={16} />
      Connect Wallet
    </button>
  );
}
