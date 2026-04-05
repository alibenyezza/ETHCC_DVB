"use client";

import FeaturesSection from "@/components/landing/FeaturesSection";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { useEffect, useRef } from "react";

export default function Home() {
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (hasNavigated.current) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        hasNavigated.current = true;
        router.push('/dashboard');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [router]);

  return (
    <main className="relative min-h-screen bg-transparent">
      {/* Video Background - Fixed to cover full viewport continuously */}
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
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }} />
      </div>

      {/* 🚀 HERO SECTION (1st Scroll Page) */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center min-h-screen px-4 pt-16 pb-16">
        <h1 
          className="text-white font-extrabold leading-tight mb-6"
          style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', letterSpacing: '-2px' }}
        >
          ZENITH
        </h1>
        
        <p 
          className="text-gray-300 max-w-[580px] mb-10 leading-relaxed font-medium"
          style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'rgba(255,255,255,0.7)' }}
        >
          One autonomous AI agent per chain. A Chainlink TEE fuses all proposals. 
          Dynamic capital reallocation via CCTP. Settlement on Arc. Compute on 0G. Privacy by design.
        </p>

        <button 
          onClick={() => router.push('/dashboard')} 
          className="flex items-center gap-2 font-semibold text-base py-3 px-8 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all duration-300 backdrop-blur-sm mt-4 text-white"
        >
          <span>Launch App</span>
          <ArrowRightIcon size={18} />
        </button>
      </div>

      {/* THE OPPORTUNITY (Transition Banner) */}
      <section
        className="relative z-10 flex items-center justify-center text-center py-24 px-8"
        style={{
          marginTop: '-4rem',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.4) 30%, rgba(0, 0, 0, 0.75) 60%, rgba(0, 0, 0, 0.95) 100%)',
        }}
      >
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50 mb-4">
            The Current Paradigm
          </p>
          <div className="font-light text-white leading-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
            One Brain.
            <br />
            One Algorithm.
          </div>
          <p className="mt-6 text-lg text-white/60 max-w-[600px] mx-auto">
            Every yield optimizer today follows the same architecture. A single point of failure with total on-chain transparency. ZENITH changes everything.
          </p>
        </div>
      </section>

      {/* FEATURES SECTION (Scrollable) */}
      <div className="relative z-10 bg-black w-full text-left">
        <FeaturesSection />
      </div>

      {/* SCROLL-TO-DASHBOARD TRIGGER */}
      <div className="relative z-10 flex flex-col items-center justify-center py-32 bg-black">
        <p className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4 animate-pulse">Scroll to enter</p>
        <span className="text-white/20 text-2xl animate-bounce">↓</span>
      </div>

    </main>
  );
}
