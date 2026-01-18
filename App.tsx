import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Package, History, PlusCircle, Settings as SettingsIcon,
    ClipboardList, BarChart3, Menu, X, LogOut, User, Lock
} from 'lucide-react';
import { Transaction, User as UserType } from './types';
import {
    loadTransactions, saveTransactions, loadUsers, saveUsers,
    wipeTransactions, restoreBackup, exportToJson, scheduleAutoBackup
} from './services/storage';
import { importFromExcel, exportToExcel, downloadTemplate } from './services/excel';
import { useStockCalculation } from './hooks/useStockCalculation';

// Components
import { Dashboard } from './components/Dashboard';
import { StatsCards } from './components/StatsCards';
import { StockBalance } from './components/StockBalance';
import { TransactionHistory } from './components/TransactionHistory';
import { MovementForm } from './components/MovementForm';
import { Settings } from './components/Settings';
import { InventoryModule } from './components/InventoryModule';
import { CriticalAlerts } from './components/CriticalAlerts';

type View = 'DASHBOARD' | 'STOCK' | 'HISTORY' | 'NEW' | 'SETTINGS' | 'INVENTORY';

const App: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [view, setView] = useState<View>('DASHBOARD');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [prefillData, setPrefillData] = useState<{ code: string; warehouse: string; address?: string } | undefined>();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loginForm, setLoginForm] = useState({ name: '', password: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial load
    useEffect(() => {
        const savedTransactions = loadTransactions();
        const savedUsers = loadUsers();
        setTransactions(savedTransactions);
        setUsers(savedUsers);

        // Schedule auto backup
        scheduleAutoBackup();
    }, []);

    // Use custom hook for stock calculations
    const { stockItems, criticalItems, stats, timeFilter, setTimeFilter } = useStockCalculation(transactions);

    // Login handler
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.name === loginForm.name && u.password === loginForm.password && u.active);
        if (user) {
            setCurrentUser({ ...user, lastLogin: Date.now() });
            const updatedUsers = users.map(u => u.id === user.id ? { ...u, lastLogin: Date.now() } : u);
            setUsers(updatedUsers);
            saveUsers(updatedUsers);
        } else {
            alert('Usuário ou senha inválidos!');
        }
    };

    // Transaction handlers
    const handleAddTransaction = (data: Omit<Transaction, 'id' | 'timestamp'>) => {
        const newTx: Transaction = {
            ...data,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
        const updated = [...transactions, newTx];
        setTransactions(updated);
        saveTransactions(updated);
        setView('HISTORY');
        setPrefillData(undefined);
    };

    const handleUpdateTransaction = (id: string, data: Omit<Transaction, 'id' | 'timestamp'>) => {
        const updated = transactions.map(t =>
            t.id === id ? { ...t, ...data, updatedAt: Date.now(), updatedBy: currentUser?.name } : t
        );
        setTransactions(updated);
        saveTransactions(updated);
        setEditingTransaction(null);
        setView('HISTORY');
    };

    const handleDeleteTransaction = (id: string) => {
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        saveTransactions(updated);
    };

    const handleEditTransaction = (tx: Transaction) => {
        setEditingTransaction(tx);
        setView('NEW');
    };

    // Import Excel
    const handleImportExcel = async () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const imported = await importFromExcel(file);
                const updated = [...transactions, ...imported];
                setTransactions(updated);
                saveTransactions(updated);
                alert(`${imported.length} registros importados com sucesso!`);
            } catch (err) {
                alert('Erro ao importar arquivo. Verifique o formato.');
            }
        }
        if (e.target) e.target.value = '';
    };

    // Settings handlers
    const handleWipeData = () => {
        wipeTransactions();
        setTransactions([]);
    };

    const handleRestoreData = (json: string) => {
        if (restoreBackup(json)) {
            setTransactions(loadTransactions());
            alert('Backup restaurado com sucesso!');
        } else {
            alert('Erro ao restaurar backup. Verifique o formato do arquivo.');
        }
    };

    const handleBackup = () => {
        exportToJson(transactions);
    };

    const handleExportKardex = () => {
        exportToExcel(transactions);
    };

    // Quick action from stock balance
    const handleQuickAction = (code: string, warehouse: string, address?: string) => {
        setPrefillData({ code, warehouse, address });
        setView('NEW');
    };

    // Login Screen
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-500/30">
                            <Package size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Nano Kardex</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">Sistema de Gestão de Estoque</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                <User size={12} className="inline mr-1" /> Usuário
                            </label>
                            <input
                                type="text"
                                value={loginForm.name}
                                onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                placeholder="Nome do usuário"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                <Lock size={12} className="inline mr-1" /> Senha
                            </label>
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-primary-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all active:scale-[0.98]"
                        >
                            Entrar
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-xs mt-6">
                        Usuário padrão: <strong>admin</strong>
                    </p>
                </div>
            </div>
        );
    }

    // Main App
    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-white p-6 fixed h-full z-30">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                        <Package size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight uppercase">Nano</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kardex System</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'DASHBOARD' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button onClick={() => setView('STOCK')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'STOCK' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <BarChart3 size={18} /> Saldo em Estoque
                    </button>
                    <button onClick={() => setView('HISTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'HISTORY' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <History size={18} /> Histórico
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setPrefillData(undefined); setView('NEW'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'NEW' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <PlusCircle size={18} /> Novo Lançamento
                    </button>
                    <button onClick={() => setView('INVENTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'INVENTORY' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <ClipboardList size={18} /> Inventários Físicos
                    </button>
                    {currentUser?.profile === 'ADMIN' && (
                        <button onClick={() => setView('SETTINGS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'SETTINGS' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                            <SettingsIcon size={18} /> Configurações
                        </button>
                    )}
                </nav>

                <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-black text-sm">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold">{currentUser.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{currentUser.profile}</p>
                        </div>
                    </div>
                    <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all">
                        <LogOut size={14} /> Sair
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-40 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                        <Package size={16} className="text-white" />
                    </div>
                    <span className="font-black text-slate-900 uppercase tracking-tight">Nano</span>
                </div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 bg-slate-900/90 z-50 p-6 animate-fade-in">
                    <div className="flex justify-end mb-6">
                        <button onClick={() => setMobileMenuOpen(false)} className="text-white"><X size={28} /></button>
                    </div>
                    <nav className="space-y-3">
                        <button onClick={() => { setView('DASHBOARD'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-slate-800 text-left">
                            <LayoutDashboard size={20} /> Dashboard
                        </button>
                        <button onClick={() => { setView('STOCK'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-slate-800 text-left">
                            <BarChart3 size={20} /> Saldo em Estoque
                        </button>
                        <button onClick={() => { setView('HISTORY'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-slate-800 text-left">
                            <History size={20} /> Histórico
                        </button>
                        <button onClick={() => { setEditingTransaction(null); setPrefillData(undefined); setView('NEW'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-slate-800 text-left">
                            <PlusCircle size={20} /> Novo Lançamento
                        </button>
                        <button onClick={() => { setView('INVENTORY'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-slate-800 text-left">
                            <ClipboardList size={20} /> Inventários Físicos
                        </button>
                        {currentUser?.profile === 'ADMIN' && (
                            <button onClick={() => { setView('SETTINGS'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-slate-800 text-left">
                                <SettingsIcon size={20} /> Configurações
                            </button>
                        )}
                        <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-red-400 bg-slate-800 text-left mt-8">
                            <LogOut size={20} /> Sair
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 pt-20 lg:pt-0 p-4 lg:p-8 min-h-screen">
                {view === 'DASHBOARD' && (
                    <div className="space-y-6">
                        <StatsCards stats={stats} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <Dashboard transactions={transactions} />
                            </div>
                            <div>
                                <CriticalAlerts items={criticalItems} onAction={handleQuickAction} />
                            </div>
                        </div>
                    </div>
                )}

                {view === 'STOCK' && (
                    <StockBalance
                        stockItems={stockItems}
                        onQuickAction={handleQuickAction}
                        transactions={transactions}
                        onUpdateTransactions={(updated) => { setTransactions(updated); saveTransactions(updated); }}
                    />
                )}

                {view === 'HISTORY' && (
                    <TransactionHistory
                        transactions={transactions}
                        onDelete={handleDeleteTransaction}
                        onEdit={handleEditTransaction}
                    />
                )}

                {view === 'NEW' && (
                    <MovementForm
                        transactions={transactions}
                        onAdd={handleAddTransaction}
                        onUpdate={handleUpdateTransaction}
                        onCancel={() => { setEditingTransaction(null); setPrefillData(undefined); setView('DASHBOARD'); }}
                        initialData={editingTransaction}
                        prefill={prefillData}
                    />
                )}

                {view === 'INVENTORY' && (
                    <InventoryModule currentUser={currentUser} />
                )}

                {view === 'SETTINGS' && currentUser?.profile === 'ADMIN' && (
                    <Settings
                        users={users}
                        onSaveUsers={(updated) => { setUsers(updated); saveUsers(updated); }}
                        onWipeData={handleWipeData}
                        onRestoreData={handleRestoreData}
                        onImportExcel={handleImportExcel}
                        onExportKardex={handleExportKardex}
                        onBackup={handleBackup}
                    />
                )}
            </main>

            {/* Hidden file input for Excel import */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="hidden"
            />

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around z-40 shadow-lg">
                <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${view === 'DASHBOARD' ? 'text-primary-600' : 'text-slate-400'}`}>
                    <LayoutDashboard size={20} />
                    <span className="text-[8px] font-black uppercase">Home</span>
                </button>
                <button onClick={() => setView('STOCK')} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${view === 'STOCK' ? 'text-primary-600' : 'text-slate-400'}`}>
                    <BarChart3 size={20} />
                    <span className="text-[8px] font-black uppercase">Saldo</span>
                </button>
                <button onClick={() => { setEditingTransaction(null); setPrefillData(undefined); setView('NEW'); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-primary-600 text-white -mt-6 shadow-lg shadow-primary-500/30">
                    <PlusCircle size={24} />
                    <span className="text-[8px] font-black uppercase">Novo</span>
                </button>
                <button onClick={() => setView('HISTORY')} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${view === 'HISTORY' ? 'text-primary-600' : 'text-slate-400'}`}>
                    <History size={20} />
                    <span className="text-[8px] font-black uppercase">Histórico</span>
                </button>
                <button onClick={() => setView('INVENTORY')} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${view === 'INVENTORY' ? 'text-primary-600' : 'text-slate-400'}`}>
                    <ClipboardList size={20} />
                    <span className="text-[8px] font-black uppercase">Inventário</span>
                </button>
            </nav>
        </div>
    );
};

export default App;
