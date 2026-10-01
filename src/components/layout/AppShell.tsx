'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandFooter } from '@/components/brand/BrandFooter';
import { AskGoldFieldsDrawer } from '@/components/assistant/AskGoldFieldsDrawer';
import { SearchDialog } from '@/components/search/SearchDialog';
import { ReportPackDrawer } from '@/components/reports/ReportPackDrawer';
import { ContentRepository } from '@/lib/adapters/ContentRepository';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isClientSite = pathname?.startsWith('/sites') || pathname?.startsWith('/preview');
  const isResultsPublication = pathname?.startsWith('/results');

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState<string | undefined>();
  const [assistantContext, setAssistantContext] = useState<string | undefined>();

  const [searchOpen, setSearchOpen] = useState(false);
  const [reportPackOpen, setReportPackOpen] = useState(false);

  // Global event listeners for contextual opening
  useEffect(() => {
    if (isAdmin || isClientSite || isResultsPublication) return;

    const handleOpenAssistant = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string; context?: string }>;
      setAssistantPrompt(customEvent.detail?.prompt);
      setAssistantContext(customEvent.detail?.context);
      setAssistantOpen(true);
    };

    const handleOpenPack = () => {
      setReportPackOpen(true);
    };

    window.addEventListener('open-assistant', handleOpenAssistant);
    window.addEventListener('open-report-pack', handleOpenPack);

    return () => {
      window.removeEventListener('open-assistant', handleOpenAssistant);
      window.removeEventListener('open-report-pack', handleOpenPack);
    };
  }, [isAdmin, isClientSite, isResultsPublication]);

  const openAssistant = (prompt?: string, context?: string) => {
    setAssistantPrompt(prompt);
    setAssistantContext(context);
    setAssistantOpen(true);
  };

  if (isAdmin || isClientSite || isResultsPublication) {
    return <>{children}</>;
  }

  const allReports = ContentRepository.getReports();

  return (
    <div className="min-h-screen flex flex-col bg-editorial text-ink selection:bg-gold-light selection:text-navy">
      {/* WCAG 2.2 AA Skip link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Global Brand Header */}
      <BrandHeader
        onOpenAssistant={() => openAssistant()}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 pt-26 sm:pt-28 lg:pt-32">
        {children}
      </main>

      {/* Global Brand Footer */}
      <BrandFooter />

      {/* Ask Gold Fields Assistant Drawer */}
      <AskGoldFieldsDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        initialPrompt={assistantPrompt}
        initialContext={assistantContext}
      />

      {/* Quick Search Dialog */}
      <SearchDialog
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* My Report Pack Drawer */}
      <ReportPackDrawer
        isOpen={reportPackOpen}
        onClose={() => setReportPackOpen(false)}
        allReports={allReports}
      />
    </div>
  );
};
