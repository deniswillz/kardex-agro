
import React, { useState, useMemo } from 'react';
import { UserRole } from '../types';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ListManagerProps<T> {
  title: string;
  items: T[];
  role: UserRole;
  type: 'nota' | 'comentario';
  onSave: (item: Partial<T>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const ListManager = <T extends { id: string, data: string, numero?: string, status?: string, tipo?: string, texto?: string, observacao?: string, fornecedor?: string, documento?: string, conferente?: string }>({
  title, items, role, type, onSave, onDelete, onRefresh
}: ListManagerProps<T>) => {
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState<'all' | '1' | '7' | '30'>('all');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<Partial<T> | null>(null);

  const canEdit = role === 'admin' || role === 'editor';

  const openNewForm = () => {
    setEditing({
      data: format(new Date(), 'yyyy-MM-dd'),
      status: type === 'nota' ? 'Pendente' : ''
    } as any);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: T) => {
    setEditing(item);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e?: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    if (!editing) return;

    if (type === 'nota' && (!editing.numero || !editing.fornecedor)) {
      setErrorMessage("Número da Nota e Fornecedor são obrigatórios.");
      return;
    }

    // Duplicate Check
    if (!force && !editing.id) {
      const isDuplicate = items.some(item => {
        if (type === 'nota') {
          return item.numero === editing.numero;
        }
        return false;
      });
      if (isDuplicate) {
        setDuplicateWarning(editing);
        return;
      }
    }

    setLoading(true);
    try {
      await onSave(editing);
      setEditing(null);
      setDuplicateWarning(null);
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro no salvamento.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDuplicateSave = () => {
    if (duplicateWarning) {
      handleSave(undefined, true);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm) return;
    setLoading(true);
    try {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
      onRefresh();
    } catch (e: any) {
      setErrorMessage("Erro ao remover.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Classificada': return 'bg-emerald-600 text-white shadow-sm';
      case 'Pendente': return 'bg-red-600 text-white shadow-sm';
      case 'Em Conferência': return 'bg-blue-600 text-white shadow-sm';
      case 'Pré Nota': return 'bg-purple-600 text-white shadow-sm';
      default: return 'bg-gray-600 text-white shadow-sm';
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        (item.numero?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.texto?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.documento?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.conferente?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.data.includes(searchTerm));

      if (dayFilter === 'all') return matchesSearch;

      const itemDate = parseISO(item.data);
      const cutoff = subDays(new Date(), parseInt(dayFilter));
      return matchesSearch && isAfter(itemDate, cutoff);
    });
  }, [items, searchTerm, dayFilter]);

  const supplierSuggestions = useMemo(() => {
    if (type !== 'nota') return [];
    const suppliers = items.map(i => i.fornecedor).filter(Boolean) as string[];
    return Array.from(new Set(suppliers)).sort();
  }, [items, type]);

  return (
    <div className="pb-24 relative animate-fadeIn">
      {canEdit && (
        <button onClick={openNewForm} className="fixed bottom-10 right-10 z-[150] w-16 h-16 bg-[#005c3e] text-white rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all flex items-center justify-center border-4 border-emerald-950">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-gray-400 max-h-[90vh] flex flex-col animate-scaleIn">
            <form onSubmit={handleSave} className="flex flex-col h-full">
              <div className="p-10 bg-gray-50 border-b-4 border-gray-200 flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic border-l-[10px] border-emerald-600 pl-6">
                  {editing?.id ? 'Editar' : 'Nova'} {type === 'nota' ? 'Nota Fiscal' : title}
                </h3>
                <button type="button" onClick={() => setIsFormOpen(false)} className="p-3 hover:bg-gray-200 rounded-full transition-all text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-8 max-h-[60vh]">
                {errorMessage && <div className="p-5 bg-red-50 text-red-600 rounded-2xl border-2 border-red-200 font-black text-[10px] uppercase tracking-widest">{errorMessage}</div>}

                {/* FORMULÁRIO: NOTA FISCAL */}
                {type === 'nota' && (
                  <div className="space-y-8">
                    {/* Linha 1: Data e Nota (Compacto) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Data</label>
                        <input type="date" value={editing?.data || ''} onChange={e => setEditing({ ...editing, data: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl outline-none font-bold focus:border-[#005c3e] transition-all" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Número da Nota</label>
                        <input type="text" placeholder="Ex: NF-12345" value={editing?.numero || ''} onChange={e => setEditing({ ...editing, numero: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl outline-none font-bold focus:border-[#005c3e] transition-all italic shadow-inner" required />
                      </div>
                    </div>
                    {/* Linha 2: Fornecedor (Full Width) */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Fornecedor</label>
                      <input
                        type="text"
                        placeholder="Nome completo do fornecedor"
                        list="suppliers-list"
                        value={editing?.fornecedor || ''}
                        onChange={e => setEditing({ ...editing, fornecedor: e.target.value } as any)}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl outline-none font-bold focus:border-[#005c3e] transition-all shadow-inner"
                        required
                      />
                      <datalist id="suppliers-list">
                        {supplierSuggestions.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    {/* Linha 3: Conferente e Status (Compacto) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Conferente</label>
                        <input type="text" placeholder="Nome do conferente responsável" value={editing?.conferente || ''} onChange={e => setEditing({ ...editing, conferente: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl outline-none font-bold focus:border-[#005c3e] transition-all shadow-inner" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Status</label>
                        <select value={editing?.status || 'Pendente'} onChange={e => setEditing({ ...editing, status: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl outline-none font-bold focus:border-[#005c3e] transition-all shadow-inner">
                          <option value="Pendente">Pendente</option>
                          <option value="Em Conferência">Em Conferência</option>
                          <option value="Pré Nota">Pré Nota</option>
                          <option value="Classificada">Classificada</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Tipo</label>
                        <select value={editing?.tipo || ''} onChange={e => setEditing({ ...editing, tipo: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl outline-none font-bold focus:border-[#005c3e] transition-all shadow-inner">
                          <option value="">Selecione...</option>
                          <option value="Nacional">Nacional</option>
                          <option value="Importado">Importado</option>
                          <option value="Retorno">Retorno</option>
                          <option value="Devolução">Devolução</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}


                {/* CAMPO COMENTÁRIO COMUM */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Comentário</label>
                  <textarea value={type === 'comentario' ? (editing?.texto || '') : (editing?.observacao || '')} onChange={e => setEditing({ ...editing, [type === 'comentario' ? 'texto' : 'observacao']: e.target.value } as any)} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl outline-none min-h-[120px] font-medium resize-none focus:border-[#005c3e] transition-all shadow-inner" required />
                </div>
              </div>

              <div className="p-10 border-t-4 border-gray-100 bg-gray-50 flex gap-6">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest bg-white border-2 border-gray-200 rounded-2xl hover:bg-gray-100 transition-all">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-[2] py-5 bg-[#005c3e] text-white font-black text-[10px] uppercase rounded-2xl shadow-xl tracking-widest border-b-6 border-emerald-950 active:translate-y-1 transition-all">Sincronizar Dados Nano</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-red-500 animate-scaleIn">
            <div className="p-12 text-center bg-red-50">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-red-200 text-3xl">!</div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none mb-4">Remover Registro?</h3>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Ação irreversível no sistema Nano</p>
            </div>
            <div className="p-8 flex gap-4 bg-white border-t-4 border-gray-100">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-4 bg-gray-100 font-black rounded-2xl text-[10px] uppercase tracking-widest text-gray-400 border-2 border-gray-200">Cancelar</button>
              <button onClick={confirmDeleteAction} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}

      {duplicateWarning && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-amber-500 animate-scaleIn">
            <div className="p-12 text-center bg-amber-50">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-amber-200 text-3xl">?</div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none mb-4">Número Duplicado!</h3>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">O número {duplicateWarning.numero || duplicateWarning.documento} já existe no sistema Nano. Deseja continuar?</p>
            </div>
            <div className="p-8 flex gap-4 bg-white border-t-4 border-gray-100">
              <button onClick={() => setDuplicateWarning(null)} className="flex-1 py-4 bg-gray-100 font-black rounded-2xl text-[10px] uppercase tracking-widest text-gray-400 border-2 border-gray-200">Corrigir</button>
              <button onClick={confirmDuplicateSave} className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Sim, Continuar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-gray-300 overflow-hidden">
        <div className="p-10 border-b-4 border-gray-200 bg-gray-50/20 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="h-10 w-2.5 bg-[#005c3e] rounded-full"></div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">{title}</h3>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-2 bg-white border-4 border-gray-200 p-2 rounded-2xl shadow-inner">
              {['all', '1', '7', '30'].map(val => (
                <button
                  key={val}
                  onClick={() => setDayFilter(val as any)}
                  className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${dayFilter === val ? 'bg-[#005c3e] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  {val === 'all' ? 'Todos' : val === '1' ? 'Hoje' : `${val} Dias`}
                </button>
              ))}
            </div>

            <div className="relative w-full xl:w-80">
              <input type="text" placeholder="Filtrar..." className="w-full bg-white border-4 border-gray-200 outline-none p-4 pl-12 text-sm font-black rounded-2xl focus:border-emerald-600 transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white text-gray-400 text-[9px] font-black uppercase tracking-[0.3em] border-b-2 border-gray-100">
                <th className="px-10 py-8">Cronologia</th>
                {type !== 'comentario' && <th className="px-10 py-8">Identificação Nano</th>}
                <th className="px-10 py-8">Status / Detalhamento</th>
                {canEdit && <th className="px-10 py-8 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-50">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-emerald-50/20 group transition-all">
                  <td className="px-10 py-10 font-black text-gray-800 text-sm italic">{format(parseISO(item.data), 'dd/MM/yyyy')}</td>
                  {type !== 'comentario' && (
                    <td className="px-10 py-10">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{item.conferente || item.fornecedor}</p>
                        {item.tipo && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[7px] font-bold uppercase tracking-wider border border-gray-200">{item.tipo}</span>}
                      </div>
                      <p className="text-2xl font-black text-gray-900 tracking-tighter leading-none italic">#{item.numero || item.documento}</p>
                    </td>
                  )}
                  <td className="px-10 py-10">
                    <div className="flex flex-col gap-4 items-start">
                      {type !== 'comentario' && <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>{item.status}</span>}
                      <p className="text-[11px] text-gray-600 italic font-medium leading-relaxed max-w-xl">"{item.texto || item.observacao}"</p>
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-10 py-10 text-right">
                      <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button onClick={() => handleEdit(item)} className="p-3.5 text-emerald-800 hover:bg-emerald-700 hover:text-white rounded-xl border-2 border-gray-200 transition-all active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => setDeleteConfirm({ id: item.id })} className="p-3.5 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border-2 border-gray-200 transition-all active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 4 : 3} className="px-10 py-24 text-center">
                    <p className="text-[11px] font-black uppercase text-gray-300 tracking-[0.4em]">Nenhum registro encontrado para este período</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
