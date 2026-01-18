
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, List, Menu, Plus, Package, Clock, BarChart3, Settings as SettingsIcon, ClipboardList } from 'lucide-react';
import { Transaction, DashboardStats, InventoryItem, User } from './types';
import { loadTransactions, saveTransactions, loadUsers, saveUsers, wipeTransactions, restoreBackup, exportToJson } from './services/storage';
import { exportToExcel, importFromExcel } from './services/excel';
import { StatsCards } from './components/StatsCards';
import { Dashboard } from './components/Dashboard';
import { MovementForm } from './components/MovementForm';
import { TransactionHistory } from './components/TransactionHistory';
import { StockBalance } from './components/StockBalance';
import { CriticalAlerts } from './components/CriticalAlerts';
import { Settings } from './components/Settings';
import { InventoryModule } from './components/InventoryModule';

type TimeFilter = 7 | 15 | 30 | 90;
const MAIN_WAREHOUSES = ['01', '20', '22'];

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'DASHBOARD' | 'HISTORY' | 'FORM' | 'STOCK' | 'SETTINGS' | 'INVENTORY'>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [prefill, setPrefill] = useState<{ code: string; warehouse: string; address?: string } | undefined>();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(30);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTransactions(loadTransactions());
    setUsers(loadUsers());
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kardex_pro_v3_data') setTransactions(loadTransactions());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (transactions.length >= 0) saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    if (users.length > 0) saveUsers(users);
  }, [users]);

  const stockItems: InventoryItem[] = useMemo(() => {
    const map: Record<string, InventoryItem> = {};
    const lastCounts: Record<string, { date: string, quantity: number, ts: number }> = {};
    
    transactions.forEach(t => {
      if (!MAIN_WAREHOUSES.includes(t.warehouse)) return;

      const normalizedAddress = (t.address || '').trim().toUpperCase();
      const key = `${t.code}_${t.warehouse}_${normalizedAddress}`;
      
      if (!map[key]) {
        map[key] = { 
          key, code: t.code, name: t.name, warehouse: t.warehouse, 
          address: t.address || '', unit: t.unit, balance: 0, 
          minStock: t.minStock || 0, lastCount: t.date, isCritical: false,
          isDivergent: false, entries: 0, exits: 0
        };
      }
      
      if (t.timestamp > new Date(map[key].lastCount).getTime()) {
        map[key].name = t.name;
        map[key].minStock = t.minStock || 0;
      }

      if (t.operationType === 'MOVIMENTACAO') {
        if (t.type === 'ENTRADA') {
          map[key].balance += t.quantity;
          map[key].entries += t.quantity;
        } else {
          map[key].balance -= t.quantity;
          map[key].exits += t.quantity;
        }
      } else if (t.operationType === 'CONTAGEM') {
        if (!lastCounts[key] || t.timestamp > lastCounts[key].ts) {
          lastCounts[key] = { date: t.date, quantity: t.quantity, ts: t.timestamp };
        }
      }
    });

    const globalBalances: Record<string, number> = {};
    const minStocks: Record<string, number> = {};
    
    Object.values(map).forEach(item => {
      globalBalances[item.code] = (globalBalances[item.code] || 0) + item.balance;
      minStocks[item.code] = Math.max(minStocks[item.code] || 0, item.minStock);
    });

    return Object.values(map).map(item => {
      const lastCount = lastCounts[item.key];
      const isCritical = minStocks[item.code] > 0 && globalBalances[item.code] <= minStocks[item.code];
      const isDivergent = lastCount !== undefined && lastCount.quantity !== item.balance;

      return { 
        ...item, 
        isCritical,
        isDivergent,
        lastCountQuantity: lastCount?.quantity
      };
    });
  }, [transactions]);

  const criticalItems = useMemo(() => {
    const uniqueCodes = new Set<string>();
    const results: InventoryItem[] = [];
    
    stockItems.forEach(i => {
      if ((i.isCritical || i.isDivergent) && !uniqueCodes.has(i.code)) {
        uniqueCodes.add(i.code);
        const globalBal = stockItems
          .filter(x => x.code === i.code)
          .reduce((acc, curr) => acc + curr.balance, 0);
        results.push({ ...i, balance: globalBal });
      }
    });
    return results;
  }, [stockItems]);

  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - timeFilter);
    
    const filtered = transactions.filter(t => 
      new Date(t.date) >= cutoff && 
      MAIN_WAREHOUSES.includes(t.warehouse)
    );
    
    return {
      totalStockCount: 0,
      totalTransactions: filtered.length,
      entriesCount: filtered.filter(t => t.type === 'ENTRADA' && t.operationType === 'MOVIMENTACAO').length,
      exitsCount: filtered.filter(t => t.type === 'SAIDA' && t.operationType === 'MOVIMENTACAO').length,
    };
  }, [transactions, timeFilter]);

  const handleUpdateMinStock = (code: string, newMin: number) => {
    setTransactions(prev => prev.map(t => {
      if (t.code === code) {
        return { ...t, minStock: newMin };
      }
      return t;
    }));
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'timestamp'>) => {
    const mainTx: Transaction = { ...newTx, id: crypto.randomUUID(), timestamp: Date.now() };
    const newBatch = [mainTx];
    
    if (newTx.type === 'SAIDA' && newTx.destinationWarehouse && newTx.operationType === 'MOVIMENTACAO') {
      const transferTx: Transaction = { 
        ...newTx, id: crypto.randomUUID(), timestamp: Date.now() + 1, 
        type: 'ENTRADA', warehouse: newTx.destinationWarehouse, 
        destinationWarehouse: undefined, address: newTx.address 
      };
      newBatch.push(transferTx);
    }
    
    setTransactions(prev => [...newBatch, ...prev]);
    setView('HISTORY');
    setPrefill(undefined);
  };

  const handleUpdateTransaction = (id: string, updatedTx: Omit<Transaction, 'id' | 'timestamp'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTx, updatedAt: Date.now(), updatedBy: 'Admin' } : t));
    setEditingTransaction(null);
    setView('HISTORY');
  };

  const handleActionMove = (code: string, warehouse: string, address?: string) => {
    setPrefill({ code, warehouse, address });
    setEditingTransaction(null);
    setView('FORM');
  };

  const NavButton = ({ id, icon: Icon, label, active }: any) => (
    <button onClick={() => { setView(id); setIsMobileMenuOpen(false); if(id==='FORM'){setEditingTransaction(null); setPrefill(undefined);} }}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold text-sm ${active ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
      <Icon size={20} className={active ? 'text-primary-600' : 'text-slate-400'} /> <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary-600 text-white p-1.5 rounded-lg shadow-lg shadow-primary-500/20"><BarChart3 size={20} /></div>
          <span className="font-black text-slate-800 tracking-tight text-sm uppercase">Kardex Agro</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-100 rounded-lg text-slate-600 active:scale-95 transition-all"><Menu size={20} /></button>
      </div>

      {/* SIDEBAR */}
      <aside className={`fixed md:sticky md:top-0 h-screen w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-out shadow-2xl md:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-primary-600 text-white p-2 rounded-xl shadow-lg shadow-primary-500/30"><BarChart3 size={24} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">Agrosystem</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Kardex Pro</p>
            </div>
          </div>
          <nav className="space-y-1 flex-1">
            <NavButton id="DASHBOARD" icon={LayoutDashboard} label="Dashboard" active={view === 'DASHBOARD'} />
            <NavButton id="STOCK" icon={Package} label="Saldo em Estoque" active={view === 'STOCK'} />
            <NavButton id="INVENTORY" icon={ClipboardList} label="Inventário Físico" active={view === 'INVENTORY'} />
            <NavButton id="FORM" icon={Plus} label="Novo Lançamento" active={view === 'FORM'} />
            <NavButton id="HISTORY" icon={List} label="Histórico" active={view === 'HISTORY'} />
          </nav>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <NavButton id="SETTINGS" icon={SettingsIcon} label="Configurações" active={view === 'SETTINGS'} />
          </div>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-slate-50/50 relative">
        <div className="max-w-7xl mx-auto space-y-8 h-full flex flex-col">
          {/* HEADER PADRÃO GOVERNANÇA */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">
                {view === 'DASHBOARD' ? 'Visão Geral' : 
                 view === 'STOCK' ? 'Saldo Consolidado (01, 20, 22)' : 
                 view === 'INVENTORY' ? 'Inventários Físicos' :
                 view === 'FORM' ? 'Movimentação Manual' : 
                 view === 'HISTORY' ? 'Histórico Kardex' : 'Painel de Configurações'}
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                 <span className="w-6 h-px bg-slate-200"></span>
                 Gestão Logística e Governança
              </p>
            </div>
            {view === 'DASHBOARD' && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm self-start">
                <Clock size={16} className="ml-3 mr-2 text-slate-300" />
                {[7, 15, 30, 90].map((v) => (
                  <button key={v} onClick={() => setTimeFilter(v as TimeFilter)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${timeFilter === v ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{v} DIAS</button>
                ))}
              </div>
            )}
          </header>

          <div className="flex-1 min-h-0">
            {view === 'DASHBOARD' && (
              <div className="space-y-8 pb-10">
                <CriticalAlerts criticalItems={criticalItems} onAction={(code) => handleActionMove(code, '01')} />
                <StatsCards stats={stats} periodLabel={`${timeFilter} dias`} />
                <Dashboard transactions={transactions} />
              </div>
            )}
            {view === 'STOCK' && <StockBalance transactions={transactions} onMove={handleActionMove} onUpdateMinStock={handleUpdateMinStock} />}
            {view === 'INVENTORY' && <InventoryModule currentUser={users[0]} />}
            {view === 'HISTORY' && <TransactionHistory transactions={transactions} onDelete={(id) => setTransactions(t => t.filter(x => x.id !== id))} onEdit={(t) => { setEditingTransaction(t); setView('FORM'); }} />}
            {view === 'FORM' && <MovementForm onAdd={handleAddTransaction} onUpdate={handleUpdateTransaction} onCancel={() => setView('STOCK')} transactions={transactions} initialData={editingTransaction} prefill={prefill} />}
            {view === 'SETTINGS' && (
              <Settings 
                users={users} onSaveUsers={setUsers} onWipeData={() => { wipeTransactions(); setTransactions([]); }} 
                onRestoreData={(json) => { if (restoreBackup(json)) { setTransactions(loadTransactions()); alert('Sucesso!'); } }} 
                onBackup={() => exportToJson(transactions)}
                onImportExcel={() => { setView('STOCK'); fileInputRef.current?.click(); }}
                onExportKardex={() => exportToExcel(transactions)}
              />
            )}
          </div>
        </div>
      </main>

      {/* FAB MOBILE */}
      {view !== 'FORM' && view !== 'INVENTORY' && (
        <button
          onClick={() => { setEditingTransaction(null); setPrefill(undefined); setView('FORM'); }}
          className="md:hidden fixed bottom-6 right-6 z-50 bg-primary-600 text-white p-4 rounded-full shadow-2xl shadow-primary-600/40 active:scale-90 transition-all border-4 border-white flex items-center justify-center"
        >
          <Plus size={28} />
        </button>
      )}

      <input type="file" ref={fileInputRef} onChange={async (e) => {
        const file = e.target.files?.[0];
        if(file) {
          const data = await importFromExcel(file);
          setTransactions([...data, ...transactions]);
        }
      }} accept=".xlsx, .xls" className="hidden" />
    </div>
  );
}

export default App;
