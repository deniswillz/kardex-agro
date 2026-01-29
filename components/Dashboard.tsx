
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction } from '../types';

interface DashboardProps {
  transactions: Transaction[];
}

const MAIN_WAREHOUSES = ['01', '20', '22'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  // Define o período de 15 dias para visualização detalhada
  const lastDays = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (14 - i));
    return d.toISOString().split('T')[0];
  });

  const chartData = lastDays.map(date => {
    // Filtra transações do dia apenas para os armazéns principais
    const dayMoves = transactions.filter(t => t.date === date && MAIN_WAREHOUSES.includes(t.warehouse));

    // Contagem de transações (frequência operacional)
    const entrada = dayMoves.filter(t => t.type === 'ENTRADA' && t.operationType === 'MOVIMENTACAO').length;
    const saida = dayMoves.filter(t => t.type === 'SAIDA' && t.operationType === 'MOVIMENTACAO').length;
    const totalMovimentos = dayMoves.length;

    return {
      name: date.split('-').slice(1).reverse().join('/'),
      Entrada: entrada,
      Saida: saida,
      Movimentos: totalMovimentos
    };
  });

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px] animate-fade-in" />;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px] flex flex-col animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Frequência Operacional (01, 20, 22)</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número de Transações Diárias por Tipo</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded"></span> Entrada</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 rounded"></span> Saída</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-600 rounded"></span> Movimentos</div>
        </div>
      </div>

      {/* Adicionada altura mínima e largura flexível para evitar warnings de renderização do Recharts */}
      <div className="flex-1 w-full min-h-[350px] relative px-2 overflow-hidden">
        {mounted && (
          <ResponsiveContainer width="99%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
                dy={15}
                interval={0}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px',
                  backdropFilter: 'blur(8px)'
                }}
                labelStyle={{ fontWeight: 900, marginBottom: '8px', color: '#1e293b', fontSize: '11px', textTransform: 'uppercase' }}
                itemStyle={{ fontSize: '10px', fontWeight: 700, padding: '2px 0' }}
              />
              <Line
                type="monotone"
                dataKey="Entrada"
                stroke="#10b981"
                strokeWidth={4}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name="Entradas"
              />
              <Line
                type="monotone"
                dataKey="Saida"
                stroke="#ef4444"
                strokeWidth={4}
                dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name="Saídas"
              />
              <Line
                type="monotone"
                dataKey="Movimentos"
                stroke="#8b5cf6"
                strokeWidth={4}
                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name="Movimentações"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="text-[10px] font-bold text-slate-400">
          * Gráfico focado na frequência de registros nos armazéns principais (01, 20, 22).
        </div>
        <div className="text-[10px] font-black text-primary-700 bg-primary-50 px-2 py-1 rounded">
          FLUXO EXCLUSIVO (01, 20, 22)
        </div>
      </div>
    </div>
  );
};
