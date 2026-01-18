import React, { useState, useRef } from 'react';
import {
  Users, ShieldAlert, Database, Download, Upload, Trash2,
  UserPlus, Shield, ToggleLeft, ToggleRight,
  AlertTriangle, RefreshCcw, FileSpreadsheet, FileJson, Lock
} from 'lucide-react';
import { User, UserProfile, Transaction } from '../types';

interface SettingsProps {
  users: User[];
  onSaveUsers: (users: User[]) => void;
  onWipeData: () => void;
  onRestoreData: (json: string) => void;
  onImportExcel: () => void;
  onExportKardex: () => void;
  onBackup: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  users, onSaveUsers, onWipeData, onRestoreData,
  onImportExcel, onExportKardex, onBackup
}) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'MAINTENANCE' | 'DATA'>('USERS');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleUser = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, active: !u.active } : u);
    onSaveUsers(updated);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const newUser: User = {
      id: editingUser?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      login: formData.get('login') as string,
      password: formData.get('password') as string,
      profile: formData.get('profile') as UserProfile,
      active: true,
      lastLogin: editingUser?.lastLogin
    };

    if (editingUser && editingUser.id) {
      onSaveUsers(users.map(u => u.id === editingUser.id ? newUser : u));
    } else {
      onSaveUsers([...users, newUser]);
    }
    setEditingUser(null);
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => onRestoreData(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row h-full animate-fade-in min-h-[600px]">
      {/* Sidebar Tabs */}
      <div className="w-full lg:w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-2">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Administração</h3>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'USERS' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <Users size={18} /> Gestão de Usuários
        </button>
        <button
          onClick={() => setActiveTab('DATA')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'DATA' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <Database size={18} /> Central de Dados
        </button>
        <button
          onClick={() => setActiveTab('MAINTENANCE')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'MAINTENANCE' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <ShieldAlert size={18} /> Manutenção Crítica
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'USERS' && (
          <div className="space-y-6 animate-slide-up">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Usuários do Sistema</h2>
                <p className="text-xs text-slate-400 font-medium">Controle de acesso e permissões de colaboradores</p>
              </div>
              <button
                onClick={() => setEditingUser({ id: '', name: '', password: '', profile: 'OPERADOR', active: true })}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-primary-700 transition-all shadow-md shadow-primary-500/20"
              >
                <UserPlus size={16} /> Novo Usuário
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {users.map(u => (
                <div key={u.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-primary-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${u.profile === 'ADMIN' ? 'bg-slate-800' : 'bg-primary-500'}`}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        {u.name}
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${u.profile === 'ADMIN' ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-primary-50 text-primary-700 border-primary-100'}`}>
                          {u.profile}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">ID de Acesso: {u.id.split('-')[0]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-black text-slate-300 uppercase">Último Acesso</p>
                      <p className="text-[10px] font-bold text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button onClick={() => handleToggleUser(u.id)} className={`${u.active ? 'text-primary-600' : 'text-slate-300'} transition-colors`}>
                      {u.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                    <button onClick={() => setEditingUser(u)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
                      <Shield size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'DATA' && (
          <div className="space-y-8 animate-slide-up">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Central de Dados</h2>
              <p className="text-xs text-slate-400 font-medium italic">Ferramentas de importação, exportação, backup e relatórios</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary-600 mb-4">
                    <FileSpreadsheet size={24} />
                  </div>
                  <h3 className="font-black text-slate-800 text-sm uppercase mb-2">Importar Saldo Excel</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">Atualize o saldo de estoque via planilha (Colunas A, D, E, I, N, O). Apenas armazéns autorizados (01, 20, 22) serão processados.</p>
                </div>
                <button onClick={onImportExcel} className="w-full bg-white border border-slate-200 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-700 hover:border-primary-500 hover:text-primary-600 transition-all">
                  Selecionar Planilha
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600 mb-4">
                    <Download size={24} />
                  </div>
                  <h3 className="font-black text-slate-800 text-sm uppercase mb-2">Exportar Relatório Kardex</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">Gera um relatório completo de todas as movimentações, saldos anteriores e resultantes para auditoria fiscal e contábil.</p>
                </div>
                <button onClick={onExportKardex} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all">
                  Baixar Relatório Excel
                </button>
              </div>
            </div>

            {/* Backup Manual e Restaurar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 border border-dashed border-slate-200 rounded-2xl bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary-50 rounded-xl text-primary-600"><FileJson size={24} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Backup Manual</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black">Snapshot completo do sistema</p>
                  </div>
                </div>
                <button onClick={onBackup} className="flex items-center gap-2 text-white font-black text-[10px] uppercase bg-primary-600 px-4 py-2 rounded-lg hover:bg-primary-700 transition-all shadow-md">
                  <Download size={14} /> Gerar
                </button>
              </div>

              <div className="p-6 border border-dashed border-slate-200 rounded-2xl bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Upload size={24} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Restaurar Backup</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black">Carregar arquivo JSON</p>
                  </div>
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-white font-black text-[10px] uppercase bg-amber-600 px-4 py-2 rounded-lg hover:bg-amber-700 transition-all shadow-md">
                  <Upload size={14} /> Restaurar
                </button>
              </div>
            </div>

            {/* Auto-backup info */}
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-xs font-bold text-emerald-700">Backup automático ativo: Diariamente às 17:45 (retenção de 7 dias)</p>
            </div>
          </div>
        )}

        {activeTab === 'MAINTENANCE' && (
          <div className="space-y-8 animate-slide-up">
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start gap-4">
              <AlertTriangle className="text-amber-500 shrink-0" size={24} />
              <div>
                <h3 className="text-amber-800 font-black text-sm uppercase mb-1">Área de Risco Administrativo</h3>
                <p className="text-xs text-amber-700 leading-relaxed">As ações nesta seção podem resultar em perda permanente de dados. Recomenda-se realizar um backup completo antes de prosseguir.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between group hover:border-red-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-all"><Trash2 size={24} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Limpeza Total (Wipe Data)</h4>
                    <p className="text-xs text-slate-400">Apaga todas as movimentações e saldos (Reseta o sistema)</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Atenção CRÍTICA: Deseja apagar TODOS os registros do sistema? Esta ação NÃO pode ser desfeita.')) {
                      if (confirm('CONFIRMAÇÃO FINAL: Todos os dados de movimentação serão perdidos. Prosseguir?')) onWipeData();
                    }
                  }}
                  className="px-6 py-2 border border-red-200 text-red-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all"
                >
                  Wipe Data
                </button>
              </div>
            </div>

            {/* Hidden file input for restore - used by Central de Dados */}
            <input type="file" ref={fileInputRef} onChange={handleFileRestore} accept=".json" className="hidden" />
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveUser} className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-primary-50 text-primary-600 rounded-lg"><Users size={20} /></div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">{editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                <input name="name" defaultValue={editingUser.name} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary-500" placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Login (para autenticação)</label>
                <input name="login" defaultValue={editingUser.login || editingUser.name} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-primary-500" placeholder="Ex: joao.silva" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Senha de Acesso</label>
                <div className="relative">
                  <input name="password" type="password" defaultValue={editingUser.password} placeholder="••••••••" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-sm font-bold outline-none focus:border-primary-500" />
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Perfil de Acesso</label>
                <select name="profile" defaultValue={editingUser.profile} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black outline-none focus:border-primary-500">
                  <option value="ADMIN">ADMIN (Controle Total)</option>
                  <option value="OPERADOR">OPERADOR (Entradas/Saídas)</option>
                  <option value="AUDITOR">AUDITOR (Apenas Consulta)</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 rounded-xl transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] py-3 bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary-500/20">Salvar Alterações</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};