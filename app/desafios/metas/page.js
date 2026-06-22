'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSkeleton } from '@/app/components/ui'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

const INITIAL_FORM = { titulo: '', descricao: '', categoria: 'saúde', valor_alvo: '', unidade: '', prazo: '', status: 'ativa' }

export default function MetasPage() {
    const [metas, setMetas] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false) // false | 'novo' | 'editar'
    const [editandoMeta, setEditandoMeta] = useState(null)
    const [excluindoId, setExcluindoId] = useState(null)
    const [showProgressoModal, setShowProgressoModal] = useState(null)
    
    const [form, setForm] = useState(INITIAL_FORM)
    const [erros, setErros] = useState({})
    const [novoProgresso, setNovoProgresso] = useState('')

    useEffect(() => {
        carregar()
    }, [])

    async function carregar() {
        setLoading(true)
        try {
            const { data } = await supabase.from('metas').select('*').order('prazo', { ascending: true })
            setMetas(data || [])
        } catch (e) {
            showToast('Erro ao carregar metas: ' + e.message, 'erro')
        } finally {
            setLoading(false)
        }
    }

    async function salvarMeta() {
        const newErros = {}
        if (!form.titulo?.trim()) newErros.titulo = 'Título é obrigatório'
        if (!form.valor_alvo) newErros.valor_alvo = 'Valor alvo é obrigatório'
        else if (isNaN(parseFloat(form.valor_alvo))) newErros.valor_alvo = 'Valor alvo deve ser um número'

        if (Object.keys(newErros).length > 0) {
            setErros(newErros)
            return
        }
        setErros({})

        const payload = {
            titulo: form.titulo.trim(),
            descricao: form.descricao || null,
            categoria: form.categoria,
            valor_alvo: parseFloat(form.valor_alvo),
            unidade: form.unidade || '',
            prazo: form.prazo || null,
            status: form.status
        }

        try {
            if (showModal === 'novo') {
                const { error } = await supabase.from('metas').insert({ ...payload, valor_atual: 0 })
                if (error) {
                    showToast('Erro: ' + error.message, 'erro')
                } else {
                    showToast('Meta criada!')
                }
            } else if (showModal === 'editar' && editandoMeta) {
                const { error } = await supabase.from('metas').update(payload).eq('id', editandoMeta.id)
                if (error) {
                    showToast('Erro: ' + error.message, 'erro')
                } else {
                    showToast('Meta atualizada!')
                }
            }
            setShowModal(false)
            setEditandoMeta(null)
            setForm(INITIAL_FORM)
            carregar()
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function atualizarProgresso(meta) {
        const val = parseFloat(novoProgresso)
        if (isNaN(val)) return showToast('Insira um valor numérico válido', 'erro')
        
        try {
            const { error } = await supabase.from('metas').update({ valor_atual: val }).eq('id', meta.id)
            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast('Progresso atualizado!')
                setShowProgressoModal(null)
                setNovoProgresso('')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function handleConcluirMeta(meta) {
        try {
            const { error } = await supabase.from('metas').update({ status: 'concluída' }).eq('id', meta.id)
            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast('Meta concluída! 🎉')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function handlePausarMeta(meta) {
        try {
            const { error } = await supabase.from('metas').update({ status: 'pausada' }).eq('id', meta.id)
            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast('Meta pausada')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function handleReativarMeta(meta) {
        try {
            const { error } = await supabase.from('metas').update({ status: 'ativa' }).eq('id', meta.id)
            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast('Meta ativada!')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    function handleEditarMeta(meta) {
        setForm({
            titulo: meta.titulo || '',
            descricao: meta.descricao || '',
            categoria: meta.categoria || 'saúde',
            valor_alvo: meta.valor_alvo || '',
            unidade: meta.unidade || '',
            prazo: meta.prazo || '',
            status: meta.status || 'ativa'
        })
        setErros({})
        setEditandoMeta(meta)
        setShowModal('editar')
    }

    function handleExcluirMeta(id) {
        setExcluindoId(id)
    }

    async function executarExclusao() {
        const id = excluindoId
        setExcluindoId(null)
        try {
            const { error } = await supabase.from('metas').delete().eq('id', id)
            if (error) {
                showToast('Erro ao remover: ' + error.message, 'erro')
            } else {
                showToast('Meta removida')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>

    const colorPorStatus = {
        'ativa': 'bg-accent text-bg',
        'concluída': 'bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/30',
        'pausada': 'bg-[#1e1e1e] text-text-tertiary border border-border'
    }

    const categorias = [...new Set(metas.map(m => m.categoria))]

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase mb-1"
    const inp = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]"

    return (
        <div className="p-8 max-w-[1000px] mx-auto text-text-primary">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-[16px] font-semibold text-text-primary m-0">Metas</h2>
                <button 
                    onClick={() => {
                        setForm(INITIAL_FORM)
                        setErros({})
                        setEditandoMeta(null)
                        setShowModal('novo')
                    }} 
                    className="px-4 py-2 text-[12px] font-medium bg-accent text-bg rounded-lg cursor-pointer border-0 transition-colors"
                >
                    + Nova Meta
                </button>
            </div>

            {categorias.length === 0 && <p className="text-center text-[13px] text-text-tertiary py-8">Nenhuma meta cadastrada.</p>}

            <div className="space-y-8">
                {categorias.map(cat => (
                    <div key={cat}>
                        <h3 className="text-[14px] font-medium text-text-primary mb-4 capitalize border-b border-border pb-2">{cat}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {metas.filter(m => m.categoria === cat).map(meta => {
                                const valAlvo = parseFloat(meta.valor_alvo) || 1
                                const valAtual = parseFloat(meta.valor_atual) || 0
                                const pct = Math.min(100, Math.round((valAtual / valAlvo) * 100))

                                // Ritmo: progresso esperado com base no tempo decorrido
                                let esperadoPct = null
                                let ritmoLabel = null
                                let ritmoColor = 'text-text-tertiary'
                                if (meta.prazo && meta.criada_em && meta.status === 'ativa') {
                                    const criada = new Date(meta.criada_em)
                                    const prazoD = new Date(meta.prazo + 'T23:59:59')
                                    const hoje = new Date()
                                    const totalDias = Math.max(1, (prazoD - criada) / 86400000)
                                    const decorridos = Math.max(0, (hoje - criada) / 86400000)
                                    esperadoPct = Math.min(100, Math.round((decorridos / totalDias) * 100))

                                    const diff = pct - esperadoPct
                                    if (diff >= 5) { ritmoLabel = `+${diff}% à frente`; ritmoColor = 'text-[#16A34A]' }
                                    else if (diff <= -5) { ritmoLabel = `${diff}% atrasado`; ritmoColor = 'text-priority-urgent' }
                                    else { ritmoLabel = 'No ritmo'; ritmoColor = 'text-text-secondary' }
                                }

                                return (
                                    <div key={meta.id} className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between group">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="text-[15px] font-semibold text-text-primary m-0">{meta.titulo}</h4>
                                                    {meta.prazo && <span className="text-[11px] text-text-tertiary">Prazo: {new Date(meta.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded ${colorPorStatus[meta.status]}`}>
                                                        {meta.status}
                                                    </span>
                                                    {ritmoLabel && (
                                                        <span className={`text-[10px] font-medium ${ritmoColor}`}>{ritmoLabel}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 mb-2">
                                                <div className="flex justify-between text-[12px] mb-1.5">
                                                    <span className="text-text-secondary">{valAtual} / {valAlvo} {meta.unidade}</span>
                                                    <span className="text-text-primary font-medium">{pct}%</span>
                                                </div>
                                                {/* Barra de progresso com marcador de ritmo esperado */}
                                                <div className="relative w-full h-2 bg-bg rounded-full overflow-hidden border border-border">
                                                    <div className={`h-full transition-all ${meta.status === 'concluída' ? 'bg-[#16A34A]' : 'bg-accent'}`} style={{width: `${pct}%`}} />
                                                </div>
                                                {esperadoPct !== null && (
                                                    <div className="relative h-1.5 mt-0.5">
                                                        <div
                                                            className="absolute top-0 w-px h-full bg-text-tertiary/50"
                                                            style={{ left: `${esperadoPct}%` }}
                                                            title={`Esperado: ${esperadoPct}%`}
                                                        />
                                                        <span className="absolute text-[9px] text-text-tertiary/70 -translate-x-1/2 leading-none" style={{ left: `${esperadoPct}%` }}>
                                                            {esperadoPct}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            <button 
                                                onClick={() => { setShowProgressoModal(meta); setNovoProgresso(meta.valor_atual) }}
                                                className="text-[12px] w-full py-1.5 rounded bg-bg border border-border text-text-secondary hover:text-text-primary hover:border-text-tertiary transition-colors cursor-pointer"
                                            >
                                                Atualizar Progresso
                                            </button>

                                            <div className="flex justify-between items-center border-t border-border/50 pt-2 gap-2">
                                                <div className="flex gap-1.5">
                                                    {meta.status === 'ativa' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleConcluirMeta(meta)}
                                                                className="px-2 py-1 text-[11px] font-semibold bg-[#16A34A] text-bg rounded cursor-pointer border-0"
                                                            >
                                                                Concluir
                                                            </button>
                                                            <button 
                                                                onClick={() => handlePausarMeta(meta)}
                                                                className="px-2 py-1 text-[11px] font-medium bg-[#1e1e1e] text-text-secondary hover:text-text-primary rounded border border-border cursor-pointer transition-colors"
                                                            >
                                                                Pausar
                                                            </button>
                                                        </>
                                                    )}
                                                    {meta.status === 'pausada' && (
                                                        <button 
                                                            onClick={() => handleReativarMeta(meta)}
                                                            className="px-2 py-1 text-[11px] font-medium bg-accent text-bg rounded cursor-pointer border-0"
                                                        >
                                                            Ativar
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => handleEditarMeta(meta)}
                                                        className="text-[12px] text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1"
                                                        title="Editar"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        onClick={() => handleExcluirMeta(meta.id)}
                                                        className="text-[12px] text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-1"
                                                        title="Excluir"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Nova/Editar Meta */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-xl w-full max-w-[500px] p-6 shadow-2xl">
                        <h3 className="text-[16px] font-semibold text-text-primary mb-4 m-0">
                            {showModal === 'novo' ? 'Nova Meta' : 'Editar Meta'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className={lbl}>Título *</label>
                                <input 
                                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]" 
                                    value={form.titulo || ''} 
                                    onChange={e => {
                                        setForm({...form, titulo: e.target.value})
                                        if (e.target.value.trim() && erros.titulo) {
                                            setErros(prev => { const c = {...prev}; delete c.titulo; return c })
                                        }
                                    }} 
                                />
                                {erros.titulo && <span className="text-[11px] text-[#DC2626] mt-1 block">{erros.titulo}</span>}
                            </div>
                            <div>
                                <label className={lbl}>Descrição</label>
                                <textarea 
                                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark] resize-none" 
                                    rows="2"
                                    value={form.descricao || ''} 
                                    onChange={e => setForm({...form, descricao: e.target.value})} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Categoria</label>
                                    <select className={inp} value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                                        <option value="saúde">Saúde</option>
                                        <option value="financeiro">Financeiro</option>
                                        <option value="profissional">Profissional</option>
                                        <option value="pessoal">Pessoal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>Prazo</label>
                                    <input type="date" className={inp} value={form.prazo || ''} onChange={e => setForm({...form, prazo: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Valor Alvo *</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className={inp} 
                                        value={form.valor_alvo || ''} 
                                        onChange={e => {
                                            setForm({...form, valor_alvo: e.target.value})
                                            if (e.target.value && erros.valor_alvo) {
                                                setErros(prev => { const c = {...prev}; delete c.valor_alvo; return c })
                                            }
                                        }} 
                                    />
                                    {erros.valor_alvo && <span className="text-[11px] text-[#DC2626] mt-1 block">{erros.valor_alvo}</span>}
                                </div>
                                <div>
                                    <label className={lbl}>Unidade (ex: kg, R$, livros)</label>
                                    <input className={inp} value={form.unidade || ''} onChange={e => setForm({...form, unidade: e.target.value})} placeholder="ex: kg, R$" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                                onClick={() => {
                                    setShowModal(false)
                                    setEditandoMeta(null)
                                }} 
                                className="px-4 py-2 text-[12px] text-text-secondary cursor-pointer bg-transparent border-0"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={salvarMeta} 
                                className="px-4 py-2 text-[12px] font-medium bg-accent text-bg rounded-lg cursor-pointer border-0"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Progresso */}
            {showProgressoModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-xl w-full max-w-[300px] p-6 shadow-2xl">
                        <h3 className="text-[14px] font-semibold text-text-primary mb-1 m-0">Atualizar Progresso</h3>
                        <p className="text-[12px] text-text-tertiary mb-4 m-0 mt-0.5">{showProgressoModal.titulo}</p>
                        
                        <div className="mb-4">
                            <label className={lbl}>Novo Valor Atual</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                className={inp} 
                                value={novoProgresso} 
                                onChange={e => setNovoProgresso(e.target.value)} 
                                autoFocus 
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setShowProgressoModal(null)} 
                                className="px-3 py-1.5 text-[12px] text-text-secondary cursor-pointer bg-transparent border-0"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => atualizarProgresso(showProgressoModal)} 
                                className="px-3 py-1.5 text-[12px] font-medium bg-accent text-bg rounded-lg cursor-pointer border-0"
                            >
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {excluindoId && (
                <ModalConfirmacao
                    titulo="Excluir meta?"
                    mensagem="Esta ação não pode ser desfeita."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setExcluindoId(null)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
