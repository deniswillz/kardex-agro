import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Package, History, PlusCircle, Settings as SettingsIcon,
    ClipboardList, BarChart3, Menu, X, LogOut, User, Lock
} from 'lucide-react';
import { Transaction, User as UserType } from './types';
import {
    loadTransactions, saveTransaction, saveTransactions, deleteTransaction, loadUsers, saveUsers,
    wipeTransactions, restoreBackup, exportToJson, scheduleAutoBackup, subscribeToTransactions
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
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial load from Supabase
    useEffect(() => {
        const initializeApp = async () => {
            setIsLoading(true);
            try {
                const [savedTransactions, savedUsers] = await Promise.all([
                    loadTransactions(),
                    loadUsers()
                ]);
                setTransactions(savedTransactions);
                setUsers(savedUsers);

                // Restaurar sessão salva
                const savedSession = localStorage.getItem('kardex_session');
                if (savedSession) {
                    try {
                        const sessionUser = JSON.parse(savedSession);
                        // Verificar se usuário ainda existe e está ativo
                        const validUser = savedUsers.find(u => u.id === sessionUser.id && u.active);
                        if (validUser) {
                            setCurrentUser(validUser);
                        } else {
                            localStorage.removeItem('kardex_session');
                        }
                    } catch {
                        localStorage.removeItem('kardex_session');
                    }
                }
            } catch (err) {
                console.error('Failed to load data:', err);
            } finally {
                setIsLoading(false);
            }
            // Schedule auto backup
            scheduleAutoBackup();
        };
        initializeApp();
    }, []);

    // Função para recarregar dados do Supabase (sincronização)
    const refreshData = async () => {
        try {
            const freshTransactions = await loadTransactions();
            setTransactions(freshTransactions);
        } catch (err) {
            console.error('Erro ao sincronizar dados:', err);
        }
    };

    // Supabase Realtime - Atualiza automaticamente quando outro usuário faz mudanças
    useEffect(() => {
        const unsubscribe = subscribeToTransactions(() => {
            console.log('Recebendo atualização em tempo real...');
            refreshData();
        });

        // Cleanup ao desmontar componente
        return () => {
            unsubscribe();
        };
    }, []);

    // Use custom hook for stock calculations
    const { stockItems, criticalItems, stats, timeFilter, setTimeFilter } = useStockCalculation(transactions);

    // Login handler
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.login === loginForm.name && u.password === loginForm.password && u.active);
        if (user) {
            const loggedUser = { ...user, lastLogin: Date.now() };
            setCurrentUser(loggedUser);
            // Salvar sessão no localStorage
            localStorage.setItem('kardex_session', JSON.stringify(loggedUser));
            const updatedUsers = users.map(u => u.id === user.id ? { ...u, lastLogin: Date.now() } : u);
            setUsers(updatedUsers);
            await saveUsers(updatedUsers);
        } else {
            alert('Login ou senha inválidos!');
        }
    };

    // Transaction handlers
    const MAIN_WAREHOUSES = ['01', '20', '22'];

    const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'timestamp'>) => {
        const newTx: Transaction = {
            ...data,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };

        let updated = [...transactions, newTx];
        await saveTransaction(newTx);

        // Se for SAIDA com destino para armazém principal (01, 20, 22), criar ENTRADA automática
        if (data.type === 'SAIDA' && data.destinationWarehouse && MAIN_WAREHOUSES.includes(data.destinationWarehouse)) {
            const entryTx: Transaction = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                date: data.date,
                code: data.code,
                name: data.name,
                type: 'ENTRADA',
                operationType: 'MOVIMENTACAO',
                quantity: data.quantity,
                unit: data.unit,
                minStock: data.minStock || 0,
                warehouse: data.destinationWarehouse, // Armazém de entrada é o destino
                address: data.destAddress || 'UNICO',
                responsible: data.responsible,
                photos: []
            };
            updated = [...updated, entryTx];
            await saveTransaction(entryTx);
        }

        // Sincronizar com banco após salvar
        await refreshData();
        setView('HISTORY');
        setPrefillData(undefined);
    };

    const handleUpdateTransaction = async (id: string, data: Omit<Transaction, 'id' | 'timestamp'>) => {
        const existingTx = transactions.find(t => t.id === id);
        if (!existingTx) return;

        const updatedTx: Transaction = {
            ...existingTx,
            ...data,
            updatedAt: Date.now(),
            updatedBy: currentUser?.name
        };
        const updated = transactions.map(t => t.id === id ? updatedTx : t);
        await saveTransaction(updatedTx);
        // Sincronizar com banco após salvar
        await refreshData();
        setEditingTransaction(null);
        setView('HISTORY');
    };

    const handleDeleteTransaction = async (id: string) => {
        await deleteTransaction(id);
        // Sincronizar com banco após deletar
        await refreshData();
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
                await saveTransactions(updated);
                alert(`${imported.length} registros importados com sucesso!`);
            } catch (err) {
                alert('Erro ao importar arquivo. Verifique o formato.');
            }
        }
        if (e.target) e.target.value = '';
    };

    // Settings handlers
    const handleWipeData = async () => {
        await wipeTransactions();
        setTransactions([]);
    };

    const handleRestoreData = async (json: string) => {
        const success = await restoreBackup(json);
        if (success) {
            const restored = await loadTransactions();
            setTransactions(restored);
            alert('Backup restaurado com sucesso!');
        } else {
            alert('Erro ao restaurar backup. Verifique o formato do arquivo.');
        }
    };

    const handleBackup = async () => {
        await exportToJson();
    };

    const handleExportKardex = () => {
        exportToExcel(transactions);
    };

    // Quick action from stock balance
    const handleQuickAction = (code: string, warehouse: string, address?: string) => {
        setPrefillData({ code, warehouse, address });
        setView('NEW');
    };

    // Loading Screen
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center mb-4 animate-pulse">
                        <img src="/logo.png" alt="Nano Pro" className="h-20 w-auto" />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Nano Pro</h1>
                    <p className="text-slate-400 text-sm">Carregando dados...</p>
                </div>
            </div>
        );
    }

    // Login Screen
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-primary-600 flex flex-col items-center justify-center p-4">
                {/* Logo e Título */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-6">
                        <img src="/logo.png" alt="Nano Pro" className="h-24 w-auto" />
                    </div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-[0.3em] mt-2">Logística Industrial Inteligente</p>
                </div>

                {/* Card de Login */}
                <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-5">
                    <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            <User size={12} /> Login
                        </label>
                        <input
                            type="text"
                            value={loginForm.name}
                            onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                            className="w-full bg-slate-100 border-0 rounded-lg p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Seu login"
                            required
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            <Lock size={12} /> Senha
                        </label>
                        <input
                            type="password"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="w-full bg-slate-100 border-0 rounded-lg p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary-600 text-white py-4 rounded-lg font-black text-sm uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-[0.98]"
                    >
                        Entrar
                    </button>
                    <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest pt-2">
                        Modo Consulta (Visitante)
                    </p>
                </form>

                {/* Footer */}
                <p className="text-white/50 text-[10px] font-medium uppercase tracking-widest mt-12 text-center">
                    NANO PRO © 2026 - Gestão Industrial de Alta Performance
                </p>
            </div>
        );
    }

    // Main App
    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* TOP HEADER - Verde Escuro */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-primary-600 z-50 flex items-center justify-between px-4 lg:px-6 shadow-md">
                <div className="flex items-center gap-2 lg:gap-3">
                    <img src="/logo.png" alt="Nano Pro" className="h-8 w-auto" />
                </div>
                <div className="flex items-center gap-2 lg:gap-4">
                    <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest hidden sm:block">USUÁRIO NANO</span>
                    <span className="text-xs lg:text-sm text-white font-bold truncate max-w-[100px] lg:max-w-none">{currentUser.name}</span>
                    <div className="w-7 h-7 lg:w-8 lg:h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-black text-xs lg:text-sm flex-shrink-0">
                        {currentUser.name.charAt(0)}
                    </div>
                    <button onClick={() => { localStorage.removeItem('kardex_session'); setCurrentUser(null); }} className="p-2 text-white/70 hover:text-white transition-colors hidden lg:block">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* SIDEBAR - Branca */}
            <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-slate-200 fixed top-14 h-[calc(100vh-56px)] z-30">
                <div className="p-4 border-b border-slate-100 flex flex-col items-center">
                    <img src="/logo.png" alt="Nano Pro" className="h-12 w-auto mb-1" />
                    <p className="text-[9px] font-bold text-primary-600 uppercase tracking-widest">Gestão de Estoque</p>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${view === 'DASHBOARD' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button onClick={() => setView('STOCK')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${view === 'STOCK' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <BarChart3 size={18} /> Saldo em Estoque
                    </button>
                    <button onClick={() => setView('HISTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${view === 'HISTORY' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <History size={18} /> Histórico
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setPrefillData(undefined); setView('NEW'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${view === 'NEW' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <PlusCircle size={18} /> Novo Lançamento
                    </button>
                    <button onClick={() => setView('INVENTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${view === 'INVENTORY' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <ClipboardList size={18} /> Inventários
                    </button>
                    {currentUser?.profile === 'ADMIN' && (
                        <button onClick={() => setView('SETTINGS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${view === 'SETTINGS' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <SettingsIcon size={18} /> Configuração
                        </button>
                    )}
                </nav>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-14 left-0 right-0 bg-white border-b border-slate-200 px-3 py-2 z-40 flex items-center gap-2">
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 -ml-2">
                    {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                <span className="flex-1 text-center text-sm font-black text-slate-700 uppercase tracking-wide">{view === 'DASHBOARD' ? 'Dashboard' : view === 'STOCK' ? 'Estoque' : view === 'HISTORY' ? 'Histórico' : view === 'NEW' ? 'Lançamento' : view === 'INVENTORY' ? 'Inventários' : 'Config'}</span>
                <div className="w-8"></div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 bg-primary-600/95 z-50 p-6 animate-fade-in pt-20">
                    <div className="flex justify-end mb-6">
                        <button onClick={() => setMobileMenuOpen(false)} className="text-white"><X size={28} /></button>
                    </div>
                    <nav className="space-y-3">
                        <button onClick={() => { setView('DASHBOARD'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-white/10 text-left">
                            <LayoutDashboard size={20} /> Dashboard
                        </button>
                        <button onClick={() => { setView('STOCK'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-white/10 text-left">
                            <BarChart3 size={20} /> Saldo em Estoque
                        </button>
                        <button onClick={() => { setView('HISTORY'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-white/10 text-left">
                            <History size={20} /> Histórico
                        </button>
                        <button onClick={() => { setEditingTransaction(null); setPrefillData(undefined); setView('NEW'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-white/10 text-left">
                            <PlusCircle size={20} /> Novo Lançamento
                        </button>
                        <button onClick={() => { setView('INVENTORY'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-white/10 text-left">
                            <ClipboardList size={20} /> Inventários
                        </button>
                        {currentUser?.profile === 'ADMIN' && (
                            <button onClick={() => { setView('SETTINGS'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-white bg-white/10 text-left">
                                <SettingsIcon size={20} /> Configuração
                            </button>
                        )}
                        <button onClick={() => { localStorage.removeItem('kardex_session'); setCurrentUser(null); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-red-300 bg-white/10 text-left mt-8">
                            <LogOut size={20} /> Sair
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 lg:ml-56 mt-14 lg:mt-14 p-4 lg:p-8 pb-24 lg:pb-8 bg-slate-50 min-h-[calc(100vh-56px)]">
                {view === 'DASHBOARD' && (
                    <div className="space-y-6">
                        <StatsCards stats={stats} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <Dashboard transactions={transactions} />
                            </div>
                            <div>
                                <CriticalAlerts items={criticalItems} onAction={handleQuickAction} onNavigateToStock={() => setView('STOCK')} />
                            </div>
                        </div>
                    </div>
                )}

                {view === 'STOCK' && (
                    <StockBalance
                        stockItems={stockItems}
                        onQuickAction={handleQuickAction}
                        transactions={transactions}
                        onUpdateTransactions={async (updated) => { setTransactions(updated); await saveTransactions(updated); }}
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
                        currentUser={currentUser || undefined}
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
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around z-40 shadow-lg">
                <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[56px] ${view === 'DASHBOARD' ? 'text-primary-600' : 'text-slate-400'}`}>
                    <LayoutDashboard size={20} />
                    <span className="text-[9px] font-bold uppercase">Home</span>
                </button>
                <button onClick={() => setView('STOCK')} className={`flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[56px] ${view === 'STOCK' ? 'text-primary-600' : 'text-slate-400'}`}>
                    <BarChart3 size={20} />
                    <span className="text-[9px] font-bold uppercase">Saldo</span>
                </button>
                <button onClick={() => { setEditingTransaction(null); setPrefillData(undefined); setView('NEW'); }} className="flex flex-col items-center gap-0.5 p-2 px-4 rounded-2xl bg-primary-600 text-white -mt-4 shadow-lg shadow-primary-500/30 min-w-[56px]">
                    <PlusCircle size={22} />
                    <span className="text-[9px] font-bold uppercase">Novo</span>
                </button>
                <button onClick={() => setView('HISTORY')} className={`flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[56px] ${view === 'HISTORY' ? 'text-primary-600' : 'text-slate-400'}`}>
                    <History size={20} />
                    <span className="text-[9px] font-bold uppercase">Histórico</span>
                </button>
                <button onClick={() => setView('INVENTORY')} className={`flex flex-col items-center gap-0.5 p-2 rounded-xl min-w-[56px] ${view === 'INVENTORY' ? 'text-primary-600' : 'text-slate-400'}`}>
                    <ClipboardList size={20} />
                    <span className="text-[9px] font-bold uppercase">Inventário</span>
                </button>
            </nav>
        </div>
    );
};

export default App;
