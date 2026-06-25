'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSkeleton } from '@/app/components/ui'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

export default function DesafiosAtivosPage() {
    const MODALIDADES_TREINO = ['musculação', 'jiu-jitsu', 'pilates', 'corrida', 'outro']

    const [desafios, setDesafios] = useState([])
    const [checkins, setCheckins] = useState([])
    const [treinos, setTreinos] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [abandonandoId, setAbandonandoId] = useState(null)
    const [form, setForm] = useState({ duracao_dias: 30, tipo: 'geral', modalidades: [] })

    const hojeIso = new Date().toISOString().split('T')[0]

    useEffect(() => {
        carregar()
    }, [])

    async function carregar() {
        setLoading(true)
        try {
            const [
                { data: d },
                { data: c },
                { data: tr },
            ] = await Promise.all([
                supabase.from('desafios').select('*').order('data_inicio', { ascending: false }),
                supabase.from('desafios_checkin').select('*'),
                supabase.from('treinos').select('data, modalidade, concluido'),
            ])
            setDesafios(d || [])
            setCheckins(c || [])
            setTreinos(tr || [])
        } catch (e) {
            showToast('Erro ao carregar dados: ' + e.message, 'erro')
        } finally {
            setLoading(false)
        }
    }

    // Calcula progresso de desafio de treino com base nos treinos reais
    function calcularProgressoTreino(desafio) {
        if (desafio.tipo !== 'treino' || !desafio.meta_treinos) return null

        const treinosDoPeriodo = treinos.filter(t => {
            if (!(t.concluido ?? true)) return false
            // Filtra por modalidade se especificada
            if (desafio.modalidades?.length > 0 && !desafio.modalidades.includes(t.modalidade)) return false

            const dataTreino = t.data
            if (desafio.meta_tipo === 'total') {
                return dataTreino >= desafio.data_inicio && dataTreino <= (desafio.data_fim || '9999')
            }
            if (desafio.meta_tipo === 'por_semana') {
                // Semana atual
                const d = new Date()
                const dia = d.getDay()
                const seg = new Date(d); seg.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
                const dom = new Date(seg); dom.setDate(seg.getDate() + 6)
                return dataTreino >= seg.toISOString().split('T')[0] && dataTreino <= dom.toISOString().split('T')[0]
            }
            if (desafio.meta_tipo === 'por_mes') {
                return dataTreino.startsWith(hojeIso.substring(0, 7))
            }
            return false
        })

        const feitos = treinosDoPeriodo.length
        const pct = Math.min(100, Math.round((feitos / desafio.meta_treinos) * 100))
        return { feitos, meta: desafio.meta_treinos, pct }
    }

    async function salvar() {
        if (!form.titulo?.trim()) return showToast('Título obrigatório', 'erro')
        if (form.tipo === 'treino' && !form.meta_treinos) return showToast('Informe a meta de treinos', 'erro')
        const hoje = new Date().toISOString().split('T')[0]

        let dataFim = new Date()
        dataFim.setDate(dataFim.getDate() + parseInt(form.duracao_dias))

        try {
            const { error } = await supabase.from('desafios').insert({
                titulo: form.titulo.trim(),
                descricao: form.descricao || null,
                duracao_dias: parseInt(form.duracao_dias) || 30,
                data_inicio: hoje,
                data_fim: dataFim.toISOString().split('T')[0],
                status: 'ativo',
                tipo: form.tipo || 'geral',
                meta_treinos: form.tipo === 'treino' ? parseInt(form.meta_treinos) : null,
                meta_tipo: form.tipo === 'treino' ? (form.meta_tipo || 'por_semana') : null,
                modalidades: form.tipo === 'treino' && form.modalidades?.length > 0 ? form.modalidades : null,
            })
            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast('Desafio criado!')
                setShowModal(false)
                setForm({ duracao_dias: 30 })
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function handleConcluir(id) {
        try {
            const { error } = await supabase
                .from('desafios')
                .update({ status: 'concluído' })
                .eq('id', id)

            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast('Desafio concluído! 🏆')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function handleAbandonar(id) {
        setAbandonandoId(id)
    }

    async function executarAbandonar() {
        const id = abandonandoId
        setAbandonandoId(null)
        try {
            const { error } = await supabase
                .from('desafios')
                .update({ status: 'abandonado' })
                .eq('id', id)

            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast('Desafio encerrado')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function handleUpdateProgresso(id, progAtual, delta) {
        const novo = Math.min(100, Math.max(0, (progAtual || 0) + delta))
        try {
            const updates = { progresso: novo }
            if (novo >= 100) updates.status = 'concluído'
            await supabase.from('desafios').update(updates).eq('id', id)
            setDesafios(prev => prev.map(d => d.id === id ? { ...d, progresso: novo, ...(novo >= 100 ? { status: 'concluído' } : {}) } : d))
            showToast(novo >= 100 ? '🏆 Desafio concluído!' : `Progresso: ${novo}%`)
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    async function handleCheckin(desafioId) {
        try {
            // Check if already checked in today
            const { data, error } = await supabase
                .from('desafios_checkin')
                .select()
                .eq('desafio_id', desafioId)
                .eq('data', hojeIso)
                .maybeSingle()

            if (data) {
                showToast('Check-in já registrado hoje!', 'erro')
                return
            }

            const { error: insError } = await supabase.from('desafios_checkin').insert({
                desafio_id: desafioId,
                data: hojeIso,
                concluido: true
            })

            if (insError) {
                showToast('Erro check-in: ' + insError.message, 'erro')
            } else {
                showToast('Check-in registrado!')
                // Reload checkins
                const { data: newCheckins } = await supabase.from('desafios_checkin').select('*')
                setCheckins(newCheckins || [])
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>

    return (
        <div className="p-8 max-w-[900px] mx-auto text-text-primary">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary m-0">Desafios</h2>
                <button
                    onClick={() => {
                        setForm({ duracao_dias: 30, tipo: 'geral', modalidades: [] })
                        setShowModal(true)
                    }} 
                    className="px-4 py-2 text-[12px] font-medium bg-accent text-bg rounded-lg cursor-pointer border-0 transition-colors"
                >
                    + Novo Desafio
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {desafios.map(d => {
                    const diasPassados = Math.max(0, Math.floor((new Date() - new Date(d.data_inicio)) / (1000 * 60 * 60 * 24)))
                    const checkedInToday = checkins.some(c => c.desafio_id === d.id && c.data === hojeIso && c.concluido)

                    // Progresso: treino ou geral
                    const isTreino = d.tipo === 'treino' && d.meta_treinos
                    let progressoPct, treinoProg
                    if (isTreino) {
                        treinoProg = calcularProgressoTreino(d)
                        progressoPct = treinoProg.pct
                    } else {
                        const progSalvo = d.progresso ?? null
                        progressoPct = progSalvo !== null ? progSalvo : Math.min(100, Math.round((diasPassados / d.duracao_dias) * 100))
                    }

                    return (
                        <div key={d.id} className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        {isTreino && <span className="text-[12px]">💪</span>}
                                        <h3 className="text-[14px] font-semibold text-text-primary m-0">{d.titulo}</h3>
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                        d.status === 'ativo'
                                            ? 'bg-accent/15 text-accent border-accent/25'
                                            : d.status === 'concluído'
                                                ? 'bg-[#16A34A]/15 text-[#16A34A] border-[#16A34A]/25'
                                                : 'bg-[#1e1e1e] text-text-tertiary border-border'
                                    }`}>
                                        {d.status}
                                    </span>
                                </div>
                                {d.descricao && <p className="text-[12px] text-text-tertiary mb-3 mt-1">{d.descricao}</p>}

                                {/* Progresso de treino */}
                                {isTreino ? (
                                    <div className="mb-2">
                                        <div className="flex justify-between text-[11px] text-text-secondary mb-1">
                                            <span>
                                                🏋️ {treinoProg.feitos} / {treinoProg.meta} treinos
                                                {d.meta_tipo === 'por_semana' ? ' esta semana' : d.meta_tipo === 'por_mes' ? ' este mês' : ' no período'}
                                            </span>
                                            <span className="font-semibold text-accent">{progressoPct}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border mb-1">
                                            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{width: `${Math.min(100, progressoPct)}%`}} />
                                        </div>
                                        {d.modalidades?.length > 0 && (
                                            <div className="flex gap-1 flex-wrap mt-1.5">
                                                {d.modalidades.map(m => (
                                                    <span key={m} className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-full capitalize">{m}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-text-tertiary mt-1">Dia {Math.max(1, diasPassados)} de {d.duracao_dias}</div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-[11px] text-text-secondary mb-1">
                                            <span>Dia {Math.max(1, diasPassados)} de {d.duracao_dias}</span>
                                            <span className="font-semibold text-accent">{progressoPct}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border mb-2">
                                            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{width: `${progressoPct}%`}} />
                                        </div>

                                        {/* Botões de progresso apenas para desafios gerais */}
                                        {d.status === 'ativo' && (
                                            <div className="flex gap-1.5 mt-2">
                                                {[10, 25].map(delta => (
                                                    <button
                                                        key={delta}
                                                        onClick={() => handleUpdateProgresso(d.id, progressoPct, delta)}
                                                        disabled={progressoPct >= 100}
                                                        className="px-2.5 py-1 text-[11px] font-medium bg-bg border border-border text-text-secondary rounded hover:border-accent hover:text-accent cursor-pointer transition-colors border-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        +{delta}%
                                                    </button>
                                                ))}
                                                {progressoPct > 0 && (
                                                    <button
                                                        onClick={() => handleUpdateProgresso(d.id, progressoPct, -10)}
                                                        className="px-2.5 py-1 text-[11px] font-medium bg-bg border border-border text-text-tertiary rounded hover:border-priority-urgent hover:text-priority-urgent cursor-pointer transition-colors border-0"
                                                    >
                                                        −10%
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {d.status === 'ativo' && (
                                <div className="mt-4 pt-3 border-t border-border flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-text-tertiary">Check-in Diário:</span>
                                        {checkedInToday ? (
                                            <span className="text-[12px] font-semibold text-[#16A34A] flex items-center gap-1">
                                                ✓ Check-in feito hoje
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleCheckin(d.id)}
                                                className="bg-accent text-bg px-3 py-1 text-[11px] font-semibold rounded cursor-pointer border-0 hover:opacity-90"
                                            >
                                                Check-in hoje
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-1.5">
                                        <button
                                            onClick={() => handleConcluir(d.id)}
                                            className="bg-[#16A34A] text-bg px-3 py-1.5 text-[11px] font-semibold rounded cursor-pointer border-0 hover:opacity-90"
                                        >
                                            Concluir Desafio
                                        </button>
                                        <button
                                            onClick={() => handleAbandonar(d.id)}
                                            className="bg-transparent border border-border text-text-tertiary hover:text-priority-urgent hover:border-priority-urgent px-3 py-1.5 text-[11px] font-medium rounded cursor-pointer transition-colors"
                                        >
                                            Abandonar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
                {desafios.length === 0 && <p className="col-span-1 md:col-span-2 text-center text-[13px] text-text-tertiary py-8">Nenhum desafio ativo.</p>}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-xl w-full max-w-[440px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-[16px] font-semibold text-text-primary mb-4 m-0">Novo Desafio</h3>
                        <div className="space-y-4">
                            {/* Tipo de desafio */}
                            <div>
                                <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-2">Tipo</label>
                                <div className="flex gap-2">
                                    {[{v:'geral',l:'🎯 Geral'},{v:'treino',l:'💪 Treino'}].map(({v,l}) => (
                                        <button key={v} onClick={() => setForm({...form, tipo: v, modalidades: []})}
                                            className={`flex-1 px-3 py-2 text-[12px] font-medium rounded-lg border cursor-pointer transition-colors ${form.tipo === v ? 'bg-accent text-bg border-accent' : 'bg-bg text-text-secondary border-border hover:border-text-tertiary'}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-1">Título *</label>
                                <input
                                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]"
                                    placeholder={form.tipo === 'treino' ? 'Ex: 4x por semana em Maio' : 'Ex: Ler 30 minutos por dia'}
                                    value={form.titulo || ''}
                                    onChange={e => setForm({...form, titulo: e.target.value})}
                                />
                            </div>

                            {form.tipo === 'treino' ? (
                                <>
                                    {/* Meta de treino */}
                                    <div className="bg-bg border border-border rounded-lg p-3 space-y-3">
                                        <p className="text-[11px] text-text-tertiary uppercase tracking-widest m-0">Meta de treinos</p>
                                        <div className="flex gap-2">
                                            {[{v:'por_semana',l:'Por semana'},{v:'por_mes',l:'Por mês'},{v:'total',l:'Total no período'}].map(({v,l}) => (
                                                <button key={v} onClick={() => setForm({...form, meta_tipo: v})}
                                                    className={`flex-1 px-2 py-1.5 text-[11px] rounded border cursor-pointer transition-colors ${form.meta_tipo === v ? 'bg-accent text-bg border-accent' : 'bg-surface text-text-secondary border-border'}`}
                                                >{l}</button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number" min="1" max="99"
                                                className="w-20 bg-surface border border-border rounded px-2 py-1.5 text-[13px] text-text-primary outline-none [color-scheme:dark]"
                                                placeholder="4"
                                                value={form.meta_treinos || ''}
                                                onChange={e => setForm({...form, meta_treinos: e.target.value})}
                                            />
                                            <span className="text-[12px] text-text-secondary">
                                                treinos {form.meta_tipo === 'por_semana' ? 'por semana' : form.meta_tipo === 'por_mes' ? 'por mês' : 'no período total'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Modalidades */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-2">Modalidades (todas se vazio)</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {MODALIDADES_TREINO.map(m => {
                                                const sel = form.modalidades?.includes(m)
                                                return (
                                                    <button key={m} onClick={() => {
                                                        const mods = form.modalidades || []
                                                        setForm({...form, modalidades: sel ? mods.filter(x => x !== m) : [...mods, m]})
                                                    }}
                                                        className={`px-3 py-1 text-[11px] rounded-full border cursor-pointer transition-colors capitalize ${sel ? 'bg-accent text-bg border-accent' : 'bg-bg text-text-secondary border-border'}`}
                                                    >{m}</button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-1">Descrição</label>
                                    <textarea
                                        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark] resize-none"
                                        rows="2"
                                        value={form.descricao || ''}
                                        onChange={e => setForm({...form, descricao: e.target.value})}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-medium text-text-tertiary uppercase mb-1">Duração (dias)</label>
                                <input
                                    type="number"
                                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]"
                                    value={form.duracao_dias || ''}
                                    onChange={e => setForm({...form, duracao_dias: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => { setShowModal(false); setForm({ duracao_dias: 30, tipo: 'geral', modalidades: [] }) }}
                                className="px-4 py-2 text-[12px] text-text-secondary cursor-pointer bg-transparent border-0"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvar}
                                className="px-4 py-2 text-[12px] font-medium bg-accent text-bg rounded-lg cursor-pointer border-0"
                            >
                                Criar Desafio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Abandon Modal */}
            {abandonandoId && (
                <ModalConfirmacao
                    titulo="Abandonar desafio?"
                    mensagem="Tem certeza que quer abandonar este desafio?"
                    onConfirmar={executarAbandonar}
                    onCancelar={() => setAbandonandoId(null)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
