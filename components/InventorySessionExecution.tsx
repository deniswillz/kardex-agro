
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Save, CheckCircle2, User as UserIcon, Calendar, ClipboardCheck, Search, Filter, Hash, MapPin, Package, AlertCircle, AlertTriangle } from 'lucide-react';
import { InventorySession, InventorySessionItem } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface InventorySessionExecutionProps {
  session: InventorySession;
  onBack: () => void;
  onSave: (updatedSession: InventorySession, redirect?: boolean) => void;
}

export const InventorySessionExecution: React.FC<InventorySessionExecutionProps> = ({ session, onBack, onSave }) => {
  // Mantemos estados locais para agilidade de digitação
  const [items, setItems] = useState<InventorySessionItem[]>(session.items);
  const [responsible, setResponsible] = useState(session.responsible);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);

  // CRÍTICO: O status de finalização deve ser lido diretamente da prop 'session'
  // Quando o pai atualiza, este componente re-renderiza com isFinalized como true.
  const isFinalized = session.status === 'FINALIZADO';

  // Sincroniza os itens locais se a sessão mudar no componente pai
  useEffect(() => {
    setItems(session.items);
  }, [session.items]);

  const handleUpdateCount = (itemId: string, val: string) => {
    if (isFinalized) return;
    const numVal = val === '' ? null : Number(val);
    setItems(prevItems => prevItems.map(item =>
      item.id === itemId
        ? {
          ...item,
          countedBalance: numVal,
          status: numVal !== null ? 'CONFERIDO' : 'PENDENTE'
        }
        : item
    ));
  };

  const handleToggleStatus = (itemId: string) => {
    if (isFinalized) return;
    setItems(prevItems => prevItems.map(item =>
      item.id === itemId ? { ...item, status: item.status === 'PENDENTE' ? 'CONFERIDO' : 'PENDENTE' } : item
    ));
  };

  const handleSaveProgress = () => {
    if (isFinalized) return;
    const updatedSession: InventorySession = {
      ...session,
      responsible,
      items
    };
    onSave(updatedSession, true); // true indicates we want to redirect
  };

  const handleFinalize = () => {
    if (isFinalized) return;
    setFinalizeModalOpen(true);
  };

  const confirmFinalize = () => {
    // Criamos o objeto definitivo de fechamento
    const finalizedSession: InventorySession = {
      ...session,
      responsible,
      items,
      status: 'FINALIZADO',
      closedAt: Date.now()
    };

    // Enviamos para o pai. O pai atualizará o estado global.
    // Como isFinalized é derivado de session.status, a UI atualizará automaticamente.
    onSave(finalizedSession);
  };

  const pendingItemsCount = items.filter(i => i.status === 'PENDENTE').length;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPending = !onlyPending || item.status === 'PENDENTE';
      return matchesSearch && matchesPending;
    });
  }, [items, searchTerm, onlyPending]);

  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.round((items.filter(i => i.status === 'CONFERIDO').length / items.length) * 100);
  }, [items]);

  return (
    <div className="flex flex-col h-full animate-fade-in bg-slate-50">
      {/* HEADER DINÂMICO */}
      <header className="bg-white border-b border-slate-200 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">{session.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded border transition-all duration-500 ${isFinalized ? 'bg-slate-900 text-white border-slate-950 shadow-md' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                {isFinalized ? 'STATUS: AUDITORIA FINALIZADA' : 'STATUS: EM ABERTO'}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                <Calendar size={12} />
                Abertura: {new Date(session.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isFinalized ? (
            <>
              <button
                onClick={handleSaveProgress}
                className="hidden md:flex bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest items-center gap-2 hover:bg-slate-50 shadow-sm"
              >
                <Save size={16} /> Salvar Parcial
              </button>
              <button
                onClick={handleFinalize}
                className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <ClipboardCheck size={18} /> Finalizar Auditoria
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 text-emerald-400 px-5 py-2.5 rounded-xl font-black text-xs uppercase border border-slate-950 flex items-center gap-2 shadow-lg">
                <CheckCircle2 size={18} /> Relatório Fechado e Auditado
              </div>
              <button onClick={onBack} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-all">
                <ArrowLeft size={20} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* BUSCA E RESUMO */}
      <div className="p-4 bg-white border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por Código ou Nome..."
            className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => setOnlyPending(!onlyPending)}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${onlyPending ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200'
              }`}
          >
            {onlyPending ? 'Exibindo: Apenas Pendentes' : 'Exibindo: Tudo'}
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">Conclusão:</span>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] font-black text-slate-900">{progress}%</span>
          </div>
        </div>
      </div>

      {/* LISTAGEM PRINCIPAL */}
      <div className="flex-1 overflow-y-auto p-2 md:p-6 no-scrollbar">
        {/* Tabela Desktop */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item / Identificação</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saldo Sist.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Físico (Contagem)</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isDivergent = item.countedBalance !== null && item.countedBalance !== item.systemBalance;
                return (
                  <tr key={item.id} className={`transition-all duration-200 ${isDivergent ? 'bg-amber-50' : item.status === 'CONFERIDO' ? 'bg-emerald-50/20' : 'bg-white'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${isDivergent ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{item.name}</div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="font-mono">{item.code}</span>
                            <span className="text-slate-200">|</span>
                            <MapPin size={10} /> {item.warehouse} - {item.address || 'Geral'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-slate-500">{item.systemBalance}</span>
                      <span className="text-[9px] font-medium text-slate-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="number"
                          value={item.countedBalance === null ? '' : item.countedBalance}
                          onChange={(e) => handleUpdateCount(item.id, e.target.value)}
                          disabled={isFinalized}
                          className={`w-24 text-center p-2 rounded-xl text-sm font-black border transition-all ${isDivergent ? 'border-amber-500 bg-white ring-2 ring-amber-100' :
                            item.status === 'CONFERIDO' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 focus:bg-white'
                            } ${isFinalized ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                        {isDivergent && <span className="text-[8px] font-black text-amber-600 uppercase">Divergência Detectada</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        disabled={isFinalized}
                        className={`p-2 rounded-xl border transition-all ${item.status === 'CONFERIDO' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-300 border-slate-200'
                          } ${isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visualização Mobile */}
        <div className="md:hidden flex flex-col gap-3 pb-24">
          {filteredItems.map((item) => {
            const isDivergent = item.countedBalance !== null && item.countedBalance !== item.systemBalance;
            return (
              <div
                key={item.id}
                className={`bg-white border-2 rounded-xl shadow-sm overflow-hidden transition-all ${isDivergent ? 'border-amber-400 bg-amber-50' :
                  item.status === 'CONFERIDO' ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                  } ${isFinalized ? 'opacity-90' : ''}`}
              >
                <div className="p-4 flex items-center justify-between border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${isDivergent ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      <Package size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{item.name}</h4>
                      <span className="text-[10px] font-mono text-slate-400 tracking-tighter uppercase">{item.code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Sistêmico</p>
                    <span className="text-sm font-black text-slate-600">{item.systemBalance}</span>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 items-end">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Contagem Física</p>
                    <input
                      type="number"
                      placeholder="0"
                      value={item.countedBalance === null ? '' : item.countedBalance}
                      onChange={(e) => handleUpdateCount(item.id, e.target.value)}
                      disabled={isFinalized}
                      className={`w-full p-2.5 rounded-lg text-sm font-black border outline-none ${isDivergent ? 'border-amber-500 bg-white ring-2 ring-amber-100' : 'border-slate-200 bg-slate-50'
                        } ${isFinalized ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <button
                    onClick={() => handleToggleStatus(item.id)}
                    disabled={isFinalized}
                    className={`h-[42px] flex items-center justify-center gap-2 rounded-lg font-black text-[10px] uppercase tracking-widest border transition-all ${item.status === 'CONFERIDO' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-300 border-slate-200'
                      } ${isFinalized ? 'opacity-50' : ''}`}
                  >
                    <CheckCircle2 size={16} /> {item.status === 'CONFERIDO' ? 'CONFERIDO' : 'CONFIRMAR'}
                  </button>
                </div>
                {isDivergent && (
                  <div className="px-4 py-1.5 bg-amber-500 text-white text-[9px] font-black uppercase text-center tracking-widest">
                    Aviso: Divergência de Estoque
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RODAPÉ RESUMO */}
      <footer className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0 z-30">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40"></div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{items.filter(i => i.status === 'CONFERIDO').length} Itens OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/40"></div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{items.filter(i => i.countedBalance !== null && i.countedBalance !== i.systemBalance).length} Divergentes</span>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          {isFinalized ? 'AUDITORIA FINALIZADA E ARQUIVADA' : 'SESSÃO DE AUDITORIA ATIVA'}
        </div>
      </footer>

      {/* Modal de Confirmação de Finalização */}
      <ConfirmationModal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        onConfirm={confirmFinalize}
        title="Finalizar Auditoria"
        message="Confirmar fechamento definitivo desta auditoria? Esta ação não pode ser desfeita."
        confirmText="Finalizar Auditoria"
        cancelText="Cancelar"
        type={pendingItemsCount > 0 ? 'warning' : 'success'}
        pendingCount={pendingItemsCount}
      />
    </div>
  );
};
