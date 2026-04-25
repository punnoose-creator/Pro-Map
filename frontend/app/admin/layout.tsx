"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("promap_token");
    const userStr = localStorage.getItem("promap_user");

    if (!token || !userStr) {
      router.replace("/");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== "admin" && user.role !== "manager") {
        router.replace("/dashboard");
        return;
      }
      setIsAdmin(true);
    } catch (e) {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="admin-container">
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />
      
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="admin-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="ProMap Logo" className="brand-logo" style={{ height: '28px' }} />
            <div>PRO<span>MAP</span> ADMIN</div>
          </div>
        </div>
        
        <nav className="admin-nav">
          <Link href="/admin" className={`admin-nav-link ${pathname === '/admin' ? 'active' : ''}`}>
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </Link>
          <Link href="/dashboard" className="admin-nav-link">
            <span className="material-symbols-outlined">person</span>
            User View
          </Link>
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={() => {
            localStorage.removeItem("promap_token");
            localStorage.removeItem("promap_user");
            router.push("/");
          }} className="admin-logout-btn">
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open Menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="admin-breadcrumb">
              {pathname === '/admin' ? 'Overview' : 'Tracking Employee'}
            </div>
          </div>
          <div className="admin-user-pill">
            Admin Mode
          </div>
        </header>
        <div className="admin-content">
          {children}
        </div>
      </main>

      <style jsx>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          background: #0a0a0a;
          color: #e5e2e1;
        }

        .admin-sidebar {
          width: 260px;
          background: #131313;
          border-right: 1px solid rgba(255, 192, 168, 0.1);
          display: flex;
          flex-direction: column;
          padding: 32px 20px;
          position: fixed;
          height: 100vh;
        }

        .admin-logo {
          font-family: var(--font-headline);
          font-weight: 900;
          font-size: 20px;
          letter-spacing: -0.02em;
          margin-bottom: 48px;
        }

        .admin-logo span {
          color: var(--secondary);
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .admin-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          color: #99907c;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .admin-nav-link:hover, .admin-nav-link.active {
          background: rgba(255, 192, 168, 0.08);
          color: #ffc0a8;
        }

        .admin-nav-link .material-symbols-outlined {
          font-size: 20px;
        }

        .admin-sidebar-footer {
          padding-top: 20px;
          border-top: 1px solid rgba(255, 192, 168, 0.05);
        }

        .admin-logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          background: none;
          border: none;
          color: #99907c;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          padding: 12px 16px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .admin-logout-btn:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #f87171;
        }

        .admin-main {
          flex: 1;
          margin-left: 260px;
          display: flex;
          flex-direction: column;
        }

        .admin-header {
          height: 72px;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(19, 19, 19, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 192, 168, 0.05);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .admin-breadcrumb {
          font-size: 14px;
          font-weight: 600;
          color: #99907c;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .admin-user-pill {
          padding: 6px 12px;
          background: rgba(255, 192, 168, 0.1);
          border: 1px solid rgba(255, 192, 168, 0.2);
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          color: #ffc0a8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .admin-content {
          padding: 40px;
          flex: 1;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #99907c;
          cursor: pointer;
          padding: 8px;
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 95;
        }

        @media (max-width: 900px) {
          .admin-sidebar {
            width: 280px;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            z-index: 100;
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
          .sidebar-overlay.active {
            display: block;
          }
          .admin-main {
            margin-left: 0;
          }
          .mobile-menu-btn {
            display: block;
          }
          .admin-header {
            padding: 0 20px;
          }
          .admin-content {
            padding: 24px 20px;
          }
          .admin-breadcrumb {
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .admin-user-pill {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
