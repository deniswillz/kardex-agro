import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Package, History, PlusCircle, Settings as SettingsIcon,
    ClipboardList, BarChart3, Menu, X, LogOut, User, Lock, Sun, Moon
} from 'lucide-react';
import { Transaction, User as UserType } from './types';
import {
    loadTransactions, saveTransaction, saveTransactions, upsertTransactions, deleteTransaction, loadUsers, saveUsers,
    wipeTransactions, importBackupFromFile, exportBackupToFile, scheduleAutoBackup, subscribeToTransactions,
    createManualBackup, getBackups, restoreFromCloud, loadInventorySessions, saveInventorySessions,
    unlockAllSessions, broadcastLogoutAll, subscribeToSystemCommands
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('kardex_theme');
        return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });
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

        const handleNavigateToDashboard = () => setView('DASHBOARD');
        window.addEventListener('navigate-to-dashboard', handleNavigateToDashboard);

        const handleBroadcastLogout = () => {
            setCurrentUser(null);
            localStorage.removeItem('loggedUser');
            window.location.reload();
        };

        const unsubscribeSys = subscribeToSystemCommands(handleBroadcastLogout);

        // Cleanup ao desmontar componente
        return () => {
            unsubscribe();
            unsubscribeSys();
            window.removeEventListener('navigate-to-dashboard', handleNavigateToDashboard);
        };
    }, []);

    // Effect for Dark Mode
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('kardex_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('kardex_theme', 'light');
        }
    }, [darkMode]);

    // Use custom hook for stock calculations
    const { stockItems, criticalItems, stats, timeFilter, setTimeFilter } = useStockCalculation(transactions);

    // Login handler
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
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
        } finally {
            setIsProcessing(false);
        }
    };

    // Transaction handlers
    const MAIN_WAREHOUSES = ['01', '20', '22'];

    const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'timestamp'>) => {
        setIsProcessing(true);
        try {
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
        } catch (err) {
            console.error('Error adding transaction:', err);
            alert('Erro ao salvar movimentação.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateTransaction = async (id: string, data: Omit<Transaction, 'id' | 'timestamp'>) => {
        setIsProcessing(true);
        try {
            const existingTx = transactions.find(t => t.id === id);
            if (!existingTx) return;

            const updatedTx: Transaction = {
                ...existingTx,
                ...data,
                updatedAt: Date.now(),
                updatedBy: currentUser?.name
            };
            await saveTransaction(updatedTx);
            // Sincronizar com banco após salvar
            await refreshData();
            setEditingTransaction(null);
            setView('HISTORY');
        } catch (err) {
            console.error('Error updating transaction:', err);
            alert('Erro ao atualizar movimentação.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('Deseja excluir este registro permanentemente?')) return;
        setIsProcessing(true);
        try {
            await deleteTransaction(id);
            await refreshData();
        } catch (err) {
            alert('Erro ao excluir registro.');
        } finally {
            setIsProcessing(false);
        }
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
            setIsProcessing(true);
            try {
                const imported = await importFromExcel(file);
                const updated = [...transactions, ...imported];
                setTransactions(updated);
                await saveTransactions(updated);
                alert(`${imported.length} registros importados com sucesso!`);
                await refreshData();
            } catch (err) {
                alert('Erro ao importar arquivo. Verifique o formato.');
            } finally {
                setIsProcessing(false);
            }
        }
        if (e.target) e.target.value = '';
    };

    // Settings handlers
    const handleWipeData = async () => {
        if (!confirm('ATENÇÃO: Isso apagará TODOS os dados de movimentação. Continuar?')) return;
        setIsProcessing(true);
        try {
            await wipeTransactions();
            setTransactions([]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImportBackup = async (json: string) => {
        const success = await importBackupFromFile(json);
        if (success) {
            const restored = await loadTransactions();
            setTransactions(restored);
            alert('Backup restaurado com sucesso!');
        } else {
            alert('Erro ao restaurar backup. Verifique o formato do arquivo.');
        }
    };

    const handleUnlockAllSessions = async () => {
        try {
            await unlockAllSessions();
            alert('Todas as sessões foram liberadas com sucesso!');
            refreshData();
        } catch (err) {
            alert('Erro ao liberar sessões.');
        }
    };

    const handleLogoutAll = async () => {
        if (confirm('Deseja realmente deslogar todos os usuários ativos no sistema?')) {
            try {
                await broadcastLogoutAll();
                alert('Comando de logout enviado para todos os terminais.');
            } catch (err) {
                alert('Erro ao enviar comando de logout.');
            }
        }
    };

    const handleExportBackup = async () => {
        await exportBackupToFile();
    };

    const handleFetchBackups = async () => {
        return await getBackups();
    };

    const handleManualBackup = async () => {
        const success = await createManualBackup();
        if (success) {
            alert('Backup (Snapshot) criado com sucesso no Supabase!');
        } else {
            alert('Erro ao criar backup no Supabase.');
        }
    };

    const handleCloudRestore = async (backupId: string) => {
        const success = await restoreFromCloud(backupId);
        if (success) {
            const freshTransactions = await loadTransactions();
            setTransactions(freshTransactions);
            alert('Backup restaurado do Cloud com sucesso!');
        } else {
            alert('Erro ao restaurar backup do Cloud.');
        }
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
                        <img src="/logo.png" alt="Nano Pro" className="h-28 w-auto" />
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
                {/* Container centralizado */}
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
                    {/* Logo e Título */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center mb-6">
                            <img src="/logo.png" alt="Nano Pro" className="h-32 w-auto" />
                        </div>
                        <p className="text-white/80 text-[10px] sm:text-xs font-semibold tracking-[0.3em] uppercase">Logística Industrial Inteligente</p>
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
                                className="w-full bg-slate-100 border-0 rounded-lg p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#006B47]"
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
                                className="w-full bg-slate-100 border-0 rounded-lg p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#006B47]"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#006B47] text-white py-4 rounded-lg font-black text-sm uppercase tracking-widest hover:bg-[#005538] transition-all active:scale-[0.98] disabled:opacity-70"
                        >
                            Entrar
                        </button>
                        <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest pt-2">
                            <button type="button" className="hover:text-[#006B47] transition-all">Modo Consulta (Visitante)</button>
                        </p>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-white/60 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] mt-12 text-center">
                    Nano Pro © 2026 - Gestão Industrial de Alta Performance
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
                    <img src="/logo.png" alt="Nano Pro" className="h-10 lg:h-12 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
                </div>
                <div className="flex items-center gap-2 lg:gap-4">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 text-white/70 hover:text-white transition-colors"
                        title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
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
            <aside className="hidden lg:flex flex-col w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed top-14 h-[calc(100vh-56px)] z-30">
                {/* Header com KARDEX em Card */}
                <div className="px-4 pt-5 pb-4">
                    <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-4 shadow-lg shadow-primary-600/20">
                        <h2 className="text-xl font-black text-white uppercase tracking-[0.15em] text-center">KARDEX</h2>
                        <p className="text-[9px] font-medium text-white/70 uppercase tracking-widest text-center mt-1">Gestão de Estoque</p>
                    </div>
                </div>

                {/* Menu de navegação */}
                <nav className="flex-1 px-4 space-y-1">
                    <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wide transition-all ${view === 'DASHBOARD' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <Menu size={18} /> DASHBOARD
                    </button>
                    <button onClick={() => setView('STOCK')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wide transition-all ${view === 'STOCK' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <BarChart3 size={18} /> SALDO EM ESTOQUE
                    </button>
                    <button onClick={() => setView('HISTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wide transition-all ${view === 'HISTORY' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <History size={18} /> HISTÓRICO
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setPrefillData(undefined); setView('NEW'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wide transition-all ${view === 'NEW' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <PlusCircle size={18} /> NOVO LANÇAMENTO
                    </button>
                    <button onClick={() => setView('INVENTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wide transition-all ${view === 'INVENTORY' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <ClipboardList size={18} /> INVENTÁRIOS
                    </button>
                </nav>

                {/* Configuração separada no rodapé */}
                {currentUser?.profile === 'ADMIN' && (
                    <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => setView('SETTINGS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wide transition-all ${view === 'SETTINGS' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            <SettingsIcon size={18} /> CONFIGURAÇÃO
                        </button>
                    </div>
                )}
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
            <main className="flex-1 lg:ml-60 mt-[92px] lg:mt-14 p-4 lg:p-8 pb-24 lg:pb-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-56px)]">
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
                        onUpdateTransactions={async (updated, changed) => {
                            setTransactions(updated);
                            if (changed && changed.length > 0) {
                                await upsertTransactions(changed);
                            } else {
                                await saveTransactions(updated);
                            }
                        }}
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
                        onImportBackup={handleImportBackup}
                        onImportExcel={handleImportExcel}
                        onExportKardex={handleExportKardex}
                        onExportBackup={handleExportBackup}
                        onManualBackup={handleManualBackup}
                        onCloudRestore={handleCloudRestore}
                        onFetchBackups={getBackups}
                        onUnlockAllSessions={handleUnlockAllSessions}
                        onLogoutAll={handleLogoutAll}
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

            {/* Global Loader Overlay */}
            {isProcessing && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[200] flex items-center justify-center animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 animate-slide-up">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-primary-100 dark:border-slate-800 rounded-full animate-spin border-t-primary-600"></div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Sincronizando</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Aguarde um momento...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
