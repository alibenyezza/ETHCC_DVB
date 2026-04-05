import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import LayoutShell from "@/components/layout/LayoutShell";

export const metadata: Metadata = {
  title: "ArcMind — Autonomous DeFi",
  description: "Chainlink CRE TEE Delegated Yield Reallocator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <LayoutShell>
            {children}
          </LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
