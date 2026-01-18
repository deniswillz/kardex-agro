
export type MovementType = 'ENTRADA' | 'SAIDA';
export type OperationType = 'MOVIMENTACAO' | 'CONTAGEM';
export type UserProfile = 'ADMIN' | 'OPERADOR' | 'AUDITOR';

export interface User {
  id: string;
  name: string;
  password?: string;
  profile: UserProfile;
  lastLogin?: number;
  active: boolean;
}

export interface Transaction {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  code: string;
  name: string;
  type: MovementType;
  operationType: OperationType;
  quantity: number;
  unit: string; // UN, KG, CX, etc.
  minStock: number;
  warehouse: string; // Used as Origin in the UI
  destinationWarehouse?: string;
  destAddress?: string; // Endereço de destino para transferências
  address?: string;
  responsible?: string;
  photos: string[];
  timestamp: number;
  updatedAt?: number;
  updatedBy?: string;
}

export interface InventoryItem {
  key: string; // code_warehouse_address
  code: string;
  name: string;
  warehouse: string;
  address: string;
  unit: string;
  balance: number;
  minStock: number;
  lastEntry?: string;
  lastExit?: string;
  lastCount: string; // Date of last transaction
  lastCountQuantity?: number; // Physical quantity from last CONTAGEM
  isCritical: boolean;
  isDivergent: boolean; // True if balance != lastCountQuantity
  entries: number;
  exits: number;
}

export interface InventorySessionItem {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  address: string;
  unit: string;
  systemBalance: number;
  countedBalance: number | null;
  status: 'PENDENTE' | 'CONFERIDO';
}

export interface InventorySession {
  id: string;
  name: string;
  responsible: string;
  createdAt: number;
  closedAt?: number;
  status: 'ABERTO' | 'FINALIZADO';
  items: InventorySessionItem[];
}

export interface DashboardStats {
  totalStockCount: number;
  totalTransactions: number;
  entriesCount: number;
  exitsCount: number;
}

export const WAREHOUSES = [
  { id: '01', name: '01 (Matriz)' },
  { id: '02', name: '02 (Entrada)' },
  { id: '03', name: '03 (Importado)' },
  { id: '04_CH', name: '04 (Chicote)' },
  { id: '04_MC', name: '04 (Mecanica)' },
  { id: '04_EL', name: '04 (Eletronica)' },
  { id: '08', name: '08 (P&D)' },
  { id: '11', name: '11 (Filial)' },
  { id: '19', name: '19 (Qualidade)' },
  { id: '20', name: '20 (Eletronica)' },
  { id: '21', name: '21 (Assistência)' },
  { id: '22', name: '22 (Mecanica)' },
];
