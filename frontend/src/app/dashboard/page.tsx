'use client';

import DepositForm from '@/components/vault/DepositForm';
import WithdrawForm from '@/components/vault/WithdrawForm';
import AgentCard from '@/components/agents/AgentCard';
import AgentPerformance from '@/components/agents/AgentPerformance';
import ReallocationFlow from '@/components/tee/ReallocationFlow';
import { MOCK_AGENTS } from '@/lib/mockData';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, NetworkIcon } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <>
      <div className="fixed inset-0 w-screen h-screen z-0 pointer-events-none overflow-hidden">
        <video preload="auto" muted playsInline className="w-full h-full object-cover">
          <source src="/assets/video/272517_small.mp4#t=0.1" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/90" />
      </div>

      <main className="fixed top-[64px] left-0 w-full h-[calc(100vh-64px)] overflow-y-auto bg-transparent pt-12 px-4 pb-24 text-white flex flex-col items-center">
        <div className="relative z-10 w-full max-w-7xl flex flex-col gap-20 text-left pb-24">

          <section className="w-full">
            <AgentPerformance />
          </section>

          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-5 flex flex-col lg:-mt-16">
              <h2 className="text-xl font-semibold mb-8 flex items-center border-b border-gray-800/40 pb-4">
                <span className="text-white">Your Position</span>
              </h2>
              <div className="w-full flex justify-center gap-8">
                <DepositForm />
                <WithdrawForm />
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col lg:pl-20 xl:pl-24 lg:mt-8">
              <h2 className="text-xl font-semibold mb-8 text-white border-b border-gray-800/40 pb-4">
                AI Enclave Proposals
                <span className="text-xs text-white/40 ml-3 font-normal">{MOCK_AGENTS.length} agents</span>
              </h2>
              <div className="w-full flex flex-col gap-3">
                {MOCK_AGENTS.map((agent) => (
                  <AgentCard key={agent.chain} agent={agent} />
                ))}
              </div>
            </div>
          </div>

          <section className="w-full">
            <h2 className="text-xl font-semibold mb-8 text-white border-b border-gray-800/40 pb-4">
              TEE Cross-Chain Decisions
            </h2>
            <ReallocationFlow />
          </section>

          <section className="w-full">
            <button
              onClick={() => router.push('/networks')}
              className="w-full group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 hover:border-white/25 transition-all duration-500 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                    <NetworkIcon size={22} className="text-white/60 group-hover:text-white/90 transition-colors" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold text-lg tracking-wide">Network Topology</h3>
                    <p className="text-white/40 text-sm mt-1">View the full cross-chain architecture — Arc, CCTP bridges, TEE enclave, 0G nodes</p>
                  </div>
                </div>
                <ArrowRightIcon size={20} className="text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          </section>

        </div>
      </main>
    </>
  );
}
