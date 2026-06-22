'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import ModalConfirmacao from './ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

export default function ModalEditarArea({ area, onClose, onAtualizar, onExcluir }) {
    const [nome, setNome] = useState(area.nome || '')
    const [icone, setIcone] = useState(area.icone || '📁')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')
    const [confirmExcluir, setConfirmExcluir] = useState(false)

    async function handleSalvar(e) {
        e.preventDefault()
        if (!nome.trim()) { setErro('O nome é obrigatório.'); return }
        setSalvando(true); setErro('')

        const novoSlug = nome
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

        const { error } = await supabase
            .from('areas')
            .update({ nome: nome.trim(), icone: icone.trim() || '📁', slug: novoSlug })
            .eq('id', area.id)

        setSalvando(false)
        if (error) { setErro(error.message); return }
        showToast('Projeto atualizado!')
        onAtualizar?.({ ...area, nome: nome.trim(), icone: icone.trim() || '📁', slug: novoSlug })
        onClose()
    }

    async function handleExcluir() {
        const { error } = await supabase.from('areas').delete().eq('id', area.id)
        if (error) { showToast('Erro ao excluir: ' + error.message, 'erro'); return }
        showToast('Projeto removido')
        onExcluir?.(area.id)
        onClose()
    }

    const lbl = 'block text-[11px] text-text-tertiary uppercase tracking-wide mb-1'
    const inp = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-bg text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]'

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-surface border border-border rounded-xl w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                        <h2 className="text-[14px] font-semibold text-text-primary m-0">Editar Projeto</h2>
                        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSalvar} className="px-5 py-4 space-y-4">
                        <div className="flex gap-3">
                            <div className="w-[64px]">
                                <label className={lbl}>Ícone</label>
                                <input value={icone} onChange={e => setIcone(e.target.value)} className={`${inp} text-center`} />
                            </div>
                            <div className="flex-1">
                                <label className={lbl}>Nome *</label>
                                <input value={nome} onChange={e => setNome(e.target.value)} className={inp} autoFocus />
                            </div>
                        </div>

                        {erro && <p className="text-[12px] text-priority-urgent m-0">{erro}</p>}

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmExcluir(true)}
                                className="text-[12px] text-priority-urgent hover:underline bg-transparent border-0 cursor-pointer p-0"
                            >
                                Excluir projeto
                            </button>
                            <div className="flex gap-2">
                                <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] text-text-secondary bg-bg hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={salvando} className="px-4 py-1.5 text-[12px] text-bg bg-text-primary hover:bg-text-secondary disabled:opacity-50 border-0 rounded-lg cursor-pointer font-medium transition-colors">
                                    {salvando ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {confirmExcluir && (
                <ModalConfirmacao
                    titulo={`Excluir "${area.nome}"?`}
                    mensagem="O projeto será removido da navegação. As tarefas associadas não serão deletadas."
                    onConfirmar={handleExcluir}
                    onCancelar={() => setConfirmExcluir(false)}
                    cor="urgente"
                />
            )}
        </>
    )
}
