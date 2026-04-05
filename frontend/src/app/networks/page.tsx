'use client';

import LightRays from '@/components/ui/LightRays';

export default function NetworksPage() {
  return (
    <main className="fixed top-[64px] left-0 w-screen h-[calc(100vh-64px)] z-10 bg-black overflow-hidden">
      {/* LightRays background */}
      <div className="absolute inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1}
          lightSpread={0.5}
          rayLength={3}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0}
          distortion={0}
          pulsating={false}
          fadeDistance={1}
          saturation={1}
        />
      </div>

      {/* Schema iframe — on top of LightRays */}
      <div className="relative z-10 w-full h-full">
        <iframe
          src="/fig-adrian-v2.html"
          className="w-full h-full border-0"
          style={{ background: 'transparent' }}
          title="Protocol Networks Visualization"
          allow="accelerometer; autoplay"
        />
      </div>
    </main>
  );
}
