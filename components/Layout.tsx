
import React, { useState } from 'react';
import { User, AppState } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LayoutProps {
  children: React.ReactNode;
  currentSection: string;
  onSectionChange: (section: any) => void;
  user: User | null;
  isGuest: boolean;
  onLogout: () => void;
  data?: AppState;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentSection, onSectionChange, user, isGuest, onLogout, data }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const criticalNotas = data?.notas.filter(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(new Date(), parseISO(n.data)) >= 3) || [];
  const criticalOrdens = data?.ordens.filter(o => o.status === 'Em Separação' && differenceInDays(new Date(), parseISO(o.data)) >= 3) || [];

  const criticalItems = [
    ...criticalNotas.map(n => ({ id: n.id, numero: n.numero, tipo: 'Nota Fiscal', status: n.status, d: n.data, section: 'notas' as const })),
    ...criticalOrdens.map(o => ({ id: o.id, numero: o.numero, tipo: 'Ordem', status: o.status, d: o.data, section: 'ordens' as const }))
  ];

  const criticalCount = criticalItems.length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'notas', label: 'Notas Fiscais', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'ordens', label: 'Ordem', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  if (!isGuest) navItems.push({ id: 'comentarios', label: 'Apontamentos', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' });

  if (!isGuest) {
    navItems.push({ id: 'admin', label: 'Configuração', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' });
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {/* Header */}
      <header className="h-16 bg-[#006B47] flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 text-white shadow-lg">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSectionChange('dashboard')}>
            <img
              src="/nano-logo.png"
              alt="Nano Pro"
              className="h-8 sm:h-10 object-contain filter brightness-0 invert"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2.5 sm:p-3 rounded-xl transition-all relative ${showNotifications ? 'bg-white/20' : 'hover:bg-white/10'}`}
              title="Notificações"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {criticalCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#006B47] animate-pulse">{criticalCount}</span>}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 text-gray-900 z-[100] overflow-hidden animate-scaleIn">
                <div className="p-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#006B47]">Central Nano</span>
                    <h4 className="text-base font-bold text-gray-900">Alertas Ativos</h4>
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="max-h-[30rem] overflow-y-auto">
                  {criticalItems.length > 0 ? (
                    criticalItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => { onSectionChange(item.section); setShowNotifications(false); }}
                        className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-all flex items-start gap-4"
                      >
                        <div className="w-10 h-10 shrink-0 bg-red-100 text-red-500 rounded-xl flex items-center justify-center text-sm font-bold">!</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-semibold text-gray-900">#{item.numero} - {item.tipo}</p>
                            <p className="text-[10px] text-gray-400">{format(parseISO(item.d), 'dd/MM')}</p>
                          </div>
                          <p className="text-[10px] font-bold text-red-500 uppercase mt-1">{item.status}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-xs text-gray-400">Nenhum alerta crítico</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 border-l border-white/20 hidden sm:block"></div>

          {/* User Info */}
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70">Usuário Nano</p>
              <p className="text-xs font-bold">{isGuest ? 'Visitante' : user?.name || 'Sistema'}</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
          </div>

          {/* Logout */}
          <button onClick={onLogout} className="p-2.5 hover:bg-red-500/80 rounded-xl transition-all" title="Sair">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-[55] lg:hidden" onClick={() => setSidebarOpen(false)}></div>
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-[60] w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header - Diário de Bordo */}
            <div className="p-4">
              <div className="flex flex-col items-center text-center bg-gradient-to-br from-[#006B47] to-[#004d33] text-white text-lg font-bold tracking-[3px] leading-[1.4] py-5 px-4 rounded-2xl shadow-[0_4px_15px_rgba(0,107,71,0.3)]">
                <span>DIÁRIO DE</span>
                <span>BORDO</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSectionChange(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentSection === item.id
                    ? 'bg-[#006B47] text-white shadow-lg'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                  <span className="font-semibold text-[11px] uppercase tracking-wider">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-10">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
