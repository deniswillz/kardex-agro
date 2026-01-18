
import React from 'react';
import { AlertTriangle, PackageSearch, ArrowRight, ClipboardList } from 'lucide-react';
import { InventoryItem } from '../types';

interface CriticalAlertsProps {
  criticalItems: InventoryItem[];
  onAction: (code: string) => void;
}

export const CriticalAlerts: React.FC<CriticalAlertsProps> = ({ criticalItems, onAction }) => {
  if (criticalItems.length === 0) return null;

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="text-red-500 animate-pulse" size={20} />
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Incidentes de Inventário</h3>
        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
          {criticalItems.length} {criticalItems.length === 1 ? 'ALERTA ATIVO' : 'ALERTAS ATIVOS'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {criticalItems.map((item) => (
          <div 
            key={item.code}
            className={`bg-white border-l-4 rounded-xl shadow-lg p-4 flex items-center justify-between hover:shadow-xl transition-shadow ${item.isDivergent ? 'border-amber-500 shadow-amber-500/5' : 'border-red-600 shadow-red-500/5'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.isDivergent ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                {item.isDivergent ? <ClipboardList size={22} /> : <PackageSearch size={22} />}
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 line-clamp-1 uppercase">{item.name}</h4>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                  SKU: <span className="font-black text-slate-800">{item.code}</span>
                </p>
                
                <div className={`mt-2 px-2 py-1 rounded ${item.isDivergent ? 'bg-amber-50' : 'bg-red-50'}`}>
                  {item.isDivergent ? (
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-tighter">
                      Divergência: Sistema({item.balance}) vs Físico({item.lastCountQuantity})
                    </p>
                  ) : (
                    <p className="text-[10px] font-black text-red-700 uppercase tracking-tighter">
                      Saldo Baixo: {item.balance} de {item.minStock} {item.unit}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => onAction(item.code)}
              className={`p-2.5 rounded-xl transition-all ${item.isDivergent ? 'text-amber-600 hover:bg-amber-50' : 'text-red-600 hover:bg-red-50'}`}
              title="Ajustar ou Movimentar"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
