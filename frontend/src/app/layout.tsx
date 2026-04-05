import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import StaggeredMenu from "@/components/layout/StaggeredMenu";
import ConnectButtonWrapper from "@/components/wallet/ConnectButtonWrapper";
import { HomeIcon, LayoutDashboardIcon, FileTextIcon, UsersIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "ZENITH Orchestrator",
  description: "Chainlink CRE TEE Delegated Yield Reallocator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const menuItems = [
    {
      label: 'Home',
      link: '/',
      icon: <HomeIcon size={22} />,
    },
    {
      label: 'Dashboard',
      link: '/dashboard',
      icon: <LayoutDashboardIcon size={22} />,
    },
    {
      label: 'Docs',
      link: '/#docs',
      icon: <FileTextIcon size={22} />,
    },
    {
      label: 'Meet the Team',
      link: '/#team',
      icon: <UsersIcon size={22} />,
    },
  ];

  return (
    <html lang="en">
      <body className="antialiased">
        <StaggeredMenu
          isFixed
          position="right"
          items={menuItems}
          displaySocials={false}
          logoText="ZENITH"
          rightContent={<ConnectButtonWrapper />}
        />
        {children}
      </body>
    </html>
  );
}
