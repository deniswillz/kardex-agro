
import React from 'react';
import { AlertTriangle, PackageSearch, ArrowRight, ClipboardList } from 'lucide-react';
import { InventoryItem } from '../types';

interface CriticalAlertsProps {
  criticalItems: InventoryItem[];
  onAction: (code: string) => void;
}

export const CriticalAlerts: React.FC<CriticalAlertsProps> = ({ criticalItems, onAction }) => {
  if (criticalItems.length === 0) return null;

  // Separar itens por tipo de alerta
  const lowStockItems = criticalItems.filter(item => item.isCritical && !item.isDivergent);
  const divergentItems = criticalItems.filter(item => item.isDivergent);

  // Agrupar por SKU (mantendo apenas um item por código)
  const uniqueLowStock = lowStockItems.reduce((acc, item) => {
    if (!acc.find(i => i.code === item.code)) acc.push(item);
    return acc;
  }, [] as InventoryItem[]);

  const uniqueDivergent = divergentItems.reduce((acc, item) => {
    if (!acc.find(i => i.code === item.code)) acc.push(item);
    return acc;
  }, [] as InventoryItem[]);

  const totalAlerts = uniqueLowStock.length + uniqueDivergent.length;

  return (
    <div className="mb-6 animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-red-500 animate-pulse" size={20} />
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Incidentes de Inventário</h3>
        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
          {totalAlerts} {totalAlerts === 1 ? 'ALERTA' : 'ALERTAS'}
        </span>
      </div>

      {/* SALDO BAIXO */}
      {uniqueLowStock.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PackageSearch size={14} className="text-red-500" />
            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Saldo Baixo ({uniqueLowStock.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {uniqueLowStock.map((item) => (
              <div
                key={`low-${item.code}`}
                className="bg-white border-l-4 border-red-600 rounded-xl shadow-lg shadow-red-500/5 p-4 flex items-center justify-between hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50 text-red-600">
                    <PackageSearch size={22} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 line-clamp-1 uppercase">{item.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      SKU: <span className="font-black text-slate-800">{item.code}</span>
                    </p>
                    <div className="mt-2 px-2 py-1 rounded bg-red-50">
                      <p className="text-[10px] font-black text-red-700 uppercase tracking-tighter">
                        Saldo: {item.balance} de {item.minStock} {item.unit}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onAction(item.code)}
                  className="p-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all"
                  title="Ver em Saldo em Estoque"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DIVERGÊNCIA DE CONTAGEM */}
      {uniqueDivergent.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={14} className="text-amber-500" />
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Divergência na Contagem ({uniqueDivergent.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {uniqueDivergent.map((item) => (
              <div
                key={`div-${item.code}`}
                className="bg-white border-l-4 border-amber-500 rounded-xl shadow-lg shadow-amber-500/5 p-4 flex items-center justify-between hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <ClipboardList size={22} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 line-clamp-1 uppercase">{item.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      SKU: <span className="font-black text-slate-800">{item.code}</span>
                    </p>
                    <div className="mt-2 px-2 py-1 rounded bg-amber-50">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-tighter">
                        Sistema({item.balance}) vs Físico({item.lastCountQuantity})
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onAction(item.code)}
                  className="p-2.5 rounded-xl text-amber-600 hover:bg-amber-50 transition-all"
                  title="Ver em Saldo em Estoque"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
