
import React, { useState, useRef, useEffect } from 'react';
import { Camera, QrCode, X, Save, ArrowLeft, User, Calendar, MapPin, Hash, Package, AlertCircle, ArrowRightLeft, Send, LogOut } from 'lucide-react';
import { Transaction, MovementType, OperationType, WAREHOUSES, User as UserType } from '../types';

interface MovementFormProps {
  onAdd: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  onUpdate?: (id: string, transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  onCancel?: () => void;
  transactions: Transaction[];
  initialData?: Transaction | null;
  prefill?: { code: string; warehouse: string; address?: string };
  currentUser?: UserType;
}

const MAIN_WAREHOUSES = ['01', '20', '22'];

export const MovementForm: React.FC<MovementFormProps> = ({ onAdd, onUpdate, onCancel, transactions, initialData, prefill, currentUser }) => {
  const [type, setType] = useState<MovementType>('ENTRADA');
  const [opType, setOpType] = useState<OperationType>('MOVIMENTACAO');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(0);
  const [unit, setUnit] = useState('UN');
  const [minStock, setMinStock] = useState<number | ''>(0);
  const [originWarehouse, setOriginWarehouse] = useState('');
  const [destWarehouse, setDestWarehouse] = useState('');
  const [address, setAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect warehouse and item info when SKU is entered (for ENTRADA and SAIDA)
  useEffect(() => {
    if (code && (type === 'ENTRADA' || type === 'SAIDA')) {
      // Find the most recent transaction for this SKU in main warehouses
      const match = [...transactions]
        .filter(t => t.code.toUpperCase() === code.toUpperCase() && MAIN_WAREHOUSES.includes(t.warehouse))
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (match) {
        setName(match.name);
        setUnit(match.unit || 'UN');
        setMinStock(match.minStock || 0);
        // Auto-set origin warehouse to last used (only if not prefilled)
        if (!prefill?.warehouse && type === 'ENTRADA') {
          setOriginWarehouse(match.warehouse);
        }
        if (!address && !prefill?.address) setAddress(match.address || '');
      }
    }
  }, [code, type, transactions, prefill]);

  // Calculate current stock
  useEffect(() => {
    if (code && originWarehouse) {
      const normalizedAddress = (address || '').trim().toUpperCase();
      const history = transactions.filter(t =>
        t.code === code &&
        t.warehouse === originWarehouse &&
        (t.address || '').trim().toUpperCase() === normalizedAddress &&
        t.operationType === 'MOVIMENTACAO'
      );
      const bal = history.reduce((acc, curr) =>
        curr.type === 'ENTRADA' ? acc + curr.quantity : acc - curr.quantity, 0);
      setCurrentStock(bal);
    } else {
      setCurrentStock(null);
    }
  }, [code, originWarehouse, address, transactions]);

  // Load initial data or prefill
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setOpType(initialData.operationType);
      setCode(initialData.code);
      setName(initialData.name);
      setQuantity(initialData.quantity);
      setUnit(initialData.unit || 'UN');
      setMinStock(initialData.minStock || 0);
      setOriginWarehouse(initialData.warehouse);
      setDestWarehouse(initialData.destinationWarehouse || '');
      setAddress(initialData.address || '');
      setDate(initialData.date);
      setPhotos(initialData.photos || []);
    } else if (prefill) {
      setCode(prefill.code);
      setOriginWarehouse(prefill.warehouse);
      if (prefill.address) setAddress(prefill.address);
    }
  }, [initialData, prefill]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = 2 - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPhotos(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => setPhotos(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || quantity === '' || !originWarehouse) {
      alert("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }

    if (Number(quantity) <= 0) {
      alert("A quantidade deve ser maior que zero.");
      return;
    }

    // For SAIDA, require destination warehouse
    if (type === 'SAIDA' && opType === 'MOVIMENTACAO') {
      if (!destWarehouse) {
        alert("Por favor, selecione o Armazém de Destino.");
        return;
      }
      // Permite mesmo armazém se os endereços forem diferentes
      if (originWarehouse === destWarehouse && address === destAddress) {
        alert("A Origem e o Destino não podem ser o mesmo armazém/endereço. Altere o endereço de destino.");
        return;
      }
    }

    const formData = {
      date,
      code: code.toUpperCase(),
      name,
      type,
      operationType: opType,
      quantity: Number(quantity),
      unit,
      minStock: Number(minStock || 0),
      warehouse: originWarehouse,
      destinationWarehouse: (type === 'SAIDA' && opType === 'MOVIMENTACAO' && destWarehouse) ? destWarehouse : undefined,
      destAddress: (type === 'SAIDA' && opType === 'MOVIMENTACAO' && destAddress) ? destAddress : undefined,
      address,
      responsible: currentUser?.name || 'Operador',
      photos
    };

    if (initialData && onUpdate) onUpdate(initialData.id, formData);
    else onAdd(formData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-full animate-slide-up max-w-4xl mx-auto">
      {/* TYPE TABS */}
      <div className="flex bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => { setType('ENTRADA'); setOpType('MOVIMENTACAO'); }}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${type === 'ENTRADA' && opType === 'MOVIMENTACAO' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`w-2 h-2 rounded-full ${type === 'ENTRADA' && opType === 'MOVIMENTACAO' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          Entrada
        </button>
        <button
          type="button"
          onClick={() => { setType('SAIDA'); setOpType('MOVIMENTACAO'); }}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${type === 'SAIDA' && opType === 'MOVIMENTACAO' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`w-2 h-2 rounded-full ${type === 'SAIDA' && opType === 'MOVIMENTACAO' ? 'bg-red-500' : 'bg-slate-300'}`} />
          Saída
        </button>
        <button
          type="button"
          onClick={() => { setOpType('CONTAGEM'); setType('ENTRADA'); }}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${opType === 'CONTAGEM' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`w-2 h-2 rounded-full ${opType === 'CONTAGEM' ? 'bg-amber-500' : 'bg-slate-300'}`} />
          Contagem
        </button>
      </div>

      {/* HEADER */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-black text-slate-800 uppercase tracking-tight text-base">
            {opType === 'CONTAGEM' ? 'Registro de Contagem' : type === 'ENTRADA' ? 'Recebimento de Mercadoria' : 'Expedição / Transferência'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {/* SKU AND STOCK */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Código do produto *</label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SKU do Item"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-black outline-none focus:border-primary-500 focus:bg-white transition-all pr-12"
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-600 hover:text-primary-800 p-1 bg-primary-50 rounded-lg transition-colors">
                <QrCode size={20} />
              </button>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Saldo em {originWarehouse || 'Local'}</span>
            <div className="flex items-center gap-2">
              <Package size={16} className="text-slate-300" />
              <span className="text-xl font-black text-slate-900 leading-none">{currentStock ?? '--'}</span>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição Técnica *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-primary-500 focus:bg-white transition-all"
            required
          />
        </div>

        {/* QUANTITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {opType === 'CONTAGEM' ? 'Quantidade Contada *' : 'Quantidade a Movimentar *'}
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-primary-500 transition-all">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-transparent p-3.5 text-lg font-black outline-none"
                required
              />
              <span className="px-4 text-[10px] font-black text-slate-400 uppercase bg-slate-100 h-full flex items-center border-l border-slate-200">{unit}</span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estoque Mínimo (Referência)</label>
            <div className="relative">
              <input
                type="number"
                value={minStock}
                readOnly
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-400 outline-none cursor-not-allowed pl-10"
              />
              <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Alterar apenas na tela de Saldo</p>
          </div>
        </div>

        {/* LOCATION - ENTRADA/CONTAGEM */}
        {(type === 'ENTRADA' || opType === 'CONTAGEM') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Armazém *</label>
              <select
                value={originWarehouse}
                onChange={(e) => setOriginWarehouse(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-black outline-none focus:border-primary-500"
                required
              >
                <option value="">Selecione...</option>
                {WAREHOUSES.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Endereço</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: P-01-A"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-primary-500"
              />
            </div>
          </div>
        )}

        {/* LOCATION - SAIDA (Origem + Destino) */}
        {type === 'SAIDA' && opType === 'MOVIMENTACAO' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Armazém de Origem *</label>
                <select
                  value={originWarehouse}
                  onChange={(e) => setOriginWarehouse(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-black outline-none focus:border-primary-500"
                  required
                >
                  <option value="">Selecione...</option>
                  {WAREHOUSES.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Endereço de Origem</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: P-01-A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* DESTINATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Armazém Destino *</label>
                <select
                  value={destWarehouse}
                  onChange={(e) => setDestWarehouse(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-black outline-none focus:border-primary-500"
                  required
                >
                  <option value="">Selecione o destino...</option>
                  {WAREHOUSES.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Endereço Destino</label>
                <input
                  type="text"
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="Novo Endereço"
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* RESPONSIBLE AND DATE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Responsável</label>
            <div className="relative">
              <input type="text" value="Admin Nano" readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-500 outline-none cursor-not-allowed pl-10" />
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data da Operação</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-primary-500" />
          </div>
        </div>

        {/* SUBMIT */}
        <div className="pt-6 border-t border-slate-100">
          <button
            type="submit"
            className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${opType === 'CONTAGEM' ? 'bg-amber-600 hover:bg-amber-700' :
              type === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
          >
            <Save size={20} />
            {opType === 'CONTAGEM' ? 'Registrar Contagem' : 'Confirmar Registro de Kardex'}
          </button>
        </div>
      </form>
    </div>
  );
};
