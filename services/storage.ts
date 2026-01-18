
import { Transaction, User, InventorySession } from '../types';

const STORAGE_KEY = 'kardex_pro_v3_data';
const USERS_KEY = 'kardex_pro_v3_users';
const INVENTORY_SESSIONS_KEY = 'kardex_pro_v3_inventory_sessions';

// Load initial transactions
export const loadTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load data", error);
    return [];
  }
};

// Save transactions
export const saveTransactions = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Failed to save data", error);
    alert("Erro ao salvar dados! O armazenamento local pode estar cheio.");
  }
};

// Inventory Sessions Storage
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

// User Storage Functions
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

// Administrative Actions
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
