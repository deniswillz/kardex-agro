import { useState, useMemo } from 'react';
import { Transaction, InventoryItem, DashboardStats } from '../types';

const MAIN_WAREHOUSES = ['01', '20', '22'];

type TimeFilter = 7 | 15 | 30 | 90;

interface UseStockCalculationResult {
  stockItems: InventoryItem[];
  criticalItems: InventoryItem[];
  stats: DashboardStats;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
}

export const useStockCalculation = (transactions: Transaction[]): UseStockCalculationResult => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(30);

  const stockItems: InventoryItem[] = useMemo(() => {
    const map: Record<string, InventoryItem> = {};
    const lastCounts: Record<string, { date: string; quantity: number; ts: number; balanceAtCount: number }> = {};

    transactions.forEach((t) => {
      if (!MAIN_WAREHOUSES.includes(t.warehouse)) return;

      const normalizedAddress = (t.address || '').trim().toUpperCase();
      const key = `${t.code}_${t.warehouse}_${normalizedAddress}`;

      if (!map[key]) {
        map[key] = {
          key,
          code: t.code,
          name: t.name,
          warehouse: t.warehouse,
          address: t.address || '',
          unit: t.unit,
          balance: 0,
          minStock: t.minStock || 0,
          lastCount: t.date,
          isCritical: false,
          isDivergent: false,
          entries: 0,
          exits: 0,
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
        // Calcula o saldo do sistema NO MOMENTO da contagem
        // (soma todas as movimentações até esse timestamp)
        const balanceAtCountTime = transactions
          .filter(tx =>
            tx.code === t.code &&
            tx.warehouse === t.warehouse &&
            (tx.address || '').trim().toUpperCase() === (t.address || '').trim().toUpperCase() &&
            tx.operationType === 'MOVIMENTACAO' &&
            tx.timestamp <= t.timestamp
          )
          .reduce((acc, tx) => tx.type === 'ENTRADA' ? acc + tx.quantity : acc - tx.quantity, 0);

        if (!lastCounts[key] || t.timestamp > lastCounts[key].ts) {
          lastCounts[key] = {
            date: t.date,
            quantity: t.quantity,
            ts: t.timestamp,
            balanceAtCount: balanceAtCountTime // Saldo do sistema no momento da contagem
          };
        }
      }
    });

    const globalBalances: Record<string, number> = {};
    const minStocks: Record<string, number> = {};

    Object.values(map).forEach((item) => {
      globalBalances[item.code] = (globalBalances[item.code] || 0) + item.balance;
      minStocks[item.code] = Math.max(minStocks[item.code] || 0, item.minStock);
    });

    return Object.values(map).map((item) => {
      const lastCount = lastCounts[item.key];
      const isCritical = minStocks[item.code] > 0 && globalBalances[item.code] <= minStocks[item.code];
      // Divergência: contagem ≠ saldo do sistema NO MOMENTO da contagem
      // (ignora movimentações posteriores à contagem)
      const isDivergent = lastCount !== undefined && lastCount.quantity !== lastCount.balanceAtCount;

      return {
        ...item,
        isCritical,
        isDivergent,
        lastCountQuantity: lastCount?.quantity,
      };
    });
  }, [transactions]);

  const criticalItems = useMemo(() => {
    const uniqueCodes = new Set<string>();
    const results: InventoryItem[] = [];

    stockItems.forEach((i) => {
      if ((i.isCritical || i.isDivergent) && !uniqueCodes.has(i.code)) {
        uniqueCodes.add(i.code);
        const globalBal = stockItems.filter((x) => x.code === i.code).reduce((acc, curr) => acc + curr.balance, 0);
        results.push({ ...i, balance: globalBal });
      }
    });
    return results;
  }, [stockItems]);

  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - timeFilter);

    const filtered = transactions.filter((t) => new Date(t.date) >= cutoff && MAIN_WAREHOUSES.includes(t.warehouse));

    return {
      totalStockCount: 0,
      totalTransactions: filtered.length,
      entriesCount: filtered.filter((t) => t.type === 'ENTRADA' && t.operationType === 'MOVIMENTACAO').length,
      exitsCount: filtered.filter((t) => t.type === 'SAIDA' && t.operationType === 'MOVIMENTACAO').length,
    };
  }, [transactions, timeFilter]);

  return { stockItems, criticalItems, stats, timeFilter, setTimeFilter };
};
