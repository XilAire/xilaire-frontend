// File: apps/kpi-dashboard/src/app/components/Sidebar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Gauge, BarChart2, Bot, Headphones, Settings, Bell } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badgeCount?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',    icon: Gauge },
  { label: 'KPIs',        href: '/kpis',         icon: BarChart2 },
  { label: 'Automations', href: '/automations',  icon: Bot },
  { label: 'Support',     href: '/support',      icon: Headphones, badgeCount: 3 },
  { label: 'Settings',    href: '/settings',     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'bg-[#1f4157] text-white flex-shrink-0 flex flex-col transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo & collapse toggle */}
      <div className="flex items-center justify-between p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* PUBLIC assets must be referenced by URL, not imported */}
          <Image
            src="/logo.png"
            alt="XilAire Logo"
            width={32}
            height={32}
            className="rounded"
          />
          {!collapsed && <h1 className="text-2xl font-bold sidebar-heading">XilAire</h1>}
        </Link>

        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((c) => !c)}
          className="text-lg hover:text-gray-300 focus:outline-none"
        >
          {collapsed ? '➕' : '➖'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map(({ label, href, icon: Icon, badgeCount }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'group flex items-center rounded px-3 py-2 transition-colors',
                isActive
                  ? 'bg-white text-[#1f4157] font-semibold'
                  : 'text-white hover:bg-[#1f5670]/80'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="ml-3">{label}</span>
                  {badgeCount != null && (
                    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-red-500 rounded-full">
                      {badgeCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System status link */}
      {!collapsed && (
        <div className="mt-auto border-t border-white/20 p-4">
          <Link
            href="https://status.xilairetechnologies.com"
            target="_blank"
            className="flex items-center text-sm text-white/70 hover:text-white"
          >
            <Bell className="w-4 h-4 mr-2" />
            System Status
          </Link>
        </div>
      )}
    </aside>
  );
}
