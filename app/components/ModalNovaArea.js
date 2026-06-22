'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ModalNovaArea({ onClose, onSalvar }) {
    const [nome, setNome] = useState('')
    const [icone, setIcone] = useState('📁')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    async function handleSalvar(e) {
        e.preventDefault()
        if (!nome.trim()) {
            setErro('O nome da área é obrigatório.')
            return
        }

        setSalvando(true)
        setErro('')

        const slug = nome
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')

        const { data, error } = await supabase
            .from('areas')
            .insert([{ nome: nome.trim(), icone: icone.trim() || '📁', slug }])
            .select()

        setSalvando(false)

        if (error) {
            setErro(error.message)
            return
        }

        if (onSalvar) onSalvar(data[0])
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface border border-border rounded-xl w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                    <h2 className="text-[14px] font-semibold text-text-primary m-0">Novo Projeto</h2>
                    <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSalvar} className="px-5 py-4 space-y-4">
                    <div className="flex gap-3">
                        <div className="w-[60px]">
                            <label className="block text-[11px] text-text-tertiary uppercase tracking-wide mb-1">Ícone</label>
                            <input 
                                value={icone} 
                                onChange={e => setIcone(e.target.value)} 
                                className="w-full px-3 py-2 text-[13px] text-center border border-border rounded-lg bg-bg text-text-primary outline-none focus:border-text-tertiary" 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[11px] text-text-tertiary uppercase tracking-wide mb-1">Nome do Projeto *</label>
                            <input 
                                value={nome} 
                                onChange={e => setNome(e.target.value)} 
                                className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-bg text-text-primary outline-none focus:border-text-tertiary" 
                                placeholder="Ex: Financeiro" 
                                autoFocus 
                            />
                        </div>
                    </div>

                    {erro && <p className="text-[12px] text-priority-urgent m-0">{erro}</p>}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] text-text-secondary bg-bg hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={salvando} className="px-4 py-1.5 text-[12px] text-bg bg-text-primary hover:bg-text-secondary disabled:opacity-50 border-0 rounded-lg cursor-pointer font-medium transition-colors">
                            {salvando ? 'Salvando...' : 'Criar Projeto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
