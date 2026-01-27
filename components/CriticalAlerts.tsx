import React from 'react';
import { AlertTriangle, TrendingDown, ClipboardCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { InventoryItem } from '../types';

interface CriticalAlertsProps {
    items: InventoryItem[];
    onAction: (code: string, warehouse: string, address?: string) => void;
    onNavigateToStock?: () => void;
}

export const CriticalAlerts: React.FC<CriticalAlertsProps> = ({ items, onAction, onNavigateToStock }) => {
    // Separar itens por tipo
    const lowStockItems = items.filter(item => item.isCritical);
    const divergentItems = items.filter(item => item.isDivergent);

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

    const handleNavigate = () => {
        if (onNavigateToStock) {
            onNavigateToStock();
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Card Saldo Baixo */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-50 rounded-2xl border border-red-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-red-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                <TrendingDown size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-red-800 uppercase">Saldo Baixo</h3>
                                <p className="text-[10px] font-bold text-red-600">{lowStockItems.length} item(s) abaixo do mínimo</p>
                            </div>
                        </div>
                        <button
                            onClick={handleNavigate}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-red-100/50">
                        {lowStockItems.slice(0, 5).map((item) => (
                            <div key={item.key} className="p-3 hover:bg-red-100/30 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-black text-red-800 uppercase leading-tight truncate">
                                            {item.name}
                                        </h4>
                                        <p className="text-[9px] font-mono text-red-600/70">{item.code}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-red-700">
                                                Saldo: {item.balance}
                                            </span>
                                            <span className="text-[10px] font-bold text-red-500">
                                                Min: {item.minStock}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {lowStockItems.length > 5 && (
                        <div className="p-2 bg-red-100/50 text-center">
                            <p className="text-[10px] font-bold text-red-600 uppercase">
                                +{lowStockItems.length - 5} outros itens
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Card Divergência */}
            {divergentItems.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-amber-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <AlertCircle size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-amber-800 uppercase">Divergência</h3>
                                <p className="text-[10px] font-bold text-amber-600">{divergentItems.length} item(s) com contagem divergente</p>
                            </div>
                        </div>
                        <button
                            onClick={handleNavigate}
                            className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-amber-100/50">
                        {divergentItems.slice(0, 5).map((item) => (
                            <div key={item.key} className="p-3 hover:bg-amber-100/30 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-black text-amber-800 uppercase leading-tight truncate">
                                            {item.name}
                                        </h4>
                                        <p className="text-[9px] font-mono text-amber-600/70">{item.code}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-amber-700">
                                                Sistema: {item.balance}
                                            </span>
                                            <span className="text-[10px] font-bold text-amber-500">
                                                Contagem: {item.lastCountQuantity ?? '--'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {divergentItems.length > 5 && (
                        <div className="p-2 bg-amber-100/50 text-center">
                            <p className="text-[10px] font-bold text-amber-600 uppercase">
                                +{divergentItems.length - 5} outros itens
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
