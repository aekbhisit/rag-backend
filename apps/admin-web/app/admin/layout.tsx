"use client";

import React from "react";
import { DialogProvider } from "../../components/ui/DialogProvider";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useAuth } from "../../components/AuthProvider";
import { BACKEND_URL } from "../../components/config";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { LanguageSwitcher } from "../../components/ui/LanguageSwitcher";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { logout, userEmail, isAuthenticated } = useAuth();
  const { t, mounted: translationMounted } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("admin.sidebarCollapsed");
    if (saved) setSidebarCollapsed(saved === "true");
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin.sidebarCollapsed", String(next));
      return next;
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[color:var(--text-muted)]">
          {translationMounted ? t('loading') : 'Loading...'}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[color:var(--text-muted)]">
          Redirecting to {translationMounted ? t('login') : 'login'}...
        </div>
      </div>
    );
  }

  return (
    <DialogProvider>
    <section className={`grid min-h-screen w-full overflow-x-hidden ${sidebarCollapsed ? 'grid-cols-[72px_1fr]' : 'grid-cols-[240px_1fr]'}`}>
      <aside className="border-r border-[color:var(--border)] bg-[color:var(--surface)] flex flex-col">
        <div className={`flex items-center h-14 gap-2 ${sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4 py-3'} border-b border-[color:var(--border)] relative`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Image src="/theme/logo-sm.png" width={24} height={24} alt="logo" />
              <span className="font-semibold">Admin</span>
            </div>
          )}
          <button aria-label="Toggle sidebar" onClick={toggleSidebar} className={`h-8 w-8 inline-flex items-center justify-center rounded-md text-[color:var(--text)] hover:bg-[color:var(--surface-hover)] p-0 border-0 bg-transparent focus:outline-none ${sidebarCollapsed ? 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}>
            <svg className="h-5 w-5 text-[color:var(--text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <nav className="grid gap-1 p-2">
          {/* Dashboard */}
          <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" /></svg>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </Link>

          {/* Content group */}
          <div className="mt-2">
            <div className={`text-[color:var(--text-muted)] text-xs px-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
              {translationMounted ? t('content') : 'Content'}
            </div>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/contexts">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6a2 2 0 012-2h8m-6 8V7a2 2 0 012-2h4M7 7h.01M7 11h.01M7 15h.01" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('contexts') : 'Contexts'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/categories">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('categories') : 'Categories'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/intent">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V4m0 12v4" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('intentSystem') : 'Intent System'}</span>}
            </Link>
          </div>

          {/* RAG group */}
          <div className="mt-3">
            <div className={`text-[color:var(--text-muted)] text-xs px-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
              {translationMounted ? t('rag') : 'RAG'}
            </div>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/prompts">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 11h8M8 15h5" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('prompts') : 'Prompts'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/requests">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v2h6v-2M9 7h6m-6 4h6M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-3l-2-2H10L8 5H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('ragRequests') : 'RAG Requests'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/api">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('apiDocs') : 'API Docs & Test'}</span>}
            </Link>
          </div>

          {/* AI group */}
          <div className="mt-3">
            <div className={`text-[color:var(--text-muted)] text-xs px-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
              {translationMounted ? t('ai') : 'AI'}
            </div>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/ai-costs">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V4m0 12v4m8-10a8 8 0 11-16 0 8 8 0 0116 0z" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('aiCostSummary') : 'AI Cost Summary'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/ai-usage">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V4m0 12v4" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('aiUsage') : 'AI Usage'}</span>}
            </Link>
            
          </div>

          {/* Main group */}
          <div className="mt-3">
            <div className={`text-[color:var(--text-muted)] text-xs px-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
              {translationMounted ? t('main') : 'Main'}
            </div>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/ai-pricing">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 11h8M8 15h5" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('aiPricing') : 'AI Pricing'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/tenants">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('tenants') : 'Tenants'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/users">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M12 12a5 5 0 100-10 5 5 0 000 10z" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('users') : 'Users'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/audit">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v2h6v-2M9 7h6m-6 4h6M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-3l-2-2H10L8 5H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {!sidebarCollapsed && <span>{translationMounted ? t('auditLog') : 'Audit Log'}</span>}
            </Link>
            <Link prefetch={false} className={`no-underline text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] rounded-md flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2 gap-3'}`} href="/admin/error-logs">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" /></svg>
              {!sidebarCollapsed && <span>Error Logs</span>}
            </Link>
            {/* Settings menu removed; managed per-tenant */}
          </div>
        </nav>
        {/* Move theme toggle to bottom-left of sidebar and hide any duplicate at top */}
        <div className="mt-auto p-2">
          <ThemeToggle className={`h-8 px-3 rounded-md border text-sm ${sidebarCollapsed ? 'w-full flex items-center justify-center' : 'w-full justify-start flex items-center gap-2'}`} />
        </div>
      </aside>
      <div className="flex flex-col min-w-0">
        <header className="h-14 border-b border-[color:var(--border)] flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-[color:var(--text)]">
              {translationMounted ? t('adminPanel') : 'Admin Panel'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Image src="/theme/users/avatar-1.jpg" width={28} height={28} alt="avatar" style={{ borderRadius: 9999 }} />
                <span className="text-sm text-[color:var(--text-muted)]">{userEmail}</span>
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-hover)] rounded-md transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {translationMounted ? t('logout') : 'Logout'}
              </button>
            </div>
          </div>
        </header>
        <div className="p-6 w-full overflow-x-hidden min-w-0">{children}</div>
      </div>
    </section>
    </DialogProvider>
  );
}


