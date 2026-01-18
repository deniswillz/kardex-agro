import { Transaction, User, InventorySession } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

// ============ TRANSACTIONS (Supabase Only) ============

export const loadTransactions = async (): Promise<Transaction[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Load transactions error:', error);
      return [];
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
    console.error('Load transactions failed:', err);
    return [];
  }
};

export const saveTransactions = async (transactions: Transaction[]): Promise<void> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured');
    return;
  }

  try {
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
      console.error('Save transactions error:', error);
      throw error;
    }
  } catch (err) {
    console.error('Save transactions failed:', err);
    throw err;
  }
};

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    const formatted = {
      id: transaction.id,
      date: transaction.date,
      code: transaction.code,
      name: transaction.name,
      type: transaction.type,
      operation_type: transaction.operationType,
      quantity: transaction.quantity,
      unit: transaction.unit,
      min_stock: transaction.minStock,
      warehouse: transaction.warehouse,
      destination_warehouse: transaction.destinationWarehouse,
      destination_address: transaction.destAddress,
      address: transaction.address,
      responsible: transaction.responsible,
      photos: transaction.photos,
      timestamp: transaction.timestamp,
      updated_at: transaction.updatedAt,
      updated_by: transaction.updatedBy
    };

    const { error } = await supabase
      .from('transactions')
      .upsert(formatted, { onConflict: 'id' });

    if (error) {
      console.error('Save transaction error:', error);
      throw error;
    }
  } catch (err) {
    console.error('Save transaction failed:', err);
    throw err;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete transaction error:', error);
      throw error;
    }
  } catch (err) {
    console.error('Delete transaction failed:', err);
    throw err;
  }
};

// ============ INVENTORY SESSIONS (Supabase Only) ============

export const loadInventorySessions = async (): Promise<InventorySession[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('inventory_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Load inventory sessions error:', error);
      return [];
    }

    return data?.map(s => ({
      id: s.id,
      name: s.name,
      responsible: s.responsible,
      conferente: s.conferente,
      createdAt: s.created_at,
      closedAt: s.closed_at,
      status: s.status,
      items: s.items || []
    })) || [];
  } catch (err) {
    console.error('Load inventory sessions failed:', err);
    return [];
  }
};

export const saveInventorySessions = async (sessions: InventorySession[]): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    const formatted = sessions.map(s => ({
      id: s.id,
      name: s.name,
      responsible: s.responsible,
      conferente: s.conferente,
      created_at: s.createdAt,
      closed_at: s.closedAt,
      status: s.status,
      items: s.items
    }));

    const { error } = await supabase
      .from('inventory_sessions')
      .upsert(formatted, { onConflict: 'id' });

    if (error) {
      console.error('Save inventory sessions error:', error);
      throw error;
    }
  } catch (err) {
    console.error('Save inventory sessions failed:', err);
    throw err;
  }
};

export const deleteInventorySession = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('inventory_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (err) {
    console.error('Delete inventory session failed:', err);
    throw err;
  }
};

// ============ USERS (Supabase Only) ============

export const loadUsers = async (): Promise<User[]> => {
  if (!isSupabaseConfigured()) {
    // Return default admin if Supabase not configured
    return [{ id: 'admin-01', name: 'admin', password: '!12dfe13dfe', profile: 'ADMIN', active: true, lastLogin: Date.now() }];
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Load users error:', error);
      return [{ id: 'admin-01', name: 'admin', password: '!12dfe13dfe', profile: 'ADMIN', active: true, lastLogin: Date.now() }];
    }

    if (!data || data.length === 0) {
      // Create default admin if no users exist
      const defaultAdmin: User = { id: 'admin-01', name: 'admin', password: '!12dfe13dfe', profile: 'ADMIN', active: true, lastLogin: Date.now() };
      await saveUsers([defaultAdmin]);
      return [defaultAdmin];
    }

    return data.map(u => ({
      id: u.id,
      name: u.name,
      password: u.password,
      profile: u.profile,
      active: u.active,
      lastLogin: u.last_login
    }));
  } catch (err) {
    console.error('Load users failed:', err);
    return [{ id: 'admin-01', name: 'admin', password: '!12dfe13dfe', profile: 'ADMIN', active: true, lastLogin: Date.now() }];
  }
};

export const saveUsers = async (users: User[]): Promise<void> => {
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
      console.error('Save users error:', error);
      throw error;
    }
  } catch (err) {
    console.error('Save users failed:', err);
    throw err;
  }
};

// ============ AUTO BACKUP (17:45 daily, 7 days retention) ============

const LAST_BACKUP_KEY = 'kardex_last_auto_backup';

export const createAutoBackup = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    const transactions = await loadTransactions();
    const users = await loadUsers();
    const inventorySessions = await loadInventorySessions();

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
      await cleanOldBackups();
    }
  } catch (err) {
    console.error('Auto backup failed:', err);
  }
};

const cleanOldBackups = async (): Promise<void> => {
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

export const scheduleAutoBackup = (): void => {
  const checkAndBackup = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours === 17 && minutes === 45) {
      const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
      const today = new Date().toDateString();
      const lastBackupDate = lastBackup ? new Date(parseInt(lastBackup)).toDateString() : '';

      if (lastBackupDate !== today) {
        createAutoBackup();
      }
    }
  };

  setInterval(checkAndBackup, 60 * 1000);
  checkAndBackup();
  console.log('📅 Backup automático agendado para 17:45');
};

// ============ ADMINISTRATIVE ============

export const wipeTransactions = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '');

    if (error) throw error;
  } catch (err) {
    console.error('Wipe transactions failed:', err);
    throw err;
  }
};

export const restoreBackup = async (jsonData: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonData);

    if (Array.isArray(data)) {
      // Just transactions array
      await saveTransactions(data);
      return true;
    }

    // Full backup format
    if (data.transactions) {
      await saveTransactions(data.transactions);
      if (data.users) await saveUsers(data.users);
      if (data.inventory_sessions) await saveInventorySessions(data.inventory_sessions);
      return true;
    }

    return false;
  } catch (e) {
    console.error('Restore backup failed:', e);
    return false;
  }
};

export const exportToJson = async (): Promise<void> => {
  const transactions = await loadTransactions();
  const users = await loadUsers();
  const inventorySessions = await loadInventorySessions();

  const fullBackup = {
    transactions,
    users,
    inventory_sessions: inventorySessions,
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
