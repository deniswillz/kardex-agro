import React, { useMemo, useState } from 'react';
import { Transaction, InventoryItem, WAREHOUSES } from '../types';
import { Search, Package, ArrowRight, AlertTriangle, MapPin, Edit3, Save, X, ArrowUpCircle, ArrowDownCircle, ClipboardList, MoveHorizontal, PackageSearch, Clock, Calendar, Camera, Plus, Trash2 } from 'lucide-react';
import { saveTransaction } from '../services/storage';
import { formatLocalDate } from '../services/dateUtils';
import { compressImage } from '../services/imageUtils';

interface StockBalanceProps {
  stockItems: InventoryItem[];
  onQuickAction: (code: string, warehouse: string, address?: string) => void;
  transactions: Transaction[];
  onUpdateTransactions: (transactions: Transaction[], changedItems?: Transaction[]) => void;
  isRefreshing?: boolean;
}

const MAIN_WAREHOUSES = ['01', '20', '22'];

interface ProductDetailsPopupProps {
  item: InventoryItem;
  transactions: Transaction[];
  onClose: () => void;
  onUpdateTransactions: (transactions: Transaction[]) => void;
}

const ProductDetailsPopup: React.FC<ProductDetailsPopupProps> = ({ item, transactions, onClose, onUpdateTransactions }) => {
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Get all unique photos for this product from history
  const productPhotos = useMemo(() => {
    const photosSet = new Set<string>();
    transactions
      .filter(t => t.code === item.code && t.photos && t.photos.length > 0)
      .forEach(t => t.photos.forEach(p => photosSet.add(p)));
    return Array.from(photosSet);
  }, [item.code, transactions]);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = reader.result as string;
        const compressed = await compressImage(base64Str, 800, 0.7);

        // Create a new CONTAGEM transaction with the photo to save it in product history
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          code: item.code,
          name: item.name,
          type: 'ENTRADA', // Neutral type for count
          operationType: 'CONTAGEM',
          quantity: item.balance, // Keep current balance
          unit: item.unit,
          minStock: item.minStock,
          warehouse: item.warehouse,
          address: item.address,
          responsible: 'Sistema (Foto)',
          photos: [compressed],
          timestamp: Date.now()
        };

        const updated = [...transactions, newTx];
        onUpdateTransactions(updated, [newTx]);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error adding photo:', error);
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = (photoToDelete: string) => {
    if (confirm('Deseja realmente apagar esta foto?')) {
      const changed: Transaction[] = [];
      const updated = transactions.map(t => {
        if (t.code === item.code && t.photos && t.photos.includes(photoToDelete)) {
          const mod = {
            ...t,
            photos: t.photos.filter(p => p !== photoToDelete)
          };
          changed.push(mod);
          return mod;
        }
        return t;
      });
      onUpdateTransactions(updated, changed);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{item.name}</h3>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-tighter">{item.code}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Total</p>
              <p className="text-lg font-black text-slate-900 break-words">{item.balance} <span className="text-xs uppercase">{item.unit}</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localização</p>
              <p className="text-xs font-black text-slate-900 uppercase break-words leading-tight">{item.warehouse} - {item.address || 'Geral'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estoque Mín.</p>
              <p className="text-lg font-black text-slate-900">{item.minStock || 0}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Últ. Contagem</p>
              <p className="text-xs font-black text-slate-900">{formatLocalDate(item.lastCount)}</p>
            </div>
          </div>

          {/* Photos Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <Camera size={14} /> Galeria de Fotos
              </h4>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary-100 transition-all disabled:opacity-50"
              >
                {isUploading ? 'Subindo...' : <><Plus size={14} /> Adicionar</>}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAddPhoto}
                accept="image/*"
                className="hidden"
              />
            </div>

            {productPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4">
                {productPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 cursor-pointer hover:border-primary-500 transition-all shadow-sm group relative"
                  >
                    <img src={photo} alt={`Produto ${idx}`} className="w-full h-full object-cover" onClick={() => setExpandedPhoto(photo)} />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100">
                <Camera size={48} className="mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma foto encontrada</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Photo Overlay */}
      {expandedPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-[120] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setExpandedPhoto(null)}
        >
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
            <X size={32} />
          </button>
          <img src={expandedPhoto} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export const StockBalance: React.FC<StockBalanceProps> = ({ stockItems, onQuickAction, transactions, onUpdateTransactions, isRefreshing }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [tempMin, setTempMin] = useState<number>(0);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  const stockData = useMemo(() => {
    const map: Record<string, InventoryItem> = {};
    const lastCounts: Record<string, { date: string, quantity: number, ts: number, balanceAtCount: number }> = {};

    transactions.forEach(t => {
      if (!MAIN_WAREHOUSES.includes(t.warehouse)) return;

      const normalizedAddress = (t.address || '').trim().toUpperCase();
      const key = `${t.code}_${t.warehouse}_${normalizedAddress}`;

      if (!map[key]) {
        map[key] = {
          key, code: t.code, name: t.name, warehouse: t.warehouse, address: t.address || '',
          unit: t.unit || 'UN', balance: 0, minStock: t.minStock || 0,
          lastCount: t.date, isCritical: false, isDivergent: false,
          entries: 0, exits: 0, lastEntry: undefined, lastExit: undefined,
          photos: t.photos || [],
        };
      }

      // Atualiza metadados se a transação for mais recente
      const currentLastCountTs = map[key].lastCount ? new Date(map[key].lastCount).getTime() : 0;
      if (t.timestamp > currentLastCountTs) {
        map[key].name = t.name;
        map[key].minStock = t.minStock || 0;
        map[key].lastCount = t.date;
        if (t.photos && t.photos.length > 0) {
          map[key].photos = t.photos;
        }
      }

      if (t.operationType === 'MOVIMENTACAO') {
        if (t.type === 'ENTRADA') {
          map[key].balance += t.quantity;
          map[key].entries += t.quantity;
          if (!map[key].lastEntry || new Date(t.date) > new Date(map[key].lastEntry!)) {
            map[key].lastEntry = t.date;
          }
        } else {
          map[key].balance -= t.quantity;
          map[key].exits += t.quantity;
          if (!map[key].lastExit || new Date(t.date) > new Date(map[key].lastExit!)) {
            map[key].lastExit = t.date;
          }
        }
      } else if (t.operationType === 'CONTAGEM') {
        const balanceAtCountTime = transactions
          .filter(tx =>
            tx.code === t.code &&
            tx.warehouse === t.warehouse &&
            (tx.address || '').trim().toUpperCase() === normalizedAddress &&
            tx.operationType === 'MOVIMENTACAO' &&
            tx.timestamp <= t.timestamp
          )
          .reduce((acc, tx) => tx.type === 'ENTRADA' ? acc + tx.quantity : acc - tx.quantity, 0);

        if (!lastCounts[key] || t.timestamp > lastCounts[key].ts) {
          lastCounts[key] = { date: t.date, quantity: t.quantity, ts: t.timestamp, balanceAtCount: balanceAtCountTime };
          map[key].lastCount = t.date;
        }
      }
    });

    const globalBalances: Record<string, number> = {};
    const minStocks: Record<string, number> = {};
    Object.values(map).forEach(item => {
      globalBalances[item.code] = (globalBalances[item.code] || 0) + item.balance;
      minStocks[item.code] = Math.max(minStocks[item.code] || 0, item.minStock);
    });

    return Object.values(map).map(item => {
      const lastCountData = lastCounts[item.key];
      const isCritical = minStocks[item.code] > 0 && globalBalances[item.code] <= minStocks[item.code];
      const isDivergent = lastCountData !== undefined && lastCountData.quantity !== lastCountData.balanceAtCount;

      return {
        ...item,
        isCritical,
        isDivergent,
        lastCountQuantity: lastCountData?.quantity
      };
    }).sort((a, b) => a.warehouse.localeCompare(b.warehouse) || a.code.localeCompare(b.code));
  }, [transactions]);

  const filteredData = stockData.filter(item => {
    if (item.balance <= 0) return false;
    const matchesSearch = item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = warehouseFilter === 'ALL' || item.warehouse === warehouseFilter;
    return matchesSearch && matchesWarehouse;
  });

  const handleStartEdit = (code: string, currentMin: number) => {
    setEditingCode(code);
    setTempMin(currentMin);
  };

  const handleSaveMin = async () => {
    if (editingCode !== null) {
      const changed: Transaction[] = [];
      const updated = transactions.map(t => {
        if (t.code === editingCode) {
          const mod = { ...t, minStock: tempMin };
          changed.push(mod);
          return mod;
        }
        return t;
      });
      onUpdateTransactions(updated, changed);
      setEditingCode(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    return formatLocalDate(dateStr);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/30">
        <div className="relative flex-1 max-w-lg flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar SKU ou Descrição Técnica..."
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isRefreshing && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-primary-100 animate-fade-in whitespace-nowrap">
              <div className="w-2 h-2 border-2 border-primary-200 rounded-full animate-spin border-t-primary-600"></div>
              <span className="text-[9px] font-black text-primary-600 uppercase tracking-tighter">Sincronizando...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Armazém:</span>
          <select
            className="bg-white border border-slate-200 rounded-lg text-[10px] font-black px-3 py-2 uppercase outline-none focus:ring-2 focus:ring-primary-500"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="ALL">Todos (01, 20, 22)</option>
            <option value="01">Armazém 01</option>
            <option value="20">Armazém 20</option>
            <option value="22">Armazém 22</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 no-scrollbar p-2 md:p-0">
        <table className="w-full text-left border-collapse min-w-[1200px] hidden md:table">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Código / Produto</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Localização</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">UN</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Últimas Movimentações</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Última Contagem</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Mínimo</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Saldo Atual</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item) => (
              <tr key={item.key} className={`hover:bg-primary-50/30 transition-colors group ${item.isCritical ? 'bg-red-50/20' : 'bg-white'}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedProduct(item)}
                      className={`w-10 h-10 rounded-lg border transition-all hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden ${item.isCritical ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                      title="Ver detalhes e fotos"
                    >
                      {item.photos?.[0] ? <img src={item.photos[0]} className="w-full h-full object-cover" /> : <Package size={20} />}
                    </button>
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{item.name}</div>
                      <div className="text-sm font-mono text-slate-500 uppercase tracking-tight">{item.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className="bg-slate-800 text-white text-xs font-black px-2 py-0.5 rounded-full uppercase">ARM: {item.warehouse}</span>
                    <span className="text-xs text-slate-500 font-bold mt-1 uppercase italic">{item.address || 'Geral'}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-[10px] font-black text-slate-500">{item.unit}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1 items-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <ArrowUpCircle size={12} /> {formatDate(item.lastEntry)}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-red-500">
                      <ArrowDownCircle size={12} /> {formatDate(item.lastExit)}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-black text-slate-600">{formatDate(item.lastCount)}</span>
                    {item.lastCountQuantity !== undefined && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Visto: {item.lastCountQuantity}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <button onClick={() => handleStartEdit(item.code, item.minStock)} className="text-xs font-black text-slate-700 hover:text-primary-600 border-b border-dotted border-slate-300">
                    {item.minStock}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`text-base font-black ${item.isCritical ? 'text-red-600' : 'text-slate-900'}`}>
                      {item.balance}
                    </span>
                    {item.isCritical && <span className="text-[8px] font-black uppercase text-red-500 tracking-widest animate-pulse">Abaixo do Mínimo</span>}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <button onClick={() => onQuickAction(item.code, item.warehouse, item.address)} className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/10 active:scale-95">
                    <MoveHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="md:hidden flex flex-col gap-3 py-2 pb-24 px-1">
          {filteredData.map((item) => (
            <div key={item.key} className={`bg-white border rounded-xl overflow-hidden shadow-sm active:bg-slate-50 transition-colors ${item.isCritical ? 'border-red-100 shadow-red-50' : 'border-slate-200'}`}>
              <div className="p-4 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedProduct(item)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all active:scale-90 overflow-hidden ${item.isCritical ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                  >
                    {item.photos?.[0] ? <img src={item.photos[0]} className="w-full h-full object-cover" /> : <Package size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-black uppercase leading-tight mb-1 break-words line-clamp-2 ${item.isCritical ? 'text-red-700' : 'text-slate-800'}`}>{item.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400 tracking-tighter uppercase">{item.code}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black leading-none ${item.isCritical ? 'text-red-600' : 'text-slate-900'}`}>{item.balance} <span className="text-[9px] font-medium">{item.unit}</span></div>
                  {item.isCritical && <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter animate-pulse">Abaixo do Mínimo</span>}
                </div>
              </div>
              <div className={`p-4 flex flex-col gap-3 ${item.isCritical ? 'bg-red-50/20' : 'bg-slate-50/50'}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Local / Endereço</p>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-slate-800">ARM: {item.warehouse}</span>
                      <span className="text-[10px] font-bold text-slate-500 italic">{item.address || 'Geral'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Contagem</p>
                    <span className="text-[10px] font-black text-slate-600">{formatDate(item.lastCount)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">E: {formatDate(item.lastEntry)}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase">S: {formatDate(item.lastExit)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onQuickAction(item.code, item.warehouse, item.address)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-md flex items-center gap-2"
                  >
                    <MoveHorizontal size={12} /> Movimentar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredData.length === 0 && (
          <div className="p-20 text-center text-slate-400">
            <PackageSearch size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest italic">Estoque não encontrado.</p>
          </div>
        )}
      </div>

      {editingCode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-slide-up">
            <h3 className="text-xs font-black text-slate-800 uppercase mb-4 tracking-widest text-center">Nível de Reposição</h3>
            <div className="space-y-4">
              <input type="number" value={tempMin} onChange={(e) => setTempMin(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-lg font-black outline-none focus:border-primary-500" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setEditingCode(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                <button onClick={handleSaveMin} className="flex-[2] py-3 bg-primary-600 text-white font-black text-[10px] uppercase rounded-xl shadow-lg">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailsPopup
          item={selectedProduct}
          transactions={transactions}
          onClose={() => setSelectedProduct(null)}
          onUpdateTransactions={onUpdateTransactions}
        />
      )}
    </div>
  );
};
