import React, { useState, useEffect } from 'react';
import { X, Package, Ruler, MapPin, AlertTriangle, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { loadPhotosForProduct } from '../services/storage';

interface ProductDetailModalProps {
    product: {
        code: string;
        name: string;
        balance: number;
        unit: string;
        address: string;
        minStock: number;
        photos?: string[];
    };
    onClose: () => void;
    onSaveMinStock: (code: string, newMin: number) => Promise<void>;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onSaveMinStock }) => {
    const [minStock, setMinStock] = useState(product.minStock);
    const [isSaving, setIsSaving] = useState(false);
    const [photos, setPhotos] = useState<string[]>(product.photos || []);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

    useEffect(() => {
        const fetchPhotos = async () => {
            if (photos.length === 0) {
                setIsLoadingPhotos(true);
                try {
                    const loadedPhotos = await loadPhotosForProduct(product.code);
                    setPhotos(loadedPhotos);
                } catch (err) {
                    console.error('Erro ao carregar fotos:', err);
                } finally {
                    setIsLoadingPhotos(false);
                }
            }
        };
        fetchPhotos();
    }, [product.code]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSaveMinStock(product.code, minStock);
            onClose();
        } catch (err) {
            console.error('Erro ao salvar estoque mínimo:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in shadow-2xl">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
                            <Package size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Detalhes do Produto</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Estoque e Fotos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Info Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white font-mono uppercase">{product.code}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço</p>
                            <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white">
                                <MapPin size={12} className="text-primary-600" />
                                <span className="text-sm uppercase tracking-tight">{product.address || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Produto</p>
                        <p className="text-base font-black text-slate-800 dark:text-white leading-tight">{product.name}</p>
                    </div>

                    {/* Balance & Min Stock Section */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Atual</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-black ${product.balance < product.minStock ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'}`}>
                                    {product.balance}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{product.unit}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estoque Mínimo</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={minStock}
                                    onChange={(e) => setMinStock(Number(e.target.value))}
                                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-black text-slate-900 dark:text-white focus:border-primary-600 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos do Produto</p>
                            {isLoadingPhotos && <Loader2 size={12} className="text-primary-600 animate-spin" />}
                        </div>

                        {photos.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {photos.map((photo, idx) => (
                                    <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative group cursor-pointer">
                                        <img
                                            src={photo}
                                            alt={`Produto ${idx + 1}`}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                            onClick={() => window.open(photo, '_blank')}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <ImageIcon size={16} className="text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !isLoadingPhotos ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <ImageIcon size={24} className="text-slate-300 mb-2" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma foto encontrada</p>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-2xl py-4 flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-primary-600/30"
                    >
                        {isSaving ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                <Save size={20} className="font-black" />
                                <span className="text-sm font-black uppercase tracking-widest italic">Salvar Configurações</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
