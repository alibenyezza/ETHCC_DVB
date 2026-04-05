"use client";

export default function NetworksPage() {
  return (
    <main className="fixed top-[64px] left-0 w-screen h-[calc(100vh-64px)] z-10">
      <iframe
        src={`/fig-adrian-v2.html?v=${Date.now()}`}
        className="w-full h-full border-0"
        title="Protocol Networks Visualization"
        allow="accelerometer; autoplay"
      />
    </main>
  );
}
