
import { Transaction, User, InventorySession } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'kardex_pro_v3_data';
const USERS_KEY = 'kardex_pro_v3_users';
const INVENTORY_SESSIONS_KEY = 'kardex_pro_v3_inventory_sessions';
const LAST_BACKUP_KEY = 'kardex_last_auto_backup';

// ============ TRANSACTIONS ============

export const loadTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load data", error);
    return [];
  }
};

export const saveTransactions = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    // Sync to cloud in background
    if (isSupabaseConfigured()) {
      syncTransactionsToCloud(transactions).catch(console.error);
    }
  } catch (error) {
    console.error("Failed to save data", error);
    alert("Erro ao salvar dados! O armazenamento local pode estar cheio.");
  }
};

// Sync transactions to Supabase
const syncTransactionsToCloud = async (transactions: Transaction[]) => {
  if (!isSupabaseConfigured()) return;

  try {
    // Convert camelCase to snake_case for Supabase
    const formatted = transactions.map(t => ({
      id: t.id,
      date: t.date,
      code: t.code,
      name: t.name,
      type: t.type,
      operation_type: t.operationType,
      quantity: t.quantity,
      unit: t.unit,
      min_stock: t.minStock,
      warehouse: t.warehouse,
      destination_warehouse: t.destinationWarehouse,
      destination_address: t.destAddress,
      address: t.address,
      responsible: t.responsible,
      photos: t.photos,
      timestamp: t.timestamp,
      updated_at: t.updatedAt,
      updated_by: t.updatedBy
    }));

    const { error } = await supabase
      .from('transactions')
      .upsert(formatted, { onConflict: 'id' });

    if (error) {
      console.error('Sync error:', error);
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
};

// Load from Supabase
export const loadTransactionsFromCloud = async (): Promise<Transaction[] | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Load from cloud error:', error);
      return null;
    }

    // Convert snake_case to camelCase
    return data?.map(t => ({
      id: t.id,
      date: t.date,
      code: t.code,
      name: t.name,
      type: t.type,
      operationType: t.operation_type,
      quantity: t.quantity,
      unit: t.unit,
      minStock: t.min_stock,
      warehouse: t.warehouse,
      destinationWarehouse: t.destination_warehouse,
      destAddress: t.destination_address,
      address: t.address,
      responsible: t.responsible,
      photos: t.photos || [],
      timestamp: t.timestamp,
      updatedAt: t.updated_at,
      updatedBy: t.updated_by
    })) || [];
  } catch (err) {
    console.error('Load from cloud failed:', err);
    return null;
  }
};

// ============ INVENTORY SESSIONS ============

export const loadInventorySessions = (): InventorySession[] => {
  try {
    const data = localStorage.getItem(INVENTORY_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

export const saveInventorySessions = (sessions: InventorySession[]) => {
  localStorage.setItem(INVENTORY_SESSIONS_KEY, JSON.stringify(sessions));
  // Sync to cloud
  if (isSupabaseConfigured()) {
    syncInventorySessionsToCloud(sessions).catch(console.error);
  }
};

// Sync inventory sessions to Supabase
const syncInventorySessionsToCloud = async (sessions: InventorySession[]) => {
  if (!isSupabaseConfigured()) return;

  try {
    const formatted = sessions.map(s => ({
      id: s.id,
      name: s.name,
      responsible: s.responsible,
      created_at: s.createdAt,
      closed_at: s.closedAt,
      status: s.status,
      items: s.items
    }));

    const { error } = await supabase
      .from('inventory_sessions')
      .upsert(formatted, { onConflict: 'id' });

    if (error) {
      console.error('Inventory sync error:', error);
    }
  } catch (err) {
    console.error('Inventory sync failed:', err);
  }
};

// Load inventory sessions from Supabase
export const loadInventorySessionsFromCloud = async (): Promise<InventorySession[] | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('inventory_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Load inventory from cloud error:', error);
      return null;
    }

    return data?.map(s => ({
      id: s.id,
      name: s.name,
      responsible: s.responsible,
      createdAt: s.created_at,
      closedAt: s.closed_at,
      status: s.status,
      items: s.items || []
    })) || [];
  } catch (err) {
    console.error('Load inventory from cloud failed:', err);
    return null;
  }
};

// ============ USERS ============

export const loadUsers = (): User[] => {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [
      { id: 'admin-01', name: 'Administrador Nano', password: 'admin', profile: 'ADMIN', active: true, lastLogin: Date.now() }
    ];
  } catch (error) {
    return [];
  }
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Sync to cloud
  if (isSupabaseConfigured()) {
    syncUsersToCloud(users).catch(console.error);
  }
};

// Sync users to Supabase
const syncUsersToCloud = async (users: User[]) => {
  if (!isSupabaseConfigured()) return;

  try {
    const formatted = users.map(u => ({
      id: u.id,
      name: u.name,
      password: u.password,
      profile: u.profile,
      active: u.active,
      last_login: u.lastLogin
    }));

    const { error } = await supabase
      .from('users')
      .upsert(formatted, { onConflict: 'id' });

    if (error) {
      console.error('Users sync error:', error);
    }
  } catch (err) {
    console.error('Users sync failed:', err);
  }
};

// Load users from Supabase
export const loadUsersFromCloud = async (): Promise<User[] | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Load users from cloud error:', error);
      return null;
    }

    return data?.map(u => ({
      id: u.id,
      name: u.name,
      password: u.password,
      profile: u.profile,
      active: u.active,
      lastLogin: u.last_login
    })) || [];
  } catch (err) {
    console.error('Load users from cloud failed:', err);
    return null;
  }
};

// ============ AUTO BACKUP (17:45 daily, 7 days retention) ============

export const createAutoBackup = async () => {
  if (!isSupabaseConfigured()) return;

  try {
    const transactions = loadTransactions();
    const users = loadUsers();
    const inventorySessions = loadInventorySessions();

    const backupData = {
      id: crypto.randomUUID(),
      created_at: Date.now(),
      transactions,
      users,
      inventory_sessions: inventorySessions
    };

    const { error } = await supabase
      .from('backups')
      .insert(backupData);

    if (error) {
      console.error('Auto backup error:', error);
    } else {
      console.log('✅ Backup automático criado:', new Date().toLocaleString());
      localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
      // Clean old backups
      await cleanOldBackups();
    }
  } catch (err) {
    console.error('Auto backup failed:', err);
  }
};

const cleanOldBackups = async () => {
  if (!isSupabaseConfigured()) return;

  try {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('backups')
      .delete()
      .lt('created_at', sevenDaysAgo);

    if (error) {
      console.error('Clean old backups error:', error);
    }
  } catch (err) {
    console.error('Clean old backups failed:', err);
  }
};

// Schedule auto backup at 17:45 every day
export const scheduleAutoBackup = () => {
  const checkAndBackup = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check if it's 17:45
    if (hours === 17 && minutes === 45) {
      const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
      const today = new Date().toDateString();
      const lastBackupDate = lastBackup ? new Date(parseInt(lastBackup)).toDateString() : '';

      // Only backup once per day
      if (lastBackupDate !== today) {
        createAutoBackup();
      }
    }
  };

  // Check every minute
  setInterval(checkAndBackup, 60 * 1000);

  // Also check immediately on load
  checkAndBackup();

  console.log('📅 Backup automático agendado para 17:45');
};

// ============ ADMINISTRATIVE ============

export const wipeTransactions = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const restoreBackup = (jsonData: string) => {
  try {
    const data = JSON.parse(jsonData);
    if (Array.isArray(data)) {
      saveTransactions(data);
      return true;
    }
    // Support full backup format
    if (data.transactions) {
      saveTransactions(data.transactions);
      if (data.users) saveUsers(data.users);
      if (data.inventory_sessions) saveInventorySessions(data.inventory_sessions);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const exportToJson = (transactions: Transaction[]) => {
  // Export full backup with all data
  const fullBackup = {
    transactions,
    users: loadUsers(),
    inventory_sessions: loadInventorySessions(),
    exported_at: new Date().toISOString()
  };
  const dataStr = JSON.stringify(fullBackup, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_nano_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
