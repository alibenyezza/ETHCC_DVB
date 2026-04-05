'use client';

import StaggeredMenu from "@/components/layout/StaggeredMenu";
import SwipeBlocker from "@/components/layout/SwipeBlocker";
import ConnectButtonWrapper from "@/components/wallet/ConnectButtonWrapper";
import { HomeIcon, LayoutDashboardIcon, FileTextIcon, UsersIcon, GlobeIcon } from "lucide-react";

const menuItems = [
  { label: 'Home', link: '/', icon: <HomeIcon size={22} /> },
  { label: 'Dashboard', link: '/dashboard', icon: <LayoutDashboardIcon size={22} /> },
  { label: 'Networks', link: '/networks', icon: <GlobeIcon size={22} /> },
  { label: 'Docs', link: '/#docs', icon: <FileTextIcon size={22} /> },
  { label: 'Meet the Team', link: '/#team', icon: <UsersIcon size={22} /> },
];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SwipeBlocker />
      <StaggeredMenu
        isFixed
        position="right"
        items={menuItems}
        displaySocials={false}
        logoText="ZENITH"
        rightContent={<ConnectButtonWrapper />}
      />
      {children}
    </>
  );
}
