'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  Gauge,
  BarChart2,
  Bot,
  Headphones,
  Settings,
  Bell,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge },
  { label: 'KPIs', href: '/kpis', icon: BarChart2 },
  { label: 'Automations', href: '/automations', icon: Bot },
  { label: 'Support', href: '/support', icon: Headphones },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'bg-[#1f4157] text-white p-4 min-h-screen transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo & Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="XilAire Logo"
            width={32}
            height={32}
            className="rounded"
          />
          {!collapsed && (
            <h1 className="text-2xl font-bold sidebar-heading">XilAire</h1>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-sm hover:text-gray-300"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '➕' : '➖'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center px-3 py-2 rounded transition-colors',
              pathname === href
                ? 'bg-white text-[#1f4157] font-semibold'
                : 'hover:bg-[#1f5670]/80'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 mr-3" />
            {!collapsed && <span>{label}</span>}
            {label === 'Support' && !collapsed && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                3
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Notifications */}
      {!collapsed && (
        <div className="mt-10 border-t border-white/20 pt-4">
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
