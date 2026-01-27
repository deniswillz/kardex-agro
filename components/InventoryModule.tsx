
import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, Plus, Search, Calendar, User as UserIcon, AlertCircle, Clock, ArrowRight, Trash2, TrendingUp, BarChart } from 'lucide-react';
import { InventorySession, User } from '../types';
import { loadInventorySessions, saveInventorySessions, deleteInventorySession, lockSession, unlockSession } from '../services/storage';
import { importInventoryFromExcel } from '../services/excel';
import { InventorySessionExecution } from './InventorySessionExecution';
import { ConfirmationModal } from './ConfirmationModal';

interface InventoryModuleProps {
  currentUser?: User;
}

type TimeFilter = 7 | 15 | 30 | 90;

export const InventoryModule: React.FC<InventoryModuleProps> = ({ currentUser }) => {
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(30);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Carregamento inicial do Supabase
  useEffect(() => {
    const loadData = async () => {
      const data = await loadInventorySessions();
      setSessions(data);
    };
    loadData();
  }, []);

  const handleCreateSession = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const items = await importInventoryFromExcel(file);
      const newSession: InventorySession = {
        id: crypto.randomUUID(),
        name: `Inv. ${new Date().toLocaleDateString('pt-BR')} - #${sessions.length + 1}`,
        responsible: currentUser?.name || 'Administrador',
        createdAt: Date.now(),
        status: 'ABERTO',
        items
      };

      const updated = [newSession, ...sessions];
      setSessions(updated);
      await saveInventorySessions(updated);
      setActiveSessionId(newSession.id);
    } catch (err) {
      alert("Erro ao processar planilha. Verifique as colunas A, D, E, I, N, O.");
    }
    if (e.target) e.target.value = '';
  };

  const handleDeleteSession = (id: string) => {
    setSessionToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (sessionToDelete) {
      await deleteInventorySession(sessionToDelete);
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
      setSessionToDelete(null);
    }
  };

  const handleSaveSession = async (updatedSession: InventorySession, redirect?: boolean) => {
    const updated = sessions.map(s => s.id === updatedSession.id ? updatedSession : s);
    setSessions(updated);
    await saveInventorySessions(updated);
    if (redirect) {
      handleBackFromSession();
      // Inform the parent (App.tsx) to go to Dashboard
      window.dispatchEvent(new CustomEvent('navigate-to-dashboard'));
    }
  };

  const filteredSessions = sessions.filter(s => {
    const cutoff = Date.now() - (timeFilter * 24 * 60 * 60 * 1000);
    const matchesDate = s.createdAt >= cutoff;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.responsible.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleOpenSession = async (session: InventorySession) => {
    if (session.status === 'FINALIZADO') {
      setActiveSessionId(session.id);
      return;
    }

    const lockResult = await lockSession(session.id, currentUser?.name || 'Usuário');
    if (lockResult.success) {
      setActiveSessionId(session.id);
    } else {
      alert(`Esta sessão está sendo editada por: ${lockResult.lockedBy || 'outro usuário'}`);
    }
  };

  const handleBackFromSession = async () => {
    if (activeSessionId) {
      await unlockSession(activeSessionId);
    }
    setActiveSessionId(null);
  };

  if (activeSessionId && activeSession) {
    return (
      <InventorySessionExecution
        session={activeSession}
        onBack={handleBackFromSession}
        onSave={handleSaveSession}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary-50 text-primary-600 p-3 rounded-xl">
            <ClipboardList size={24} />
          </div>
          <div className="relative flex-1 min-w-[200px] md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar sessões..."
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[7, 15, 30, 90].map((v) => (
              <button key={v} onClick={() => setTimeFilter(v as TimeFilter)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${timeFilter === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{v}D</button>
            ))}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none bg-primary-600 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-700 active:scale-95 transition-all"
          >
            <Plus size={18} /> Novo Inventário
          </button>
          <input type="file" ref={fileInputRef} onChange={handleCreateSession} accept=".xlsx, .xls" className="hidden" />
        </div>
      </div>

      {/* Tabela de Sessões */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessão / Auditoria</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Criador</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conferente</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Abertura</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Fechamento</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredSessions.map((session) => (
              <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${session.status === 'ABERTO' ? 'bg-primary-50 text-primary-600' : 'bg-slate-800 text-white'}`}>
                      <BarChart size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{session.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{session.items.length} ITENS</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                    <UserIcon size={14} className="text-primary-400" />
                    {session.responsible}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                    {session.conferente ? (
                      <>
                        <UserIcon size={14} className="text-emerald-400" />
                        {session.conferente}
                      </>
                    ) : (
                      <span className="text-slate-300 italic">Pendente</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <Calendar size={14} className="text-slate-300" />
                    {new Date(session.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    {session.closedAt ? (
                      <>
                        <Calendar size={14} className="text-emerald-400" />
                        {new Date(session.closedAt).toLocaleDateString('pt-BR')}
                      </>
                    ) : (
                      <span className="text-slate-300 italic">--</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border w-fit ${session.status === 'ABERTO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-slate-800 text-white border-slate-900'
                      }`}>
                      {session.status === 'ABERTO' ? 'Em Aberto' : 'Finalizado'}
                    </span>
                    {session.status === 'ABERTO' && session.lockedBy && (
                      <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase animate-pulse">
                        <Lock size={8} /> Em edição por: {session.lockedBy}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenSession(session)}
                      className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-md shadow-primary-500/10"
                    >
                      <ArrowRight size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards para Mobile */}
      <div className="md:hidden flex flex-col gap-4">
        {filteredSessions.map((session) => (
          <div key={session.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm active:bg-slate-50 transition-all">
            <div className="p-4 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${session.status === 'ABERTO' ? 'bg-primary-50 text-primary-600 border-primary-100' : 'bg-slate-800 text-white border-slate-900'
                  }`}>
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{session.name}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{session.items.length} ITENS</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${session.status === 'ABERTO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-slate-800 text-white border-slate-900'
                  }`}>
                  {session.status === 'ABERTO' ? 'ABERTO' : 'FECHADO'}
                </span>
                {session.status === 'ABERTO' && session.lockedBy && (
                  <span className="text-[7px] font-black text-amber-500 uppercase animate-pulse flex items-center gap-0.5">
                    <Lock size={7} /> Editando: {session.lockedBy}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50/50 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Responsável</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-primary-700 uppercase">
                    <UserIcon size={12} className="text-primary-400" />
                    {session.responsible}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Abertura</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                    <Calendar size={12} className="text-slate-400" />
                    {new Date(session.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenSession(session)}
                  className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
                >
                  <ArrowRight size={14} /> Acessar Auditoria
                </button>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="w-12 h-10 bg-white border border-slate-200 text-red-500 rounded-xl flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="p-20 text-center text-slate-400">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-10" />
          <p className="text-sm font-black uppercase tracking-widest italic">Nenhuma sessão ativa.</p>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSessionToDelete(null);
        }}
        onConfirm={confirmDeleteSession}
        title="Excluir Inventário"
        message="Deseja realmente excluir esta sessão de inventário? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};
