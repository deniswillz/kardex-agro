
import { Transaction, InventorySession, InventorySessionItem } from '../types';

declare const XLSX: any;

const ALLOWED_WAREHOUSES = ['01', '20', '22'];

const checkXLSX = (): boolean => {
  if (typeof XLSX === 'undefined') {
    alert('Erro: Biblioteca Excel não carregada. Verifique sua conexão com a internet e recarregue a página.');
    return false;
  }
  return true;
};

export const downloadTemplate = () => {
  if (!checkXLSX()) return;
  const headers = [
    ["AGROSYSTEM - MODELO DE IMPORTAÇÃO"], // Linha 1: Título/Meta
    ["Armazém", "", "", "Código", "Descrição", "", "", "", "Endereço", "", "", "", "", "UN", "Saldo Atual"], // Linha 2: Cabeçalho
    ["01", "", "", "PROD100", "ITEM EXEMPLO", "", "", "", "PRAT-01-A", "", "", "", "", "UN", "50"] // Linha 3: Dados
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(headers);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo_Importacao");
  XLSX.writeFile(workbook, "Modelo_Kardex_Agrosystem.xlsx");
};

export const exportToExcel = (transactions: Transaction[]) => {
  if (!checkXLSX()) return;
  const data = transactions.map(t => ({
    'Data': t.date,
    'Armazém': t.warehouse,
    'Código': t.code,
    'Descrição': t.name,
    'Tipo': t.type,
    'UN': t.unit,
    'Qtd': t.quantity,
    'Endereço': t.address || ''
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Movimentacoes");
  XLSX.writeFile(workbook, `Kardex_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const importInventoryFromExcel = async (file: File): Promise<InventorySessionItem[]> => {
  if (!checkXLSX()) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const items: InventorySessionItem[] = [];

        // REGRAS: Pular Linha 1 e 2 (Cabeçalhos). Dados começam no índice 2.
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Mapeamento solicitado: A(0), D(3), E(4), I(8), N(13), O(14)
          const warehouse = String(row[0] || '').trim().padStart(2, '0');
          const code = String(row[3] || '').trim();
          const name = String(row[4] || '').trim();
          const address = String(row[8] || '').trim();
          const unit = String(row[13] || 'UN').trim();
          const systemBalance = Number(row[14] || 0);

          if (!code || !name) continue;

          items.push({
            id: crypto.randomUUID(),
            code,
            name,
            warehouse,
            address,
            unit,
            systemBalance,
            countedBalance: null,
            status: 'PENDENTE'
          });
        }
        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const importFromExcel = async (file: File): Promise<Transaction[]> => {
  if (!checkXLSX()) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const validTransactions: Transaction[] = [];

        // REGRAS: Pular Linha 1 e 2.
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Mapeamento: A(0), D(3), E(4), I(8), N(13), O(14)
          const rawWarehouse = String(row[0] || '').trim().padStart(2, '0');
          const code = String(row[3] || '').trim();
          const name = String(row[4] || '').trim();
          const address = String(row[8] || '').trim();
          const unit = String(row[13] || 'UN').trim();
          const quantity = Number(row[14] || 0);

          if (!ALLOWED_WAREHOUSES.includes(rawWarehouse)) continue;
          if (!code || !name) continue;

          validTransactions.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            code,
            name,
            type: 'ENTRADA',
            operationType: 'MOVIMENTACAO',
            quantity,
            unit,
            minStock: 0,
            warehouse: rawWarehouse,
            address,
            photos: [],
            timestamp: Date.now() + i
          });
        }
        resolve(validTransactions);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
