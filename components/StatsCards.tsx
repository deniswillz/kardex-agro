
import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsCardsProps {
  stats: DashboardStats;
  periodLabel: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, periodLabel }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* CARD MOVIMENTOS - Frequência de Operações */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Movimentos</p>
          <h3 className="text-3xl font-black text-purple-600 tracking-tighter">{stats.totalTransactions}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Operações em {periodLabel}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-2xl text-purple-600 shadow-sm">
          <Activity size={28} />
        </div>
      </div>

      {/* CARD ENTRADAS - Frequência de Entradas */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entrada (Qtd)</p>
          <h3 className="text-3xl font-black text-emerald-600 tracking-tighter">+{stats.entriesCount}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Transações de Recebimento</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm">
          <ArrowUpCircle size={28} />
        </div>
      </div>

      {/* CARD SAÍDAS - Frequência de Saídas */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saída (Qtd)</p>
          <h3 className="text-3xl font-black text-red-600 tracking-tighter">-{stats.exitsCount}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Transações de Expedição</p>
        </div>
        <div className="p-4 bg-red-50 rounded-2xl text-red-600 shadow-sm">
          <ArrowDownCircle size={28} />
        </div>
      </div>
    </div>
  );
};
