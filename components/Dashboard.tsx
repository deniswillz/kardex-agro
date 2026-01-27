
import React, { useState, useMemo } from 'react';
import { AppState, NotaFiscal, Comentario } from '../types';
import { differenceInDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  data: AppState;
  analysis: string;
  onRunAnalysis: () => void;
  onRefresh?: () => void;
  isGuest?: boolean;
  onNavigateToList?: (section: 'notas' | 'comentarios') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, analysis, onRunAnalysis, onRefresh, isGuest, onNavigateToList }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'notas' | 'comentarios'>('notas');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const monthStats = useMemo(() => {
    const monthStr = format(viewDate, 'yyyy-MM');
    const notasMes = data.notas.filter(n => n.data.startsWith(monthStr));
    const criticosMes = [
      ...notasMes.filter(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, parseISO(n.data)) >= 3),
    ];

    return [
      { label: 'Notas/Mês', value: notasMes.length, icon: '📄', color: 'blue' },
      { label: 'Apontam.', value: data.comentarios.filter(c => c.data.startsWith(monthStr)).length, icon: '💬', color: 'purple' },
      { label: 'Críticos', value: criticosMes.length, icon: '🚨', color: 'red' },
    ];
  }, [data, viewDate, today]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarInterval = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const getDayDetails = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return {
      notas: data.notas.filter(n => n.data === dayStr),
      comentarios: data.comentarios.filter(c => c.data === dayStr),
    };
  };

  const getDayStatusStyle = (date: Date) => {
    const { notas } = getDayDetails(date);
    const hasActivity = notas.length > 0;
    let base = "border-4 shadow-sm transition-all ";
    if (isSameDay(date, today)) return base + 'bg-blue-50 border-blue-500 text-blue-900 ring-4 ring-blue-100 rounded-[2rem]';
    if (notas.some(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status) && differenceInDays(today, date) >= 3)) return base + 'bg-red-50 border-red-500 text-red-900 shadow-lg rounded-[2rem]';
    if (hasActivity) return base + 'bg-white border-emerald-700 text-gray-800 shadow-md rounded-[2rem]';
    return base + 'bg-gray-50/50 border-gray-300 text-gray-400 rounded-[2rem]';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Classificada':
      case 'Concluída': return 'bg-emerald-600 text-white';
      case 'Pendente': return 'bg-red-600 text-white';
      case 'Em Conferência': return 'bg-blue-600 text-white';
      case 'Em Separação': return 'bg-amber-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const selectedDayDetails = selectedDay ? getDayDetails(selectedDay) : null;

  return (
    <div className="space-y-10 pb-24 relative">
      {/* Topo Combinado: Visão + Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Card de Visão (Ocupa 4/12) */}
        <div className="xl:col-span-4 bg-white p-10 rounded-[2.5rem] border-4 border-gray-300 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#005c3e]"></div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none italic">Visão Operacional</h2>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-4">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
          </div>
          <button onClick={() => { onRunAnalysis(); setShowAnalysisModal(true); }} className="mt-8 px-8 py-5 bg-[#005c3e] text-white font-black rounded-2xl shadow-lg hover:bg-emerald-900 transition-all text-[10px] tracking-widest uppercase border-b-6 border-emerald-950 active:translate-y-1">
            ✨ Diagnóstico IA Nano
          </button>
        </div>

        {/* Grid de Stats (Ocupa 8/12) */}
        <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {monthStats.map((stat) => (
            <div key={stat.label} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-gray-300 flex flex-col items-center justify-center text-center hover:border-emerald-500 transition-all border-b-[10px] border-b-emerald-600">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 mb-4 ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    stat.color === 'purple' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-red-50 text-red-600 border-red-200'
                }`}>{stat.icon}</div>
              <div>
                <p className="text-3xl font-black text-gray-900 italic tracking-tighter leading-none">{stat.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agenda Principal */}
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-4 border-gray-300">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-6">
            <div className="h-12 w-2.5 bg-[#005c3e] rounded-full"></div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Agenda Nano</h3>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 p-2.5 rounded-2xl border-2 border-gray-200">
            <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2.5 bg-white border-2 border-gray-300 rounded-xl hover:border-emerald-500 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-[10px] font-black uppercase px-4 min-w-[120px] text-center">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2.5 bg-white border-2 border-gray-300 rounded-xl hover:border-emerald-500 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase py-2 tracking-[0.2em]">{d}</div>
          ))}
          {calendarInterval.map((date, i) => {
            const { notas } = getDayDetails(date);
            const isCurrentMonth = isSameMonth(date, viewDate);
            return (
              <div
                key={i}
                onClick={() => { if (isCurrentMonth && (notas.length > 0)) { setSelectedDay(date); setActiveTab('notas'); } }}
                className={`min-h-[130px] p-5 flex flex-col justify-between ${getDayStatusStyle(date)} ${!isCurrentMonth ? 'opacity-10 pointer-events-none' : 'cursor-pointer hover:scale-[1.03] active:scale-95'}`}
              >
                <span className="text-2xl font-black italic">{format(date, 'd')}</span>
                <div className="flex flex-col gap-1.5 mt-4">
                  {notas.length > 0 && <div className="flex justify-between items-center bg-white/95 px-2.5 py-1.5 rounded-lg text-[8px] font-black border border-blue-100 uppercase"><span>NF</span><span>{notas.length}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup Detalhamento */}
      {selectedDay && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border-4 border-gray-400 h-[85vh] animate-scaleIn">
            <div className="px-10 py-6 bg-[#005c3e] text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Detalhamento Nano</h3>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-2">{format(selectedDay, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-3 hover:bg-white/20 rounded-full border-2 border-white/20 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex bg-gray-50 border-b-2 border-gray-200 shrink-0">
              <button onClick={() => setActiveTab('notas')} className={`flex-1 py-6 font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'notas' ? 'text-blue-700 bg-white border-b-4 border-blue-700' : 'text-gray-400 hover:text-gray-600'}`}>Notas ({selectedDayDetails?.notas.length})</button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-gray-50/30 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {activeTab === 'notas' && selectedDayDetails?.notas.map(n => (
                  <div key={n.id} className="p-6 bg-white border-4 border-gray-200 rounded-3xl border-l-[14px] border-l-blue-600 flex flex-col justify-between group relative overflow-hidden shadow-sm hover:border-blue-400 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md truncate max-w-[140px] border border-gray-200">ID: {n.numero}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${getStatusColor(n.status)}`}>{n.status}</span>
                      </div>
                      <h4 className="text-sm font-black text-gray-900 uppercase leading-tight line-clamp-2 mb-3">{n.fornecedor}</h4>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Conferente: <span className="text-gray-800">{n.conferente}</span></p>
                    </div>
                    {n.observacao && <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl text-[10px] italic border border-blue-100 line-clamp-3">"{n.observacao}"</div>}
                    <button
                      onClick={() => { setSelectedDay(null); onNavigateToList?.('notas'); }}
                      className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 active:scale-95"
                      title="Ver na Lista"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>
                ))}

              </div>
            </div>

            <div className="px-10 py-6 bg-gray-50 border-t-2 border-gray-100 shrink-0">
              <button onClick={() => setSelectedDay(null)} className="w-full py-5 bg-[#005c3e] text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl border-b-6 border-emerald-950 active:translate-y-1 transition-all">Confirmar e Sair</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal IA */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-7xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border-4 border-gray-400 h-[85vh] animate-scaleIn">
            <div className="p-10 bg-[#005c3e] text-white flex justify-between items-center">
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">Relatório Nano IA</h3>
              <button onClick={() => setShowAnalysisModal(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full border-2 border-white/20 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-14 flex-1 overflow-y-auto custom-scrollbar">
              <div className="text-xl font-bold text-gray-800 leading-relaxed italic bg-emerald-50 p-12 rounded-[2rem] border-4 border-emerald-200 min-h-full whitespace-pre-wrap shadow-inner">
                {analysis || "Sincronizando processamento Nano IA..."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
