'use client'

import { useEffect } from 'react'

export default function ModalConfirmacao({ titulo, mensagem, onConfirmar, onCancelar, cor = 'urgente' }) {
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                onCancelar()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onCancelar])

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in"
            onClick={onCancelar}
        >
            <div 
                className="bg-surface border border-border rounded-xl w-full max-w-[360px] p-5 shadow-2xl animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-[15px] font-semibold text-text-primary m-0 mb-2">
                    {titulo}
                </h3>
                <p className="text-[13px] text-text-secondary m-0 mb-5 leading-relaxed">
                    {mensagem}
                </p>
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={onCancelar}
                        className="px-3.5 py-2 text-[12px] font-medium text-text-secondary bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirmar}
                        className={`px-4 py-2 text-[12px] font-medium rounded-lg cursor-pointer border-0 transition-colors ${
                            cor === 'urgente' 
                                ? 'bg-[#DC2626] text-white hover:bg-red-700' 
                                : 'bg-accent text-bg hover:opacity-90'
                        }`}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    )
}
