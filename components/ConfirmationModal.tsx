import React from 'react';
import { AlertTriangle, CheckCircle, X, Trash2, ClipboardCheck } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'success';
    pendingCount?: number;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    pendingCount
}) => {
    if (!isOpen) return null;

    const colorClasses = {
        warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            icon: 'bg-amber-100 text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20',
            accent: 'text-amber-600'
        },
        danger: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: 'bg-red-100 text-red-600',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
            accent: 'text-red-600'
        },
        success: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            icon: 'bg-emerald-100 text-emerald-600',
            button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
            accent: 'text-emerald-600'
        }
    };

    const colors = colorClasses[type];

    const IconComponent = type === 'danger' ? Trash2 : type === 'success' ? ClipboardCheck : AlertTriangle;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl border ${colors.border} overflow-hidden transform transition-all scale-100 animate-slide-up`}>
                {/* Header */}
                <div className={`p-6 ${colors.bg} border-b ${colors.border}`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${colors.icon}`}>
                            <IconComponent size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                            <p className="text-sm text-slate-600 mt-1">{message}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Pending count warning */}
                    {pendingCount !== undefined && pendingCount > 0 && (
                        <div className="mt-4 p-3 bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-3">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                            <p className="text-xs font-bold text-amber-800">
                                Existem <span className="text-lg font-black">{pendingCount}</span> itens ainda pendentes (não conferidos).
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50 flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-5 py-3 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${colors.button}`}
                    >
                        <IconComponent size={16} />
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
