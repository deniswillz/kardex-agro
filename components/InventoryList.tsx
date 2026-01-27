
// Fix: Remove non-existent 'width' export from 'react'
import React, { useMemo, useState } from 'react';
import { Transaction, InventoryItem } from '../types';
import { Search, Package, ArrowRightLeft, AlertTriangle } from 'lucide-react';

interface InventoryListProps {
  transactions: Transaction[];
  onSelectCode: (code: string) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ transactions, onSelectCode }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const inventory = useMemo(() => {
    const map: Record<string, InventoryItem> = {};

    transactions.forEach(t => {
      if (!map[t.code]) {
        // Fix: Provide all required properties for InventoryItem and use correct property names (entries, exits, lastCount)
        // Added isDivergent: false to satisfy the InventoryItem interface definition.
        map[t.code] = { 
          key: t.code,
          code: t.code, 
          name: t.name, 
          warehouse: 'TODOS',
          address: '-',
          unit: t.unit || 'UN',
          entries: 0, 
          exits: 0, 
          balance: 0, 
          minStock: t.minStock || 0,
          lastCount: t.date,
          isCritical: false,
          isDivergent: false
        };
      }
      
      const item = map[t.code];
      // Fix: Use 'lastCount' instead of 'lastDate' as per InventoryItem interface
      if (t.timestamp > new Date(item.lastCount).getTime()) {
        item.name = t.name;
        item.lastCount = t.date;
        item.minStock = t.minStock || 0;
        item.unit = t.unit || item.unit;
      }

      if (t.type === 'ENTRADA') {
        // Fix: Access and update 'entries' property safely
        item.entries = (item.entries || 0) + t.quantity;
        item.balance += t.quantity;
      } else {
        // Fix: Access and update 'exits' property safely
        item.exits = (item.exits || 0) + t.quantity;
        item.balance -= t.quantity;
      }
    });

    return Object.values(map).map(item => ({
      ...item,
      // Consistency fix: ensure critical status logic matches App.tsx
      isCritical: item.minStock > 0 && item.balance <= item.minStock
    })).sort((a, b) => b.balance - a.balance);
  }, [transactions]);

  const filteredInventory = inventory.filter(item => 
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          Inventário Geral
          <span className="text-xs font-normal bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{filteredInventory.length}</span>
        </h2>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar SKU ou nome..." 
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-0">
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Entradas</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Saídas</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mínimo</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saldo</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredInventory.map((item) => (
              <tr key={item.code} className={`hover:bg-slate-50 transition-colors ${item.isCritical ? 'bg-red-50/30' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${item.isCritical ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Package size={20} />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">{item.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-emerald-600 hidden md:table-cell font-medium">
                  +{item.entries}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-red-500 hidden md:table-cell font-medium">
                  -{item.exits}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-slate-400 font-medium italic">
                  {item.minStock} un
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {item.isCritical && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                      item.isCritical ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {item.balance} un
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => onSelectCode(item.code)}
                    className="text-primary-600 hover:text-primary-900 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowRightLeft size={16} /> <span className="hidden sm:inline">Lançar</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredInventory.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-sm">
            Nenhum item encontrado no inventário.
          </div>
        )}
      </div>
    </div>
  );
};
