'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSkeleton } from '@/app/components/ui'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

const INITIAL_FORM = { nome: '', descricao: '', frequencia: 'diária', dias_semana: [], lembrete: '', ativo: true }

export default function HabitosPage() {
    const [habitos, setHabitos] = useState([])
    const [registros, setRegistros] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false) // false | 'novo' | 'editar'
    const [editandoHabito, setEditandoHabito] = useState(null)
    const [excluindoId, setExcluindoId] = useState(null)
    
    const [form, setForm] = useState(INITIAL_FORM)
    const [notaAberta, setNotaAberta] = useState(null) // habitoId com nota expandida
    const [notaTexto, setNotaTexto] = useState('')
    const [notas, setNotas] = useState(() => {
        if (typeof window === 'undefined') return {}
        try { return JSON.parse(localStorage.getItem('habitos_notas') || '{}') } catch { return {} }
    })

    useEffect(() => {
        carregar()
    }, [])

    async function carregar() {
        setLoading(true)
        try {
            const { data: h } = await supabase.from('habitos').select('*').order('criada_em')
            setHabitos(h || [])

            // Pegar últimos 30 dias
            const trintaDiasAtras = new Date()
            trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
            const dIso = trintaDiasAtras.toISOString().split('T')[0]

            const { data: hr } = await supabase.from('habitos_registro').select('*').gte('data', dIso)
            setRegistros(hr || [])
        } catch (e) {
            showToast('Erro ao carregar dados: ' + e.message, 'erro')
        } finally {
            setLoading(false)
        }
    }

    function salvarNota(habitoId, texto) {
        const hojeIso = new Date().toISOString().split('T')[0]
        const chave = `${habitoId}_${hojeIso}`
        const novasNotas = { ...notas }
        if (texto.trim()) {
            novasNotas[chave] = texto.trim()
        } else {
            delete novasNotas[chave]
        }
        setNotas(novasNotas)
        localStorage.setItem('habitos_notas', JSON.stringify(novasNotas))
        setNotaAberta(null)
        setNotaTexto('')
    }

    async function toggleHabito(habitoId, concluido) {
        const hojeIso = new Date().toISOString().split('T')[0]
        try {
            if (concluido) {
                await supabase.from('habitos_registro').insert({ habito_id: habitoId, data: hojeIso, concluido: true })
                showToast('Hábito marcado!')
                // Abrir campo de nota após marcar
                setNotaAberta(habitoId)
                const chave = `${habitoId}_${hojeIso}`
                setNotaTexto(notas[chave] || '')
            } else {
                await supabase.from('habitos_registro').delete().eq('habito_id', habitoId).eq('data', hojeIso)
                showToast('Hábito desmarcado!')
                setNotaAberta(null)
            }
            carregar()
        } catch (e) {
            showToast('Erro ao marcar hábito: ' + e.message, 'erro')
        }
    }

    async function handleToggleAtivo(hab) {
        const novoStatus = !hab.ativo
        try {
            const { error } = await supabase.from('habitos').update({ ativo: novoStatus }).eq('id', hab.id)
            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast(novoStatus ? 'Hábito ativado!' : 'Hábito pausado!')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    function handleEditar(hab) {
        setForm({
            nome: hab.nome || '',
            descricao: hab.descricao || '',
            frequencia: hab.frequencia || 'diária',
            dias_semana: hab.dias_semana || [],
            lembrete: hab.lembrete || '',
            ativo: hab.ativo ?? true
        })
        setEditandoHabito(hab)
        setShowModal('editar')
    }

    function handleExcluir(id) {
        setExcluindoId(id)
    }

    async function executarExclusao() {
        const id = excluindoId
        setExcluindoId(null)
        try {
            // First delete associated logs if foreign keys aren't cascade, but usually they are
            await supabase.from('habitos_registro').delete().eq('habito_id', id)
            const { error } = await supabase.from('habitos').delete().eq('id', id)
            
            if (error) {
                showToast('Erro ao excluir: ' + error.message, 'erro')
            } else {
                showToast('Hábito removido')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function salvarHabito() {
        if (!form.nome.trim()) return showToast('Nome é obrigatório', 'erro')
        
        const payload = {
            nome: form.nome.trim(),
            descricao: form.descricao || null,
            frequencia: form.frequencia,
            dias_semana: form.frequencia === 'semanal' ? form.dias_semana : null,
            lembrete: form.lembrete.trim() || null,
            ativo: form.ativo
        }

        try {
            if (showModal === 'novo') {
                const { error } = await supabase.from('habitos').insert(payload)
                if (error) {
                    showToast('Erro: ' + error.message, 'erro')
                } else {
                    showToast('Hábito criado!')
                }
            } else if (showModal === 'editar' && editandoHabito) {
                const { error } = await supabase.from('habitos').update(payload).eq('id', editandoHabito.id)
                if (error) {
                    showToast('Erro: ' + error.message, 'erro')
                } else {
                    showToast('Hábito atualizado!')
                }
            }
            setShowModal(false)
            setForm(INITIAL_FORM)
            setEditandoHabito(null)
            carregar()
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>

    const hojeIso = new Date().toISOString().split('T')[0]
    const diasS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']

    return (
        <div className="p-8 max-w-[900px] mx-auto text-text-primary">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary m-0">Gestão de Hábitos</h2>
                <button 
                    onClick={() => {
                        setForm(INITIAL_FORM)
                        setEditandoHabito(null)
                        setShowModal('novo')
                    }} 
                    className="px-4 py-2 text-[12px] font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-primary cursor-pointer transition-colors"
                >
                    + Novo Hábito
                </button>
            </div>

            <div className="space-y-4">
                {habitos.map(hab => {
                    const isDoneToday = registros.some(r => r.habito_id === hab.id && r.data === hojeIso && r.concluido)
                    const notaHoje = notas[`${hab.id}_${hojeIso}`] || ''
                    
                    // Heatmap (últimos 30 dias)
                    const heatmap = []
                    for(let i=29; i>=0; i--) {
                        const d = new Date()
                        d.setDate(d.getDate() - i)
                        const dStr = d.toISOString().split('T')[0]
                        const isDone = registros.some(r => r.habito_id === hab.id && r.data === dStr && r.concluido)
                        heatmap.push(isDone)
                    }

                    // Streak calculation from today backwards
                    let streak = 0
                    for(let i=0; i<30; i++) {
                        if (heatmap[29-i]) {
                            streak++
                        } else {
                            if (i !== 0) break // break if not today and not completed
                        }
                    }

                    return (
                        <div
                            key={hab.id}
                            className={`bg-surface border border-border rounded-xl p-5 transition-opacity ${!hab.ativo ? 'opacity-50' : ''}`}
                        >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <input 
                                    type="checkbox" 
                                    checked={isDoneToday} 
                                    disabled={!hab.ativo}
                                    onChange={e => toggleHabito(hab.id, e.target.checked)}
                                    className="accent-accent w-5 h-5 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-[15px] font-medium m-0 ${isDoneToday ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                                            {hab.nome}
                                        </h3>
                                        {!hab.ativo && (
                                            <span className="bg-bg text-text-tertiary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-border">
                                                Pausado
                                            </span>
                                        )}
                                        {hab.lembrete && (
                                            <span className="bg-bg text-accent text-[10px] px-1.5 py-0.5 rounded border border-border font-medium">
                                                🔔 {hab.lembrete}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[12px] text-text-tertiary m-0 mt-0.5 capitalize">
                                        {hab.frequencia} {hab.frequencia === 'semanal' && hab.dias_semana ? `(${hab.dias_semana.join(', ')})` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-[12px] text-accent font-semibold flex items-center gap-1">
                                        🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
                                    </span>
                                    <div className="flex gap-0.5">
                                        {heatmap.map((done, idx) => (
                                            <div 
                                                key={idx} 
                                                className={`w-3 h-3 rounded-[2px] ${done ? 'bg-accent' : 'bg-bg/50 border border-border'}`} 
                                                title="Dia" 
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 border-l border-border pl-4">
                                    <button 
                                        onClick={() => handleToggleAtivo(hab)}
                                        title={hab.ativo ? 'Pausar hábito' : 'Ativar hábito'}
                                        className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1 text-[14px]"
                                    >
                                        {hab.ativo ? '⏸️' : '▶️'}
                                    </button>
                                    <button 
                                        onClick={() => handleEditar(hab)}
                                        title="Editar"
                                        className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1 text-[14px]"
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        onClick={() => handleExcluir(hab.id)}
                                        title="Excluir"
                                        className="text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-1 text-[14px]"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Nota do dia */}
                        {notaAberta === hab.id ? (
                            <div className="mt-3 pt-3 border-t border-border flex gap-2">
                                <input
                                    autoFocus
                                    value={notaTexto}
                                    onChange={e => setNotaTexto(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') salvarNota(hab.id, notaTexto); if (e.key === 'Escape') setNotaAberta(null) }}
                                    placeholder="Nota de hoje (opcional)..."
                                    className="flex-1 text-[12px] bg-bg border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-text-tertiary text-text-primary [color-scheme:dark]"
                                />
                                <button onClick={() => salvarNota(hab.id, notaTexto)} className="px-2.5 py-1 text-[11px] font-medium bg-accent text-bg rounded-lg cursor-pointer border-0">Salvar</button>
                                <button onClick={() => setNotaAberta(null)} className="px-2 py-1 text-[11px] text-text-tertiary bg-transparent border-0 cursor-pointer">✕</button>
                            </div>
                        ) : notaHoje ? (
                            <div className="mt-2 pt-2 border-t border-border flex items-start justify-between gap-2">
                                <p className="text-[11px] text-text-secondary italic m-0 flex-1">"{notaHoje}"</p>
                                <button
                                    onClick={() => { setNotaAberta(hab.id); setNotaTexto(notaHoje) }}
                                    className="text-[10px] text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer flex-shrink-0"
                                >
                                    editar
                                </button>
                            </div>
                        ) : isDoneToday ? (
                            <button
                                onClick={() => { setNotaAberta(hab.id); setNotaTexto('') }}
                                className="mt-2 text-[11px] text-text-tertiary hover:text-text-secondary bg-transparent border-0 cursor-pointer p-0 block"
                            >
                                + adicionar nota
                            </button>
                        ) : null}
                        </div>
                    )
                })}
                {habitos.length === 0 && <p className="text-center text-[13px] text-text-tertiary py-8">Nenhum hábito cadastrado.</p>}
            </div>

            {/* Creation & Editing Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-xl w-full max-w-[400px] p-6 shadow-2xl">
                        <h3 className="text-[16px] font-semibold text-text-primary mb-4 m-0">
                            {showModal === 'novo' ? 'Novo Hábito' : 'Editar Hábito'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-1">Nome</label>
                                <input 
                                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]" 
                                    value={form.nome || ''} 
                                    onChange={e => setForm({...form, nome: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-1">Lembrete (ex: "22h")</label>
                                <input 
                                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]" 
                                    placeholder="Opcional"
                                    value={form.lembrete || ''} 
                                    onChange={e => setForm({...form, lembrete: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-1">Frequência</label>
                                <select 
                                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]" 
                                    value={form.frequencia} 
                                    onChange={e => setForm({...form, frequencia: e.target.value})}
                                >
                                    <option value="diária">Diária</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="mensal">Mensal</option>
                                </select>
                            </div>
                            {form.frequencia === 'semanal' && (
                                <div>
                                    <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-2">Dias da semana</label>
                                    <div className="flex flex-wrap gap-2">
                                        {diasS.map(d => (
                                            <label key={d} className="flex items-center gap-1.5 text-[12px] text-text-secondary cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={form.dias_semana.includes(d)} 
                                                    onChange={e => {
                                                        const checked = e.target.checked
                                                        setForm(p => ({
                                                            ...p,
                                                            dias_semana: checked ? [...p.dias_semana, d] : p.dias_semana.filter(x => x !== d)
                                                        }))
                                                    }} 
                                                />
                                                <span className="capitalize">{d.substring(0,3)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                                onClick={() => {
                                    setShowModal(false)
                                    setEditandoHabito(null)
                                }} 
                                className="px-4 py-2 text-[12px] text-text-secondary cursor-pointer bg-transparent border-0"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={salvarHabito} 
                                className="px-4 py-2 text-[12px] font-medium bg-accent text-bg rounded-lg cursor-pointer border-0"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {excluindoId && (
                <ModalConfirmacao
                    titulo="Excluir hábito?"
                    mensagem="Esta ação não pode ser desfeita e removerá todo o histórico de execuções deste hábito."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setExcluindoId(null)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
