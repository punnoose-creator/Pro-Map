"use client";

import type { ReactNode } from "react";
import Link from "next/link";

type PortalShellProps = {
  children: ReactNode;
};

export default function PortalShell({ children }: PortalShellProps) {
  return (
    <>
      <div className="bg-grid" aria-hidden />
      <div className="orb orb-1" aria-hidden />
      <div className="orb orb-2" aria-hidden />

      <div className="status-badge">
        <div className="status-dot" />
        <span className="status-text">System Online</span>
      </div>

      <div className="layout">
        <aside className="panel-left">
          <div className="panel-left-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80&auto=format&fit=crop"
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="panel-left-overlay" />
          </div>

          <div className="panel-left-content">
            <span className="access-label">Access Point</span>
            <h1 className="brand-headline" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img src="/logo.png" alt="ProMap Logo" className="brand-logo" />
              <div>PRO<span>MAP</span></div>
            </h1>
            <p className="panel-tagline">
              Log every client visit in under 2 minutes. Voice-first.
              GPS-verified. Zero typing required.
            </p>
            <div className="panel-footer-tag">
              <div className="accent-bar" />
              <span>Personnel Portal</span>
            </div>
            <div className="stats-strip">
              <div className="stat-item">
                <span className="stat-value">&lt;2m</span>
                <span className="stat-label">Per Visit</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">13</span>
                <span className="stat-label">Fields Auto-filled</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">Live</span>
                <span className="stat-label">Sheet Sync</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="panel-right">
          <header className="portal-header">
            <Link href="/dashboard/summary" className="profile-btn" style={{
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: 'rgba(255, 192, 168, 0.1)', 
              border: '1px solid rgba(255, 192, 168, 0.2)',
              padding: '8px 16px', borderRadius: '24px',
              color: '#ffc0a8', fontSize: '12px', fontWeight: 600,
              textDecoration: 'none', transition: 'all 0.2s'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
              <span>Daily Summary</span>
            </Link>
          </header>
          <div className="form-container">{children}</div>
        </main>
      </div>
    </>
  );
}
