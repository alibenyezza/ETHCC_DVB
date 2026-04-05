"use client";

import DepositForm from "../../components/vault/DepositForm";
import WithdrawForm from "../../components/vault/WithdrawForm";
import AgentCard from "../../components/agents/AgentCard";
import AgentPerformance from "../../components/agents/AgentPerformance";
import ReallocationFlow from "../../components/tee/ReallocationFlow";
import StarBorder from "@/components/ui/StarBorder";

export default function DashboardPage() {
  return (
    <main className="relative min-h-screen bg-transparent w-full pt-24 px-4 pb-24 text-white flex flex-col items-center">
      {/* Video Background */}
      <div className="fixed inset-0 w-[100vw] h-[100vh] z-0 pointer-events-none overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/assets/video/272517_small.mp4" type="video/mp4" />
        </video>
        {/* Un overlay noir plus transparent pour bien voir la vidéo */}
        <div className="absolute inset-0 bg-black/70" />
      </div>

      <div className="relative z-10 w-full max-w-7xl flex flex-col items-center mb-16 text-center">
         <p className="text-sm uppercase tracking-[0.2em] text-white/50 mb-3">Interface</p>
         <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Dashboard</h1>
      </div>

      <div className="relative z-10 w-full max-w-7xl flex flex-col gap-20 text-left pb-24">
        
        {/* TOP SECTION: Global PnL Overview */}
        <section className="w-full">
          <AgentPerformance />
        </section>

        {/* MIDDLE SECTION: Interaction & Agent Live Feeds */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left: User Interaction */}
          <div className="lg:col-span-5 flex flex-col lg:-mt-16">
            <h2 className="text-xl font-semibold mb-8 flex items-center border-b border-gray-800/40 pb-4">
              <span className="text-white/80">Your Position</span>
            </h2>
            <div className="w-full flex justify-center gap-8">
              <DepositForm />
              <WithdrawForm />
            </div>
          </div>

          {/* Right: AI Agent Proposals */}
          <div className="lg:col-span-7 flex flex-col lg:pl-20 xl:pl-24 lg:mt-8">
            <h2 className="text-xl font-semibold mb-8 text-white/80 border-b border-gray-800/40 pb-4">AI Enclave Proposals</h2>
            <div className="w-full flex flex-col gap-6">
              <AgentCard />
              <AgentCard />
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: TEE Flowchart Full Width */}
        <section className="w-full">
          <h2 className="text-xl font-semibold mb-8 text-warning-400 border-b border-gray-800/40 pb-4">TEE Cross-Chain Decisions</h2>
          <div className="w-full">
            <ReallocationFlow />
          </div>
        </section>

      </div>
    </main>
  );
}
