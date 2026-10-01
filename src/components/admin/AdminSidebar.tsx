'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from './AdminAuthProvider';
import { useStudioWorkspace } from './StudioWorkspaceProvider';
import { useDashboardCustomizer } from './DashboardCustomizerProvider';
import { BastionLogo } from './BastionLogo';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Palette,
  Layers,
  Edit3,
  FileText,
  Send,
  BarChart3,
  Activity,
  Settings,
  Compass,
  FileSpreadsheet,
  Table,
  Newspaper,
  Leaf,
  ExternalLink,
  Building,
  Check,
  CreditCard,
  Terminal,
  UserPlus,
  Bot,
  ArrowRightLeft,
  Globe2,
  SlidersHorizontal,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarCheck,
  ShieldAlert,
  Key
} from 'lucide-react';

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAdminAuth();
  const { primaryColor, accentColor } = useDashboardCustomizer();
  const {
    clients,
    activeClient,
    activeSite,
    portalViewMode,
    setPortalViewMode
  } = useStudioWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Initialize and persist collapsed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bastion_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      } else if (window.location.pathname.startsWith('/admin/editor')) {
        // Auto-collapse on visual editor by default for maximum workspace canvas
        setIsCollapsed(true);
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  // Listen to keyboard shortcut (Cmd+B / Ctrl+B) and external events
  useEffect(() => {
    const handleToggle = () => {
      setIsCollapsed(prev => {
        const next = !prev;
        try { localStorage.setItem('bastion_sidebar_collapsed', String(next)); } catch {}
        return next;
      });
    };

    const handleSet = (e: any) => {
      const next = Boolean(e.detail?.collapsed);
      setIsCollapsed(next);
      try { localStorage.setItem('bastion_sidebar_collapsed', String(next)); } catch {}
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggle();
      }
    };

    window.addEventListener('toggle-admin-sidebar', handleToggle);
    window.addEventListener('set-admin-sidebar-collapsed', handleSet as any);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('toggle-admin-sidebar', handleToggle);
      window.removeEventListener('set-admin-sidebar-collapsed', handleSet as any);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try { localStorage.setItem('bastion_sidebar_collapsed', String(next)); } catch {}
  };

  const isClientPortal = portalViewMode === 'client';
  const isGoldFields = activeClient?.id === 'client_goldfields';

  const siteUrl = isGoldFields
    ? '/'
    : activeSite
      ? `/sites/${activeSite.slug}`
      : '/';

  const getNavItemProps = (isActive: boolean) => ({
    style: isActive ? {
      background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
      borderColor: primaryColor,
      boxShadow: `0 4px 14px ${primaryColor}35`
    } : undefined,
    className: `flex items-center justify-between px-3 py-2 rounded-xl text-xs tracking-[-0.01em] transition relative cursor-pointer ${
      isActive
        ? 'text-white border shadow-md font-semibold'
        : 'text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border border-transparent'
    }`
  });

  // Reusable Nav Item renderer for both collapsed and expanded states
  const renderItem = (
    href: string,
    label: string,
    Icon: any,
    isActive: boolean,
    badge?: string,
    badgeClass?: string,
    isExternal = false
  ) => {
    if (isCollapsed) {
      const iconButton = (
        <div
          title={`${label}${badge ? ` [${badge}]` : ''}`}
          className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition relative cursor-pointer group ${
            isActive
              ? 'text-white border shadow-md font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border border-transparent'
          }`}
          style={isActive ? {
            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            borderColor: primaryColor,
            boxShadow: `0 4px 14px ${primaryColor}35`
          } : undefined}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {badge && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-white dark:ring-[#0A0D14]" />
          )}
        </div>
      );

      return isExternal ? (
        <a key={href} href={href} target="_blank" rel="noopener noreferrer">
          {iconButton}
        </a>
      ) : (
        <Link key={href} href={href}>
          {iconButton}
        </Link>
      );
    }

    // Expanded view
    const expandedButton = (
      <div {...getNavItemProps(isActive)}>
        <div className="flex items-center space-x-2.5 truncate">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        {badge && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badgeClass || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {badge}
          </span>
        )}
      </div>
    );

    return isExternal ? (
      <a key={href} href={href} target="_blank" rel="noopener noreferrer">
        {expandedButton}
      </a>
    ) : (
      <Link key={href} href={href}>
        {expandedButton}
      </Link>
    );
  };

  const resultsSection = (
    <div>
      {!isCollapsed && (
        <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Results
        </div>
      )}
      <div className="space-y-1">
        {renderItem(
          '/admin/results',
          'PDF to HTML',
          Table,
          pathname.startsWith('/admin/results'),
          'New',
          'bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200'
        )}
      </div>
    </div>
  );

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-white dark:bg-[#0A0D14] border-r border-slate-200/90 dark:border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 z-20 overflow-x-hidden transition-all duration-300 ease-in-out`}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Header */}
        <div className={`p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center flex-col gap-2.5' : 'justify-between'}`}>
          {isCollapsed ? (
            <>
              <Link href="/admin" title="Bastion Platform" className="shrink-0">
                <BastionLogo variant="monogram" size="sm" />
              </Link>
              <button
                type="button"
                onClick={toggleCollapse}
                title="Expand Sidebar (⌘B)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/admin" className="flex items-center space-x-2.5 min-w-0">
                {isClientPortal ? (
                  <>
                    <div 
                      style={{
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                        borderColor: `${primaryColor}35`
                      }}
                      className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                    >
                      {activeClient?.name ? activeClient.name.substring(0, 2).toUpperCase() : 'CC'}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-tight flex items-center space-x-1.5 truncate">
                        <span className="truncate">{activeClient?.name || 'Client Workspace'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Corporate CMS &bull; Bastion
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <BastionLogo 
                      size="sm"
                      showCmsBadge={false} 
                      showGroupBadge={false}
                      className="text-slate-900 dark:text-white"
                    />
                    <span 
                      style={{
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                        borderColor: `${primaryColor}30`
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border shrink-0"
                    >
                      AGENCY
                    </span>
                  </div>
                )}
              </Link>

              <div className="flex items-center space-x-1 shrink-0">
                <Link
                  href={siteUrl}
                  target="_blank"
                  title="Open Live Website"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Collapse Sidebar (⌘B)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Primary Navigation Sections */}
        <div className={`flex-1 ${isCollapsed ? 'p-2 space-y-3' : 'p-3 space-y-4'} overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800`}>
          {isClientPortal ? (
            /* CLIENT CMS WORKSPACE NAVIGATION */
            <>
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: accentColor }}>
                    <span>{activeClient?.name || 'Website'} Content</span>
                    <span 
                      style={{
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                        borderColor: `${primaryColor}30`
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase border"
                    >
                      Live
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  {renderItem('/admin', 'Executive Overview', LayoutDashboard, pathname === '/admin')}
                  {renderItem('/admin/pages', 'Pages & Navigation', FileText, pathname === '/admin/pages')}
                  {isGoldFields ? (
                    <>
                      {renderItem('/admin/operations', 'Mining Operations', Compass, pathname.startsWith('/admin/operations'), '10', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200')}
                      {renderItem('/admin/reports', 'Financial Results', FileSpreadsheet, pathname.startsWith('/admin/reports'), '11', 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200')}
                      {renderItem('/admin/news', 'SENS Releases', Newspaper, pathname.startsWith('/admin/news'), 'SENS', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200')}
                      {renderItem('/admin/sustainability', '2030 ESG Targets', Leaf, pathname.startsWith('/admin/sustainability'), 'ESG', 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200')}
                    </>
                  ) : (
                    renderItem('/admin/news', 'News & Articles', Newspaper, pathname.startsWith('/admin/news'))
                  )}
                </div>
              </div>

              {isCollapsed ? <div className="my-2 border-t border-slate-200/80 dark:border-slate-800/80 mx-2" /> : null}

              {resultsSection}

              {isCollapsed ? <div className="my-2 border-t border-slate-200/80 dark:border-slate-800/80 mx-2" /> : null}

              {/* Authoring & Media Tools */}
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Authoring &amp; Assets
                  </div>
                )}
                <div className="space-y-1">
                  {renderItem('/admin/editor', 'Visual Page Editor', Edit3, pathname.startsWith('/admin/editor'), 'Studio', 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200')}
                  {renderItem('/admin/analytics', 'Audience & Analytics', BarChart3, pathname.startsWith('/admin/analytics'))}
                  {renderItem('/admin/api-keys', 'AI API Keys', Key, pathname.startsWith('/admin/api-keys'), 'AI', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200')}
                  {renderItem('/admin/media', 'Media Library', FolderOpen, pathname.startsWith('/admin/media'))}
                </div>
              </div>

              {isCollapsed ? <div className="my-2 border-t border-slate-200/80 dark:border-slate-800/80 mx-2" /> : null}

              {/* Publishing & Governance */}
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Governance &amp; Releases
                  </div>
                )}
                <div className="space-y-1">
                  {renderItem('/admin/releases', 'Content Releases', CalendarCheck, pathname.startsWith('/admin/releases'), 'Drops', 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800')}
                  {renderItem('/admin/tasks', 'Approvals & Sign-Off', Send, pathname.startsWith('/admin/tasks'), 'Queue', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200')}
                  {renderItem('/admin/users', 'Authorized Editors', Users, pathname.startsWith('/admin/users'))}
                </div>
              </div>
            </>
          ) : (
            /* BASTION AGENCY WORKSPACE NAVIGATION */
            <>
              {/* Agency Operations */}
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Agency Operations
                  </div>
                )}
                <div className="space-y-1">
                  {renderItem('/admin', 'Overview', LayoutDashboard, pathname === '/admin')}
                  {renderItem('/admin/clients', 'Clients & Websites', Users, pathname.startsWith('/admin/clients'), String(clients.length))}
                  {renderItem('/admin/onboard', 'Onboard Client', UserPlus, pathname.startsWith('/admin/onboard'), 'Wizard', 'bg-blue-100 dark:bg-sky-950 text-bastion-blue dark:text-sky-300 border border-blue-200 dark:border-sky-800')}
                  {renderItem('/admin/billing', 'Commercial & Billing', CreditCard, pathname.startsWith('/admin/billing'))}
                </div>
              </div>

              {isCollapsed ? <div className="my-2 border-t border-slate-200/80 dark:border-slate-800/80 mx-2" /> : null}

              {resultsSection}

              {isCollapsed ? <div className="my-2 border-t border-slate-200/80 dark:border-slate-800/80 mx-2" /> : null}

              {/* Design & Systems */}
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Design &amp; Systems
                  </div>
                )}
                <div className="space-y-1">
                  {renderItem('/admin/brand', 'Brand DNA & Kits', Palette, pathname.startsWith('/admin/brand'), 'DNA', 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800')}
                  {renderItem('/admin/editor', 'Visual Page Editor', Edit3, pathname.startsWith('/admin/editor'), 'Zones', 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800')}
                  {renderItem('/admin/create', 'Canvas Site Builder', Sparkles, pathname.startsWith('/admin/create'))}
                  {renderItem('/admin/blueprints', 'Blueprints & Templates', Layers, pathname.startsWith('/admin/blueprints'))}
                  {renderItem('/admin/design-system', 'Tokens & Tokens CSS', SlidersHorizontal, pathname.startsWith('/admin/design-system'))}
                </div>
              </div>

              {isCollapsed ? <div className="my-2 border-t border-slate-200/80 dark:border-slate-800/80 mx-2" /> : null}

              {/* Governance & Access */}
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Governance &amp; Releases
                  </div>
                )}
                <div className="space-y-1">
                  {renderItem('/admin/releases', 'Content Releases', CalendarCheck, pathname.startsWith('/admin/releases'), 'Drops', 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800')}
                  {renderItem('/admin/tasks', 'Reviews & Publishing', Send, pathname.startsWith('/admin/tasks'), '2', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200')}
                  {renderItem('/admin/users', 'Team & Access Control', UserPlus, pathname.startsWith('/admin/users'))}
                </div>
              </div>

              {isCollapsed ? <div className="my-2 border-t border-slate-200/80 dark:border-slate-800/80 mx-2" /> : null}

              {/* Intelligence & Infrastructure */}
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Intelligence &amp; Infrastructure
                  </div>
                )}
                <div className="space-y-1">
                  {renderItem('/admin/incidents', 'Incidents & SRE Audit', ShieldAlert, pathname.startsWith('/admin/incidents'), 'SRE', 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200')}
                  {renderItem('/admin/health', 'Website Health', Activity, pathname.startsWith('/admin/health'), '100%', 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200')}
                  {renderItem('/admin/api-keys', 'AI API Keys', Key, pathname.startsWith('/admin/api-keys'), 'NEW', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200')}
                  {renderItem('/admin/analytics', 'Analytics', BarChart3, pathname.startsWith('/admin/analytics'))}
                  {renderItem('/admin/sandbox', 'API Sandbox', Terminal, pathname.startsWith('/admin/sandbox'), 'Live', 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200')}
                  {renderItem('/api/mcp', 'MCP Server Hub', Bot, false, 'MCP', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200', true)}
                  {renderItem('/admin/settings', 'Headless & Webhooks', Settings, pathname.startsWith('/admin/settings'))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* View Switcher Footer */}
        {isCollapsed ? (
          <div className="p-2 border-t border-slate-200/80 dark:border-slate-800/80 flex justify-center">
            <button
              type="button"
              onClick={() => setPortalViewMode(portalViewMode === 'client' ? 'agency' : 'client')}
              title={portalViewMode === 'client' ? 'Switch to Agency View' : 'Switch to Client View'}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#070B10]">
            <button
              type="button"
              onClick={() => setPortalViewMode(portalViewMode === 'client' ? 'agency' : 'client')}
              title={portalViewMode === 'client' ? 'Switch to Bastion Agency Studio' : 'Launch Client Experience Sandbox'}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                portalViewMode === 'client'
                  ? 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border-amber-300 dark:border-amber-800/50 text-amber-900 dark:text-amber-300'
                  : 'bg-white dark:bg-[#141C2A] hover:bg-slate-50 dark:hover:bg-[#1A2536] border-slate-200 dark:border-[#232F42] text-slate-700 dark:text-slate-300 shadow-2xs'
              }`}
            >
              <span className="flex items-center space-x-2 truncate">
                <span 
                  style={{ backgroundColor: portalViewMode === 'client' ? '#F59E0B' : primaryColor }}
                  className={`w-2 h-2 rounded-full ${portalViewMode === 'client' ? 'animate-pulse' : ''}`} 
                />
                <span className="truncate">
                  {portalViewMode === 'client' ? 'Exit to Agency Studio' : 'Client Experience Sandbox'}
                </span>
              </span>
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>
          </div>
        )}

        {/* Footer Collapse Toggle Control */}
        <div className="p-2 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-[#06090F]">
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapse}
              title="Expand Sidebar (⌘B)"
              className="w-full h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              className="w-full h-8 flex items-center justify-between px-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[11px] font-medium cursor-pointer"
            >
              <span className="flex items-center space-x-2">
                <PanelLeftClose className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">⌘B</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
