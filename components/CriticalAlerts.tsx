import React from 'react';
import { AlertTriangle, TrendingDown, ClipboardCheck, ArrowRight } from 'lucide-react';
import { InventoryItem } from '../types';

interface CriticalAlertsProps {
    items: InventoryItem[];
    onAction: (code: string, warehouse: string, address?: string) => void;
}

export const CriticalAlerts: React.FC<CriticalAlertsProps> = ({ items, onAction }) => {
    if (items.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 h-full flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                    <ClipboardCheck size={32} className="text-emerald-500" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase mb-2">Tudo Certo!</h3>
                <p className="text-xs text-slate-400 max-w-[200px]">
                    Não há itens críticos ou divergências no momento.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col animate-fade-in">
            <div className="p-4 border-b border-slate-100 bg-amber-50 flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <AlertTriangle size={18} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-amber-800 uppercase">Alertas Críticos</h3>
                    <p className="text-[10px] font-bold text-amber-600">{items.length} item(s) requer(em) atenção</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {items.slice(0, 10).map((item) => (
                    <div key={item.key} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {item.isCritical && (
                                        <span className="text-[8px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">
                                            Saldo Baixo
                                        </span>
                                    )}
                                    {item.isDivergent && (
                                        <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase">
                                            Divergência
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-xs font-black text-slate-800 uppercase leading-tight mb-1">
                                    {item.name}
                                </h4>
                                <p className="text-[10px] font-mono text-slate-400">{item.code}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-slate-500">
                                        Saldo: <span className={item.balance <= 0 ? 'text-red-600' : 'text-slate-800'}>{item.balance}</span>
                                    </span>
                                    {item.minStock > 0 && (
                                        <span className="text-[10px] font-bold text-slate-400">
                                            Min: {item.minStock}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => onAction(item.code, item.warehouse, item.address)}
                                className="shrink-0 p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                            >
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {items.length > 10 && (
                <div className="p-3 bg-slate-50 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                        +{items.length - 10} outros alertas
                    </p>
                </div>
            )}
        </div>
    );
};
