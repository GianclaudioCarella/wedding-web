'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const nav = [
  { href: '/admin',              label: 'Dashboard',     icon: IconDashboard },
  { href: '/admin/guests',       label: 'Guests',        icon: IconGuests },
  { href: '/admin/comms',        label: 'Comms',         icon: IconComms },
  { href: '/admin/events',       label: 'Events',        icon: IconCalendar },
  { href: '/admin/accommodation', label: 'Accommodation', icon: IconBed },
  { href: '/admin/transport',    label: 'Transport',     icon: IconCar },
  { href: '/admin/registry',     label: 'Registry',      icon: IconGift },
  { href: '/admin/content',      label: 'Content',       icon: IconDoc },
  { href: '/admin/planning',     label: 'Planning',      icon: IconClipboard },
  { href: '/admin/audit',        label: 'Activity',      icon: IconAudit },
  { href: '/admin/inspiration',  label: 'Inspiration',   icon: IconInspiration },
  { href: '/admin/chat',         label: 'Chat',          icon: IconChat },
  { href: '/admin/metrics',      label: 'Metrics',       icon: IconMetrics },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin-sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setCollapsed(c => {
      localStorage.setItem('admin-sidebar-collapsed', String(!c));
      return !c;
    });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user && pathname !== '/admin/login') {
        router.push('/admin/login');
      } else {
        setChecking(false);
      }
    });
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;
  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
    </div>
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', background: '#f9fafb' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 220,
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: collapsed ? '16px 0' : '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', minHeight: 60 }}>
          {!collapsed && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', margin: 0 }}>Admin</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '2px 0 0' }}>Gian & Cat</p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', display: 'flex', alignItems: 'center', borderRadius: 4, flexShrink: 0 }}
          >
            <IconChevron collapsed={collapsed} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '9px 0' : '9px 12px',
                  margin: '1px 8px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? '#ffffff' : '#4b5563',
                  background: active ? '#111827' : 'transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f3f4f6'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
                  <Icon />
                </span>
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: collapsed ? '12px 0' : '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign out' : undefined}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, borderRadius: 4 }}
          >
            <IconSignOut />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────── */

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconGuests() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13.5c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5" />
      <circle cx="11.5" cy="5" r="2" />
      <path d="M13.5 13.5c0-1.9 1.5-3.5 1.5-3.5" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="12" rx="1.5" />
      <path d="M1 7h14" />
      <path d="M5 1v4M11 1v4" />
    </svg>
  );
}

function IconBed() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12V5" />
      <path d="M1 8.5h14" />
      <path d="M15 12V8.5" />
      <rect x="1" y="5" width="7" height="3.5" rx="1" />
      <path d="M1 12h14" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 9l1.5-4h11L15 9" />
      <rect x="1" y="9" width="14" height="4" rx="1" />
      <circle cx="4" cy="13" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="14" height="9" rx="1" />
      <path d="M1 9h14" />
      <path d="M8 6V15" />
      <path d="M8 6C8 6 6 3 4 4s-1 3 4 2z" />
      <path d="M8 6C8 6 10 3 12 4s1 3-4 2z" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1z" />
      <path d="M9 1v5h5" />
      <path d="M5 9h6M5 12h4" />
    </svg>
  );
}

function IconAudit() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4h14M1 8h9M1 12h6" />
      <circle cx="13" cy="11" r="2.5" />
      <path d="M15 13.5l-1.5-1.5" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="10" height="13" rx="1" />
      <path d="M6 2V1h4v1" />
      <path d="M5 7h6M5 10h4" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 10.5a1 1 0 0 1-1 1H5l-3 3V2.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8z" />
    </svg>
  );
}

function IconInspiration() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
      <path d="M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" />
      <circle cx="8" cy="8" r="3" />
    </svg>
  );
}

function IconMetrics() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12l4-4 3 3 4-5 3 2" />
      <path d="M1 15h14" />
    </svg>
  );
}

function IconComms() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <path d="M1 5l7 5 7-5" />
    </svg>
  );
}

function IconChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M9 3L5 7l4 4" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5" />
      <path d="M9 10l3-3-3-3" />
      <path d="M12 7H5" />
    </svg>
  );
}
