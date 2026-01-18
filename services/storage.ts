
import { Transaction, User, InventorySession } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'kardex_pro_v3_data';
const USERS_KEY = 'kardex_pro_v3_users';
const INVENTORY_SESSIONS_KEY = 'kardex_pro_v3_inventory_sessions';

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
};

// ============ USERS ============

export const loadUsers = (): User[] => {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [
      { id: 'admin-01', name: 'Administrador Agrosystem', profile: 'ADMIN', active: true, lastLogin: Date.now() }
    ];
  } catch (error) {
    return [];
  }
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
    return false;
  } catch (e) {
    return false;
  }
};

export const exportToJson = (transactions: Transaction[]) => {
  const dataStr = JSON.stringify(transactions, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_kardex_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
