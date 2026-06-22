'use client'

import { useState } from 'react'

export default function ModalNovaConta({ onClose }) {
    const [nome, setNome] = useState('')
    const [banco, setBanco] = useState('')
    const [tipo, setTipo] = useState('Corrente')
    const [saldo, setSaldo] = useState('')

    const lbl = "block text-[12px] text-text-secondary mb-1"
    const inp = "w-full text-[13px] bg-surface hover:bg-surface-hover border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    const handleSalvar = (e) => {
        e.preventDefault()
        // O salvar ao Supabase ficará na Fase 2 completa, ou podemos implementar se o usuário pedir.
        // A UI pediu apenas para "abrir modal com campos".
        alert('Botão salvar acionado (Integração DB pendente na Fase 2)')
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface border border-border rounded-xl w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                    <h2 className="text-[14px] font-semibold text-text-primary m-0">Nova Conta Bancária</h2>
                    <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className="px-5 py-4">
                    <form onSubmit={handleSalvar} className="space-y-4">
                        <div>
                            <label className={lbl}>Nome da Conta</label>
                            <input type="text" className={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Itaú Principal" required />
                        </div>
                        
                        <div>
                            <label className={lbl}>Banco</label>
                            <input type="text" className={inp} value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ex: Itaú" required />
                        </div>

                        <div>
                            <label className={lbl}>Tipo</label>
                            <select className={inp} value={tipo} onChange={e => setTipo(e.target.value)}>
                                <option>Corrente</option>
                                <option>Poupança</option>
                            </select>
                        </div>

                        <div>
                            <label className={lbl}>Saldo Atual</label>
                            <input type="number" step="0.01" className={inp} value={saldo} onChange={e => setSaldo(e.target.value)} placeholder="0.00" required />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
                            <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] text-text-secondary bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" className="px-4 py-1.5 text-[12px] text-bg bg-text-primary hover:bg-text-secondary border-0 rounded-lg cursor-pointer font-medium transition-colors">
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
