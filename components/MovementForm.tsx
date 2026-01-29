
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, QrCode, X, Save, ArrowLeft, User, Calendar, MapPin, Hash, Package, AlertCircle, ArrowRightLeft, Send, LogOut, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { Transaction, MovementType, OperationType, WAREHOUSES, User as UserType } from '../types';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface MovementFormProps {
  onAdd: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  onUpdate?: (id: string, transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  onCancel?: () => void;
  transactions: Transaction[];
  initialData?: Transaction | null;
  prefill?: { code: string; warehouse: string; address?: string };
  currentUser?: UserType;
}

interface AlertModal {
  show: boolean;
  type: 'error' | 'warning' | 'success';
  title: string;
  message: string;
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
  const [destAddress, setDestAddress] = useState('UNICO');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<AlertModal>({ show: false, type: 'error', title: '', message: '' });
  const [showQrScanner, setShowQrScanner] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const showAlert = (type: 'error' | 'warning' | 'success', title: string, message: string) => {
    setAlertModal({ show: true, type, title, message });
  };

  // QR Code Scanner Functions
  const startQrScanner = useCallback(async () => {
    setShowQrScanner(true);

    // Aguarda o DOM atualizar
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Sucesso - código lido
            setCode(decodedText.toUpperCase());
            stopQrScanner();
            showAlert('success', 'QR Code Lido!', `Código: ${decodedText}`);
          },
          () => {
            // Erro de leitura (ignorado, continua tentando)
          }
        );
      } catch (err) {
        console.error('Erro ao iniciar scanner:', err);
        showAlert('error', 'Erro na Câmera', 'Não foi possível acessar a câmera. Verifique as permissões.');
        setShowQrScanner(false);
      }
    }, 100);
  }, []);

  const stopQrScanner = useCallback(async () => {
    if (qrScannerRef.current) {
      try {
        const state = qrScannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch (err) {
        console.error('Erro ao parar scanner:', err);
      }
      qrScannerRef.current = null;
    }
    setShowQrScanner(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => { });
      }
    };
  }, []);

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
        if (match.photos && match.photos.length > 0) setPhotos(match.photos);
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

  const optimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1024;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 quality for compression
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = 2 - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];

    for (const file of filesToProcess) {
      try {
        const optimized = await optimizeImage(file);
        setPhotos(prev => [...prev, optimized]);
      } catch (err) {
        console.error('Erro ao otimizar imagem:', err);
      }
    }
  };

  const removePhoto = (index: number) => setPhotos(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || quantity === '' || !originWarehouse) {
      showAlert('warning', 'Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios (*)');
      return;
    }

    if (Number(quantity) <= 0) {
      showAlert('warning', 'Quantidade Inválida', 'A quantidade deve ser maior que zero.');
      return;
    }

    // For SAIDA, require destination warehouse and check stock
    if (type === 'SAIDA' && opType === 'MOVIMENTACAO') {
      if (!destWarehouse) {
        showAlert('warning', 'Destino Obrigatório', 'Por favor, selecione o Armazém de Destino.');
        return;
      }
      // Permite mesmo armazém se os endereços forem diferentes
      if (originWarehouse === destWarehouse && address === destAddress) {
        showAlert('warning', 'Destino Inválido', 'A Origem e o Destino não podem ser o mesmo armazém/endereço. Altere o endereço de destino.');
        return;
      }
      // Verifica se tem saldo suficiente na origem
      if (currentStock !== null && Number(quantity) > currentStock) {
        showAlert('error', 'Saldo Insuficiente', `Não há saldo suficiente para esta operação.\n\n📦 Disponível: ${currentStock} ${unit}\n📤 Solicitado: ${quantity} ${unit}`);
        return;
      }
      if (currentStock === null || currentStock <= 0) {
        showAlert('error', 'Sem Estoque', 'Não há saldo disponível nesta localização para realizar a saída.');
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
              <button type="button" onClick={startQrScanner} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-600 hover:text-primary-800 p-1 bg-primary-50 rounded-lg transition-colors">
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

        {/* PHOTOS - Only for ENTRADA */}
        {type === 'ENTRADA' && opType === 'MOVIMENTACAO' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos do Produto (Máx 2)</label>
              <span className="text-[10px] font-black text-slate-400 uppercase">{photos.length}/2</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 group">
                  <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 2 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50 transition-all"
                >
                  <Camera size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Foto</span>
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
              multiple
            />
          </div>
        )}
        {/* RESPONSIBLE AND DATE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Responsável</label>
            <div className="relative">
              <input type="text" value={currentUser?.name || 'Usuário'} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-500 outline-none cursor-not-allowed pl-10" />
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

      {/* Modal de Alerta Estilizado */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className={`p-6 ${alertModal.type === 'error' ? 'bg-red-50' : alertModal.type === 'warning' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${alertModal.type === 'error' ? 'bg-red-100 text-red-600' : alertModal.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {alertModal.type === 'error' ? <AlertCircle size={28} /> : alertModal.type === 'warning' ? <AlertTriangle size={28} /> : <CheckCircle size={28} />}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${alertModal.type === 'error' ? 'text-red-800' : alertModal.type === 'warning' ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {alertModal.title}
                  </h3>
                  <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                    {alertModal.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-100">
              <button
                onClick={() => setAlertModal({ ...alertModal, show: false })}
                className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all active:scale-[0.98] ${alertModal.type === 'error' ? 'bg-red-600 hover:bg-red-700' : alertModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner QR Code */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-primary-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode size={24} className="text-white" />
                <h3 className="text-white font-black uppercase tracking-tight">Scanner QR Code</h3>
              </div>
              <button onClick={stopQrScanner} className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div id="qr-reader" className="w-full rounded-xl overflow-hidden"></div>
              <p className="text-center text-sm text-slate-500 mt-4">
                Aponte a câmera para o QR Code do produto
              </p>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={stopQrScanner}
                className="w-full py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-black text-sm uppercase tracking-widest text-slate-700 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
