'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { STATUS_OPTIONS, PRIORIDADE_OPTIONS, AREA_GROUPS, FREQUENCIA_OPTIONS, DIA_SEMANA_OPTIONS } from '@/app/lib/tarefas'
import ModalConfirmacao from './ModalConfirmacao'
import ModalConclusaoVinculo from './ModalConclusaoVinculo'
import { showToast } from '@/app/lib/toast'

export default function PainelTarefa({ tarefa, onClose, onUpdate, onDelete }) {
    const [form, setForm]           = useState(tarefa)
    const [salvando, setSalvando]   = useState(false)
    const [excluindo, setExcluindo] = useState(false)
    const [portfolios, setPortfolios] = useState([])
    const [showConfirm, setShowConfirm] = useState(false)
    const [showConclusaoModal, setShowConclusaoModal] = useState(false)

    // Subtarefas
    const [subtarefas, setSubtarefas]         = useState([])
    const [novaSubtarefa, setNovaSubtarefa]   = useState('')
    const [novaSubPrazo, setNovaSubPrazo]     = useState('')
    const [editSubId, setEditSubId]           = useState(null)
    const [editSubPrazo, setEditSubPrazo]     = useState('')
    const [addingSubtask, setAddingSubtask]   = useState(false)
    const inputSubRef = useRef(null)
    const hoje = new Date().toISOString().split('T')[0]

    // Vínculos (saúde / finanças)
    const [vinculos, setVinculos]             = useState([])
    const [showVinculoMenu, setShowVinculoMenu] = useState(false)
    const [vinculoOpcoes, setVinculoOpcoes]   = useState([]) // [{tipo, id, nome}]
    const [vinculoBusca, setVinculoBusca]     = useState('')
    const [vinculoTipo, setVinculoTipo]       = useState('treino')

    // Reset quando muda de tarefa
    useEffect(() => {
        setForm(tarefa)
        setSubtarefas([])
        setNovaSubtarefa('')
        setVinculos([])
        carregarSubtarefas(tarefa.id)
        carregarVinculos(tarefa.id)
    }, [tarefa.id])

    // Carregar portfólios uma vez
    useEffect(() => {
        supabase.from('portfolios').select('id, nome, area').order('nome')
            .then(({ data }) => setPortfolios(data || []))
            .catch(() => {})
    }, [])

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
        setNovaSubPrazo('')
        setAddingSubtask(false)
        const tempId = 'temp_' + Date.now()
        const prazo = novaSubPrazo || null
        const temp = { id: tempId, tarefa_id: tarefa.id, nome, concluido: false, prazo, criada_em: new Date().toISOString() }
        setSubtarefas(prev => [...prev, temp])
        const { data, error } = await supabase
            .from('subtarefas')
            .insert({ tarefa_id: tarefa.id, nome, concluido: false, prazo })
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

    async function carregarVinculos(tarefaId) {
        const { data } = await supabase.from('tarefa_vinculos').select('*').eq('tarefa_id', tarefaId).order('criada_em')
        setVinculos(data || [])
    }

    async function buscarVinculoOpcoes(tipo) {
        setVinculoTipo(tipo)
        setVinculoBusca('')
        let data = []
        if (tipo === 'treino') {
            const { data: d } = await supabase.from('treinos').select('id, modalidade, data, duracao_min').order('data', { ascending: false }).limit(20)
            data = (d || []).map(t => ({ tipo: 'treino', id: t.id, nome: `${t.modalidade} · ${t.data} · ${t.duracao_min}min` }))
        } else if (tipo === 'meta') {
            const { data: d } = await supabase.from('metas').select('id, titulo, status').order('criada_em', { ascending: false }).limit(20)
            data = (d || []).map(m => ({ tipo: 'meta', id: m.id, nome: `${m.titulo} [${m.status || 'ativa'}]` }))
        } else if (tipo === 'transacao') {
            const { data: d } = await supabase.from('transacoes').select('id, descricao, valor, data').order('data', { ascending: false }).limit(20)
            data = (d || []).map(t => ({ tipo: 'transacao', id: t.id, nome: `${t.descricao} · R$ ${Number(t.valor).toFixed(2)} · ${t.data}` }))
        } else if (tipo === 'desafio') {
            const { data: d } = await supabase.from('desafios').select('id, titulo, status').order('criada_em', { ascending: false }).limit(20)
            data = (d || []).map(d2 => ({ tipo: 'desafio', id: d2.id, nome: `${d2.titulo} [${d2.status}]` }))
        }
        setVinculoOpcoes(data)
    }

    async function adicionarVinculo(opcao) {
        const jaExiste = vinculos.some(v => v.tipo === opcao.tipo && v.referencia_id === opcao.id)
        if (jaExiste) { showToast('Já vinculado!', 'erro'); return }
        const payload = { tarefa_id: tarefa.id, tipo: opcao.tipo, referencia_id: opcao.id, referencia_nome: opcao.nome }
        const { data, error } = await supabase.from('tarefa_vinculos').insert(payload).select().single()
        if (error) { showToast(error.message, 'erro'); return }
        setVinculos(prev => [...prev, data])
        setShowVinculoMenu(false)
        showToast('Vínculo adicionado!')
    }

    async function removerVinculo(id) {
        await supabase.from('tarefa_vinculos').delete().eq('id', id)
        setVinculos(prev => prev.filter(v => v.id !== id))
    }

    async function atualizarPrazoSub(id, prazo) {
        setSubtarefas(prev => prev.map(s => s.id === id ? { ...s, prazo } : s))
        await supabase.from('subtarefas').update({ prazo: prazo || null }).eq('id', id)
        setEditSubId(null)
    }

    function subStatus(sub) {
        if (!sub.prazo || sub.concluido) return null
        if (sub.prazo < hoje) return 'vencida'
        if (sub.prazo === hoje) return 'hoje'
        return null
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

        const foiConcluida = tarefa.status !== 'Concluído' && payload.status === 'Concluído'
        if (foiConcluida && vinculos.length > 0) {
            setShowConclusaoModal(true)
        } else {
            onClose()
        }
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
                        {portfolios.length > 0 ? (
                            <select
                                value={form.portfolio || ''}
                                onChange={e => set('portfolio', e.target.value)}
                                className={inp}
                            >
                                <option value="">— Nenhum —</option>
                                {portfolios.map(p => (
                                    <option key={p.id} value={p.nome}>
                                        {p.nome}{p.area ? ` · ${p.area}` : ''}
                                    </option>
                                ))}
                                {form.portfolio && !portfolios.find(p => p.nome === form.portfolio) && (
                                    <option value={form.portfolio}>{form.portfolio}</option>
                                )}
                            </select>
                        ) : (
                            <input value={form.portfolio || ''} onChange={e => set('portfolio', e.target.value)} className={inp} placeholder="Nome do portfólio" />
                        )}
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

                    {/* Vínculos Saúde / Finanças */}
                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[12px] font-semibold text-text-secondary">
                                Vínculos
                                {vinculos.length > 0 && (
                                    <span className="ml-1.5 text-[10px] font-medium text-text-tertiary bg-surface border border-border px-1.5 py-0.5 rounded-full">
                                        {vinculos.length}
                                    </span>
                                )}
                            </label>
                            <button
                                onClick={() => { setShowVinculoMenu(!showVinculoMenu); if (!showVinculoMenu) buscarVinculoOpcoes('treino') }}
                                className="text-[11px] text-accent hover:text-accent/70 bg-transparent border-0 cursor-pointer transition-colors"
                            >
                                + Vincular
                            </button>
                        </div>

                        {showVinculoMenu && (
                            <div className="bg-bg border border-border rounded-lg p-3 mb-2 space-y-2">
                                <div className="flex gap-1">
                                    {[{v:'treino',l:'💪 Treino'},{v:'meta',l:'🎯 Meta'},{v:'transacao',l:'💰 Finanças'},{v:'desafio',l:'🏆 Desafio'}].map(({v,l}) => (
                                        <button key={v} onClick={() => buscarVinculoOpcoes(v)}
                                            className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer transition-colors ${vinculoTipo === v ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-tertiary border-border'}`}
                                        >{l}</button>
                                    ))}
                                </div>
                                <input
                                    value={vinculoBusca}
                                    onChange={e => setVinculoBusca(e.target.value)}
                                    placeholder="Filtrar..."
                                    className="w-full text-[11px] bg-surface border border-border rounded px-2 py-1 outline-none text-text-primary"
                                />
                                <div className="max-h-32 overflow-y-auto space-y-0.5">
                                    {vinculoOpcoes.filter(o => !vinculoBusca || o.nome.toLowerCase().includes(vinculoBusca.toLowerCase())).map(o => (
                                        <button key={o.id} onClick={() => adicionarVinculo(o)}
                                            className="w-full text-left text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-hover px-2 py-1.5 rounded cursor-pointer bg-transparent border-0 transition-colors truncate"
                                        >{o.nome}</button>
                                    ))}
                                    {vinculoOpcoes.length === 0 && (
                                        <p className="text-[11px] text-text-tertiary text-center py-2">Nenhum registro encontrado</p>
                                    )}
                                </div>
                                <button onClick={() => setShowVinculoMenu(false)} className="text-[10px] text-text-tertiary bg-transparent border-0 cursor-pointer w-full text-center hover:text-text-secondary">Fechar</button>
                            </div>
                        )}

                        {vinculos.length > 0 && (
                            <div className="space-y-1">
                                {vinculos.map(v => {
                                    const icone = v.tipo === 'treino' ? '💪' : v.tipo === 'meta' ? '🎯' : v.tipo === 'transacao' ? '💰' : '🏆'
                                    return (
                                        <div key={v.id} className="group flex items-center gap-2 bg-surface border border-border rounded-lg px-2.5 py-1.5">
                                            <span className="text-[11px] flex-shrink-0">{icone}</span>
                                            <span className="text-[11px] text-text-secondary flex-1 truncate">{v.referencia_nome}</span>
                                            <button onClick={() => removerVinculo(v.id)}
                                                className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-0.5 transition-all"
                                            >✕</button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Subtarefas */}
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

                        <div className="space-y-1">
                            {subtarefas.map(sub => {
                                const status = subStatus(sub)
                                return (
                                <div
                                    key={sub.id}
                                    className={`group flex items-start gap-2.5 px-3 py-2 border rounded-lg transition-colors ${
                                        status === 'vencida' ? 'bg-red-950/20 border-red-900/40 hover:border-red-700/50' :
                                        status === 'hoje'    ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/50' :
                                        'bg-surface border-border hover:border-text-tertiary'
                                    }`}
                                >
                                    <button
                                        onClick={() => toggleSubtarefa(sub)}
                                        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer bg-transparent transition-all ${
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
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-[12px] leading-snug ${sub.concluido ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                                            {sub.nome}
                                        </span>
                                        {editSubId === sub.id ? (
                                            <div className="flex items-center gap-1 mt-1">
                                                <input
                                                    type="date"
                                                    defaultValue={sub.prazo || ''}
                                                    autoFocus
                                                    onChange={e => setEditSubPrazo(e.target.value)}
                                                    onBlur={() => atualizarPrazoSub(sub.id, editSubPrazo || sub.prazo)}
                                                    onKeyDown={e => { if (e.key === 'Enter') atualizarPrazoSub(sub.id, editSubPrazo || sub.prazo); if (e.key === 'Escape') setEditSubId(null) }}
                                                    className="text-[10px] bg-bg border border-border rounded px-1.5 py-0.5 outline-none text-text-primary [color-scheme:dark]"
                                                />
                                                {sub.prazo && (
                                                    <button onClick={() => atualizarPrazoSub(sub.id, null)} className="text-[9px] text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer">✕</button>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setEditSubId(sub.id); setEditSubPrazo(sub.prazo || '') }}
                                                className={`block text-[10px] mt-0.5 bg-transparent border-0 cursor-pointer text-left ${
                                                    status === 'vencida' ? 'text-red-400 font-medium' :
                                                    status === 'hoje'    ? 'text-amber-400 font-medium' :
                                                    sub.prazo ? 'text-text-tertiary' : 'text-text-tertiary/40 hover:text-text-tertiary'
                                                }`}
                                            >
                                                {status === 'vencida' && '⚠ '}
                                                {status === 'hoje' && '📅 '}
                                                {sub.prazo ? sub.prazo : '+ prazo'}
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => excluirSubtarefa(sub.id)}
                                        className="opacity-0 group-hover:opacity-100 mt-0.5 text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-0.5 transition-all"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                </div>
                            )})}

                            {addingSubtask && (
                                <form onSubmit={adicionarSubtarefa} className="space-y-2 bg-surface border border-accent/50 rounded-lg px-3 py-2">
                                    <input
                                        ref={inputSubRef}
                                        value={novaSubtarefa}
                                        onChange={e => setNovaSubtarefa(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') { setNovaSubtarefa(''); setNovaSubPrazo(''); setAddingSubtask(false) }
                                        }}
                                        placeholder="Nome da subtarefa..."
                                        className="w-full text-[12px] bg-transparent border-0 outline-none text-text-primary"
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={novaSubPrazo}
                                            onChange={e => setNovaSubPrazo(e.target.value)}
                                            className="text-[11px] bg-bg border border-border rounded px-2 py-1 outline-none text-text-tertiary [color-scheme:dark] cursor-pointer"
                                        />
                                        <div className="flex gap-1 ml-auto">
                                            <button type="button" onClick={() => { setNovaSubtarefa(''); setNovaSubPrazo(''); setAddingSubtask(false) }} className="px-2 py-1 text-[11px] text-text-tertiary bg-transparent border border-border rounded cursor-pointer">Cancelar</button>
                                            <button type="submit" disabled={!novaSubtarefa.trim()} className="px-3 py-1 text-[11px] font-medium bg-accent text-white rounded border-0 cursor-pointer disabled:opacity-40">Adicionar</button>
                                        </div>
                                    </div>
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

            {showConclusaoModal && vinculos.length > 0 && (
                <ModalConclusaoVinculo
                    tarefa={form}
                    vinculos={vinculos}
                    onClose={() => { setShowConclusaoModal(false); onClose() }}
                />
            )}
        </div>
    )
}
