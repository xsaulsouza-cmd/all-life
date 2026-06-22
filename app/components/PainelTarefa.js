'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { STATUS_OPTIONS, PRIORIDADE_OPTIONS, AREA_GROUPS, FREQUENCIA_OPTIONS, DIA_SEMANA_OPTIONS } from '@/app/lib/tarefas'
import ModalConfirmacao from './ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

export default function PainelTarefa({ tarefa, onClose, onUpdate, onDelete }) {
    const [form, setForm]           = useState(tarefa)
    const [salvando, setSalvando]   = useState(false)
    const [excluindo, setExcluindo] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // Subtarefas
    const [subtarefas, setSubtarefas]       = useState([])
    const [novaSubtarefa, setNovaSubtarefa] = useState('')
    const [addingSubtask, setAddingSubtask] = useState(false)
    const inputSubRef = useRef(null)

    // Reset quando muda de tarefa
    useEffect(() => {
        setForm(tarefa)
        setSubtarefas([])
        setNovaSubtarefa('')
        carregarSubtarefas(tarefa.id)
    }, [tarefa.id])

    async function carregarSubtarefas(tarefaId) {
        const { data } = await supabase
            .from('subtarefas')
            .select('*')
            .eq('tarefa_id', tarefaId)
            .order('criada_em')
        setSubtarefas(data || [])
    }

    async function adicionarSubtarefa(e) {
        e?.preventDefault()
        const nome = novaSubtarefa.trim()
        if (!nome) return
        setNovaSubtarefa('')
        const tempId = 'temp_' + Date.now()
        const temp = { id: tempId, tarefa_id: tarefa.id, nome, concluido: false, criada_em: new Date().toISOString() }
        setSubtarefas(prev => [...prev, temp])
        const { data, error } = await supabase
            .from('subtarefas')
            .insert({ tarefa_id: tarefa.id, nome, concluido: false })
            .select()
            .single()
        if (!error && data) {
            setSubtarefas(prev => prev.map(s => s.id === tempId ? data : s))
        } else {
            setSubtarefas(prev => prev.filter(s => s.id !== tempId))
        }
    }

    async function toggleSubtarefa(sub) {
        const novo = !sub.concluido
        setSubtarefas(prev => prev.map(s => s.id === sub.id ? { ...s, concluido: novo } : s))
        await supabase.from('subtarefas').update({ concluido: novo }).eq('id', sub.id)
    }

    async function excluirSubtarefa(id) {
        setSubtarefas(prev => prev.filter(s => s.id !== id))
        await supabase.from('subtarefas').delete().eq('id', id)
    }

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

    async function handleSalvar() {
        setSalvando(true)
        const payload = {
            nome: form.nome,
            area: form.area,
            projeto: form.projeto,
            portfolio: form.portfolio,
            prioridade: form.prioridade,
            status: form.status,
            frequencia: form.frequencia,
            dia_semana: form.frequencia === 'Semanal' ? form.dia_semana : null,
            prazo: form.prazo,
            tempo_estimado: form.tempo_estimado,
            notas: form.notas,
            atualizada_em: new Date().toISOString()
        }
        const { error } = await supabase.from('tarefas').update(payload).eq('id', tarefa.id)
        setSalvando(false)
        if (error) { showToast('Erro ao salvar: ' + error.message, 'erro'); return }

        // Sincronizar com Google Calendar se houver event_id
        if (tarefa.calendar_event_id) {
            const statusMudou = form.status !== tarefa.status
            if (statusMudou) {
                fetch('/api/calendar', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId: tarefa.calendar_event_id,
                        updates: { concluido: form.status === 'Concluído' },
                    }),
                }).catch(() => {})
            }
        }

        onUpdate(tarefa.id, payload)
        showToast('Tarefa atualizada!')
        onClose()
    }

    async function executarExclusao() {
        setShowConfirm(false)
        setExcluindo(true)
        const { error } = await supabase.from('tarefas').delete().eq('id', tarefa.id)
        if (error) { showToast('Erro ao excluir: ' + error.message, 'erro'); setExcluindo(false); return }
        if (onDelete) onDelete(tarefa.id)
        showToast('Tarefa removida')
        onClose()
    }

    const concluidas  = subtarefas.filter(s => s.concluido).length
    const total       = subtarefas.length
    const progresso   = total > 0 ? Math.round((concluidas / total) * 100) : 0

    const lbl = "block text-[12px] text-text-secondary mb-1"
    const inp = "w-full text-[13px] bg-surface hover:bg-surface-hover border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />

            <div className="relative w-[420px] bg-bg border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg/95 backdrop-blur z-10">
                    <h2 className="text-[16px] font-semibold text-text-primary m-0 truncate pr-4">
                        {form.nome}
                    </h2>
                    <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1 rounded hover:bg-surface-hover transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                    <div>
                        <label className={lbl}>Portfólio</label>
                        <input value={form.portfolio || ''} onChange={e => set('portfolio', e.target.value)} className={inp} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Área</label>
                            <select value={form.area || ''} onChange={e => set('area', e.target.value)} className={inp}>
                                <option value="">—</option>
                                {AREA_GROUPS.map(g => (
                                    <optgroup key={g.grupo} label={g.grupo}>
                                        {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Projeto</label>
                            <input value={form.projeto || ''} onChange={e => set('projeto', e.target.value)} className={inp} />
                        </div>
                    </div>

                    <div>
                        <label className={lbl}>Nome da tarefa</label>
                        <input value={form.nome || ''} onChange={e => set('nome', e.target.value)} className={inp} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Prioridade</label>
                            <select value={form.prioridade || ''} onChange={e => set('prioridade', e.target.value)} className={inp}>
                                <option value="">—</option>
                                {PRIORIDADE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Status</label>
                            <select value={form.status || ''} onChange={e => set('status', e.target.value)} className={inp}>
                                {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Frequência</label>
                            <select value={form.frequencia || ''} onChange={e => set('frequencia', e.target.value)} className={inp}>
                                <option value="">—</option>
                                {FREQUENCIA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        {form.frequencia === 'Semanal' && (
                            <div>
                                <label className={lbl}>Dia da Semana</label>
                                <select value={form.dia_semana || ''} onChange={e => set('dia_semana', e.target.value)} className={inp}>
                                    <option value="">—</option>
                                    {DIA_SEMANA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Prazo</label>
                            <input type="date" value={form.prazo || ''} onChange={e => set('prazo', e.target.value)} className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Tempo estimado</label>
                            <input value={form.tempo_estimado || ''} onChange={e => set('tempo_estimado', e.target.value)} className={inp} placeholder="ex: 1h, 30min" />
                        </div>
                    </div>

                    <div>
                        <label className={lbl}>Notas</label>
                        <textarea
                            value={form.notas || ''}
                            onChange={e => set('notas', e.target.value)}
                            className={`${inp} resize-none min-h-[80px] leading-relaxed`}
                            rows="3"
                        />
                    </div>

                    {/* ── Subtarefas ── */}
                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[12px] font-semibold text-text-secondary flex items-center gap-2">
                                Subtarefas
                                {total > 0 && (
                                    <span className="text-[10px] font-medium text-text-tertiary bg-surface border border-border px-1.5 py-0.5 rounded-full">
                                        {concluidas}/{total}
                                    </span>
                                )}
                            </label>
                            <button
                                onClick={() => { setAddingSubtask(true); setTimeout(() => inputSubRef.current?.focus(), 50) }}
                                className="text-[11px] text-accent hover:text-accent/70 bg-transparent border-0 cursor-pointer flex items-center gap-1 transition-colors"
                            >
                                + Adicionar
                            </button>
                        </div>

                        {/* Barra de progresso */}
                        {total > 0 && (
                            <div className="mb-3">
                                <div className="h-1 bg-surface rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#16A34A] rounded-full transition-all duration-300"
                                        style={{ width: `${progresso}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-text-tertiary mt-1 block">{progresso}% concluído</span>
                            </div>
                        )}

                        {/* Lista de subtarefas */}
                        <div className="space-y-1">
                            {subtarefas.map(sub => (
                                <div
                                    key={sub.id}
                                    className="group flex items-center gap-2.5 px-3 py-2 bg-surface border border-border rounded-lg hover:border-text-tertiary transition-colors"
                                >
                                    <button
                                        onClick={() => toggleSubtarefa(sub)}
                                        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer bg-transparent transition-all ${
                                            sub.concluido
                                                ? 'bg-[#16A34A] border-[#16A34A]'
                                                : 'border-border hover:border-text-tertiary'
                                        }`}
                                    >
                                        {sub.concluido && (
                                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                    </button>
                                    <span className={`flex-1 text-[12px] leading-snug ${sub.concluido ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                                        {sub.nome}
                                    </span>
                                    <button
                                        onClick={() => excluirSubtarefa(sub.id)}
                                        className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-0.5 transition-all"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                </div>
                            ))}

                            {/* Input nova subtarefa */}
                            {addingSubtask && (
                                <form onSubmit={adicionarSubtarefa} className="flex items-center gap-2">
                                    <input
                                        ref={inputSubRef}
                                        value={novaSubtarefa}
                                        onChange={e => setNovaSubtarefa(e.target.value)}
                                        onBlur={() => { if (!novaSubtarefa.trim()) setAddingSubtask(false) }}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') { setNovaSubtarefa(''); setAddingSubtask(false) }
                                        }}
                                        placeholder="Nome da subtarefa..."
                                        className="flex-1 text-[12px] bg-surface border border-accent/50 rounded-lg px-3 py-2 outline-none focus:border-accent text-text-primary [color-scheme:dark] transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!novaSubtarefa.trim()}
                                        className="px-3 py-2 text-[11px] font-medium bg-accent text-white rounded-lg border-0 cursor-pointer disabled:opacity-40 transition-opacity"
                                    >
                                        ↵
                                    </button>
                                </form>
                            )}

                            {subtarefas.length === 0 && !addingSubtask && (
                                <div className="text-center py-4 text-[11px] text-text-tertiary border border-dashed border-border rounded-lg">
                                    Nenhuma subtarefa
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-bg">
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={excluindo}
                        className="text-[12px] font-medium text-priority-urgent hover:text-red-500 bg-transparent border-0 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                        {excluindo ? 'Excluindo...' : 'Excluir tarefa'}
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[12px] font-medium text-text-secondary bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSalvar}
                            disabled={salvando}
                            className="px-4 py-2 text-[12px] font-medium text-bg bg-text-primary hover:bg-text-secondary border-0 rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                        >
                            {salvando ? 'Salvando...' : 'Salvar alterações'}
                        </button>
                    </div>
                </div>
            </div>

            {showConfirm && (
                <ModalConfirmacao
                    titulo="Excluir tarefa?"
                    mensagem="Esta ação não pode ser desfeita."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setShowConfirm(false)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
