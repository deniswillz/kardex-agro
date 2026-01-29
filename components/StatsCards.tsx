
import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Activity, Clock } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsCardsProps {
  stats: DashboardStats;
  timeFilter: 7 | 15 | 30 | 90;
  setTimeFilter: (filter: 7 | 15 | 30 | 90) => void;
}

const filterLabels: Record<7 | 15 | 30 | 90, string> = {
  7: '7 dias',
  15: '15 dias',
  30: '30 dias',
  90: '90 dias'
};

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, timeFilter, setTimeFilter }) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Time Filter */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Clock size={16} />
          <span className="text-xs font-bold">Período:</span>
        </div>
        <div className="flex gap-1">
          {([7, 15, 30, 90] as const).map(days => (
            <button
              key={days}
              onClick={() => setTimeFilter(days)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${timeFilter === days
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              {filterLabels[days]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD MOVIMENTOS */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Movimentos</p>
            <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tighter">{stats.totalTransactions}</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Operações em {filterLabels[timeFilter]}</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 dark:text-purple-400 shadow-sm">
            <Activity size={28} />
          </div>
        </div>

        {/* CARD ENTRADAS */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Entrada (Qtd)</p>
            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">+{stats.entriesCount}</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Transações de Recebimento</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-sm">
            <ArrowUpCircle size={28} />
          </div>
        </div>

        {/* CARD SAÍDAS */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Saída (Qtd)</p>
            <h3 className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tighter">-{stats.exitsCount}</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Transações de Expedição</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 dark:text-red-400 shadow-sm">
            <ArrowDownCircle size={28} />
          </div>
        </div>
      </div>
    </div>
  );
};
