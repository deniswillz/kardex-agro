
import React, { useState, useMemo } from 'react';
import { Transaction, WAREHOUSES, OperationType } from '../types';
import { Search, Trash2, MapPin, Calendar, User, Pencil, Filter, FileText, AlertCircle, ArrowUpRight, ArrowDownLeft, ClipboardCheck, MoveRight } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}

const MAIN_WAREHOUSES = ['01', '20', '22'];

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOp, setFilterOp] = useState<'ALL' | OperationType>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      // Regra: Apenas armazéns 01, 20 e 22
      if (!MAIN_WAREHOUSES.includes(t.warehouse)) return false;

      const matchesSearch =
        t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.responsible || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesOp = filterOp === 'ALL' || t.operationType === filterOp;

      const txDate = new Date(t.date);
      const matchesStart = !startDate || txDate >= new Date(startDate);
      const matchesEnd = !endDate || txDate <= new Date(endDate);

      return matchesSearch && matchesOp && matchesStart && matchesEnd;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, searchTerm, filterOp, startDate, endDate]);

  const getOpBadge = (t: Transaction) => {
    if (t.operationType === 'CONTAGEM') {
      return <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-amber-200 flex items-center gap-1"><ClipboardCheck size={10} /> Contagem</span>;
    }
    return t.type === 'ENTRADA'
      ? <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-emerald-200 flex items-center gap-1"><ArrowUpRight size={10} /> Entrada</span>
      : <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-red-200 flex items-center gap-1"><ArrowDownLeft size={10} /> Saída</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full animate-fade-in overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              Histórico (01, 20, 22)
              <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {filteredData.length}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Pesquisar SKU ou Nome..."
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${showFilters ? 'bg-primary-600 border-primary-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-down">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Operação</label>
              <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-600" value={filterOp} onChange={(e) => setFilterOp(e.target.value as any)}>
                <option value="ALL">Todas</option>
                <option value="MOVIMENTACAO">Movimentações</option>
                <option value="CONTAGEM">Contagens</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data Inicial</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-600" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data Final</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-600" />
            </div>
          </div>
        )}
      </div>

      <div className="overflow-y-auto flex-1 no-scrollbar p-2 md:p-0">
        <table className="w-full hidden md:table border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Produto - SKU</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Logística (Origem → Destino)</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Registro</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredData.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden">
                      {t.photos?.[0] ? <img src={t.photos[0]} alt="" className="h-full w-full object-cover" /> : <FileText className="text-slate-400" size={20} />}
                    </div>
                    <div className="ml-4">
                      <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{t.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">{t.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {getOpBadge(t)}
                    <div className={`text-sm font-black ${t.operationType === 'CONTAGEM' ? 'text-amber-600' : t.type === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'SAIDA' && t.operationType === 'MOVIMENTACAO' ? '-' : '+'}{t.quantity} <span className="text-[10px] font-medium text-slate-400">{t.unit}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded">ORIGEM: {t.warehouse}</span>
                      {t.destinationWarehouse && (
                        <>
                          <MoveRight size={14} className="text-primary-500" />
                          <span className="bg-primary-600 text-white text-[9px] px-1.5 py-0.5 rounded">DESTINO: {t.destinationWarehouse}</span>
                        </>
                      )}
                    </div>
                    {t.address && <span className="text-[9px] text-slate-400 italic font-medium">Endereço: {t.address}</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-primary-700 uppercase">
                      <User size={12} className="text-primary-400" />
                      {t.responsible || 'Admin'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(t)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={18} /></button>
                    <button onClick={() => confirm('Excluir?') && onDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile View - Cards Layout */}
        <div className="md:hidden flex flex-col gap-3 py-2 pb-24">
          {filteredData.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm active:bg-slate-50 transition-colors">
              <div className="p-4 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-400">
                    {t.photos?.[0] ? <img src={t.photos[0]} className="w-full h-full object-cover rounded-lg" /> : <FileText size={18} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{t.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400 tracking-tighter uppercase">{t.code}</span>
                  </div>
                </div>
                <div className="text-right">
                  {getOpBadge(t)}
                  <div className={`text-sm font-black mt-1 ${t.operationType === 'CONTAGEM' ? 'text-amber-600' : t.type === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'SAIDA' && t.operationType === 'MOVIMENTACAO' ? '-' : '+'}{t.quantity} <span className="text-[9px] font-medium">{t.unit}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50/50 flex flex-col gap-3">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fluxo Logístico</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="bg-slate-700 text-white px-1.5 py-0.5 rounded text-[8px]">DE: {t.warehouse}</span>
                    {t.destinationWarehouse && (
                      <>
                        <MoveRight size={12} className="text-primary-500" />
                        <span className="bg-primary-600 text-white px-1.5 py-0.5 rounded text-[8px]">PARA: {t.destinationWarehouse}</span>
                      </>
                    )}
                  </div>
                  {t.address && <p className="text-[9px] text-slate-400 mt-1">End: {t.address}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Registro</p>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                        <Calendar size={10} className="text-slate-400" />
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-primary-700 uppercase">
                        <User size={10} className="text-primary-400" />
                        {t.responsible || 'Admin'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(t)} className="p-2 text-primary-600 bg-white border border-slate-200 rounded-lg shadow-sm"><Pencil size={14} /></button>
                    <button onClick={() => confirm('Excluir?') && onDelete(t.id)} className="p-2 text-red-600 bg-white border border-slate-200 rounded-lg shadow-sm"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
            <AlertCircle size={48} className="opacity-10" />
            <p className="text-sm font-medium italic uppercase tracking-widest text-center">Nenhum registro para Armazéns 01, 20 ou 22.</p>
          </div>
        )}
      </div>
    </div>
  );
};
