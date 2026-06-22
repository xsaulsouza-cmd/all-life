'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSkeleton } from '@/app/components/ui'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

const MODALIDADES = ['musculação', 'jiu-jitsu', 'pilates', 'corrida', 'outro']

const KPI_CONFIG = {
    'musculação': [
        { key: 'foco',   label: 'Grupo muscular / Foco',  placeholder: 'ex: Peito + Tríceps, Pernas...' },
        { key: 'volume', label: 'Série destaque',          placeholder: 'ex: Supino 5×5 @ 90kg' },
        { key: 'pr',     label: 'PR / Recorde pessoal',   placeholder: 'ex: Agachamento 120kg ✓' },
    ],
    'jiu-jitsu': [
        { key: 'tecnica', label: 'Técnica focada',         placeholder: 'ex: Guarda Aranha, Triângulo...' },
        { key: 'rounds',  label: 'Rounds / Sparring',      placeholder: 'ex: 6 rounds × 5min' },
        { key: 'nivel',   label: 'Nível do sparring',      placeholder: 'leve / técnico / forte' },
    ],
    'pilates': [
        { key: 'foco',       label: 'Exercícios focados', placeholder: 'ex: Prancha, Teaser, Roll-up...' },
        { key: 'progressao', label: 'Progressão',         placeholder: 'ex: Subiu nível, novo exercício' },
    ],
    'corrida': [
        { key: 'distancia', label: 'Distância (km)',      placeholder: 'ex: 5.2' },
        { key: 'pace',      label: 'Pace médio (min/km)', placeholder: 'ex: 5:30' },
        { key: 'fc',        label: 'FC média (bpm)',      placeholder: 'ex: 145' },
        { key: 'percurso',  label: 'Percurso / Local',   placeholder: 'ex: Parque, Rua, Esteira' },
    ],
    'outro': [],
}

// Formata KPIs para salvar em notas
function serializarKpis(kpis, modalidade) {
    const campos = KPI_CONFIG[modalidade] || []
    const linhas = campos.map(c => kpis[c.key] ? `${c.label}: ${kpis[c.key]}` : null).filter(Boolean)
    return linhas.join(' | ')
}

// Extrai KPIs da primeira linha de notas (formato "Label: Valor | Label2: Valor2")
function extrairKpiStr(notas) {
    if (!notas) return null
    const primeira = notas.split('\n')[0]
    if (primeira.includes(': ') && primeira.includes(' | ')) return primeira
    if (primeira.includes(': ') && !primeira.includes('\n')) return primeira
    return null
}

export default function TreinosPage() {
    const [treinos, setTreinos] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState('Todos')
    const [showModal, setShowModal] = useState(false) // false | 'novo' | 'editar'
    const [editandoTreino, setEditandoTreino] = useState(null)
    const [excluindoId, setExcluindoId] = useState(null)
    
    const hojeIso = new Date().toISOString().split('T')[0]
    const [form, setForm] = useState({ data: hojeIso, modalidade: 'musculação', intensidade: 'moderada', duracao_minutos: 60, notas: '', concluido: true, kpis: {} })

    useEffect(() => {
        carregar()
    }, [])

    async function carregar() {
        setLoading(true)
        try {
            const { data } = await supabase.from('treinos').select('*').order('data', { ascending: false })
            setTreinos(data || [])
        } catch (e) {
            showToast('Erro ao carregar treinos: ' + e.message, 'erro')
        } finally {
            setLoading(false)
        }
    }

    async function salvarTreino() {
        // Serializa KPIs + notas livres
        const kpiStr = serializarKpis(form.kpis || {}, form.modalidade)
        const notasLivres = form.notas || ''
        const notasFinal = [kpiStr, notasLivres].filter(Boolean).join('\n') || null

        const payload = {
            data: form.data,
            modalidade: form.modalidade,
            intensidade: form.intensidade,
            duracao_minutos: parseInt(form.duracao_minutos) || 0,
            notas: notasFinal,
            concluido: form.concluido
        }

        try {
            if (showModal === 'novo') {
                const { error } = await supabase.from('treinos').insert(payload)
                if (error) {
                    showToast('Erro: ' + error.message, 'erro')
                } else {
                    showToast('Treino registrado!')
                }
            } else if (showModal === 'editar' && editandoTreino) {
                const { error } = await supabase.from('treinos').update(payload).eq('id', editandoTreino.id)
                if (error) {
                    showToast('Erro: ' + error.message, 'erro')
                } else {
                    showToast('Treino atualizado!')
                }
            }
            setShowModal(false)
            setEditandoTreino(null)
            setForm({ data: hojeIso, modalidade: 'musculação', intensidade: 'moderada', duracao_minutos: 60, notas: '', concluido: true, kpis: {} })
            carregar()
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    function handleEditar(t) {
        setForm({
            data: t.data || hojeIso,
            modalidade: t.modalidade || 'musculação',
            intensidade: t.intensidade || 'moderada',
            duracao_minutos: t.duracao_minutos || 60,
            notas: t.notas || '',
            concluido: t.concluido ?? true
        })
        setEditandoTreino(t)
        setShowModal('editar')
    }

    function handleExcluir(id) {
        setExcluindoId(id)
    }

    async function executarExclusao() {
        const id = excluindoId
        setExcluindoId(null)
        try {
            const { error } = await supabase.from('treinos').delete().eq('id', id)
            if (error) {
                showToast('Erro ao remover: ' + error.message, 'erro')
            } else {
                showToast('Treino removido')
                carregar()
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>

    const treinosFiltrados = filtro === 'Todos' ? treinos : treinos.filter(t => t.modalidade.toLowerCase() === filtro.toLowerCase())

    // KPIs (only consider completed workouts)
    const mesAtualIso = hojeIso.substring(0, 7) // YYYY-MM
    const treinosConcluidos = treinos.filter(t => t.concluido ?? true)
    const treinosEsteMes = treinosConcluidos.filter(t => t.data.startsWith(mesAtualIso))
    const horasTotais = Math.round(treinosEsteMes.reduce((acc, t) => acc + (t.duracao_minutos || 0), 0) / 60)
    
    const frequencias = treinosEsteMes.reduce((acc, t) => {
        acc[t.modalidade] = (acc[t.modalidade] || 0) + 1
        return acc
    }, {})
    let modFrequente = '-'
    let maxFreq = 0
    Object.entries(frequencias).forEach(([mod, qtd]) => {
        if (qtd > maxFreq) { maxFreq = qtd; modFrequente = mod }
    })

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase mb-1"
    const inp = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]"

    return (
        <div className="p-8 max-w-[900px] mx-auto text-text-primary">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary m-0">Registro de Treinos</h2>
                <button 
                    onClick={() => {
                        setForm({ data: hojeIso, modalidade: 'musculação', intensidade: 'moderada', duracao_minutos: 60, notas: '', concluido: true, kpis: {} })
                        setEditandoTreino(null)
                        setShowModal('novo')
                    }}
                    className="px-4 py-2 text-[12px] font-medium bg-accent text-bg rounded-lg cursor-pointer border-0 transition-colors"
                >
                    + Registrar Treino
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-surface border border-border rounded-xl p-4">
                    <span className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Treinos este mês</span>
                    <span className="text-[24px] font-semibold text-text-primary">{treinosEsteMes.length}</span>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                    <span className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Horas Totais</span>
                    <span className="text-[24px] font-semibold text-text-primary">{horasTotais}h</span>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                    <span className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Mais Frequente</span>
                    <span className="text-[20px] font-semibold text-text-primary capitalize">{modFrequente}</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 mb-6">
                {['Todos', 'Musculação', 'Jiu-Jitsu', 'Pilates', 'Corrida'].map(f => (
                    <button 
                        key={f} 
                        onClick={() => setFiltro(f)}
                        className={`px-3 py-1.5 rounded-full text-[12px] transition-colors border cursor-pointer ${
                            filtro === f 
                                ? 'bg-text-primary text-bg border-text-primary font-medium' 
                                : 'bg-transparent text-text-secondary border-border hover:border-text-tertiary'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Lista de treinos */}
            <div className="space-y-3">
                {treinosFiltrados.map(t => {
                    const concluido = t.concluido ?? true
                    return (
                        <div 
                            key={t.id} 
                            className={`bg-surface border border-border rounded-xl p-4 flex justify-between items-center transition-opacity ${
                                !concluido ? 'opacity-50' : ''
                            }`}
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-[14px] font-medium text-text-primary m-0 capitalize">{t.modalidade}</h3>
                                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                        t.intensidade === 'intensa' 
                                            ? 'bg-priority-urgent/20 text-priority-urgent' 
                                            : t.intensidade === 'moderada' 
                                                ? 'bg-priority-high/20 text-priority-high' 
                                                : 'bg-[#2563EB]/20 text-[#2563EB]'
                                    }`}>
                                        {t.intensidade}
                                    </span>
                                    {!concluido && (
                                        <span className="bg-bg text-text-tertiary text-[10px] uppercase px-1.5 py-0.5 rounded border border-border">
                                            Não Concluído
                                        </span>
                                    )}
                                </div>
                                {t.notas && (() => {
                                    const kpiLine = extrairKpiStr(t.notas)
                                    const freeNotes = kpiLine ? t.notas.split('\n').slice(1).join('\n').trim() : t.notas
                                    return (
                                        <>
                                            {kpiLine && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {kpiLine.split(' | ').map((kv, i) => (
                                                        <span key={i} className="text-[10px] bg-bg border border-border text-text-secondary px-2 py-0.5 rounded-full">{kv}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {freeNotes && <p className="text-[12px] text-text-tertiary m-0 mt-1">{freeNotes}</p>}
                                        </>
                                    )
                                })()}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="block text-[13px] text-text-primary font-medium">{new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                    <span className="text-[12px] text-text-tertiary">{t.duracao_minutos} min</span>
                                </div>
                                <div className="flex gap-1 border-l border-border pl-3">
                                    <button 
                                        onClick={() => handleEditar(t)} 
                                        className="text-[12px] text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1" 
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        onClick={() => handleExcluir(t.id)} 
                                        className="text-[12px] text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-1" 
                                        title="Excluir"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
                {treinosFiltrados.length === 0 && <p className="text-center text-[13px] text-text-tertiary py-8">Nenhum treino registrado.</p>}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-xl w-full max-w-[400px] p-6 shadow-2xl">
                        <h3 className="text-[16px] font-semibold text-text-primary mb-4 m-0">
                            {showModal === 'novo' ? 'Registrar Treino' : 'Editar Treino'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className={lbl}>Data</label>
                                <input type="date" className={inp} value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                            </div>
                            <div>
                                <label className={lbl}>Modalidade</label>
                                <select className={inp} value={form.modalidade} onChange={e => setForm({...form, modalidade: e.target.value, kpis: {}})}>
                                    {MODALIDADES.map(m => (
                                        <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                    ))}
                                </select>
                            </div>

                            {/* KPIs por modalidade */}
                            {(KPI_CONFIG[form.modalidade] || []).length > 0 && (
                                <div className="bg-bg rounded-lg border border-border p-3 space-y-2">
                                    <p className="text-[10px] text-text-tertiary uppercase tracking-widest m-0 mb-2">KPIs da sessão</p>
                                    {KPI_CONFIG[form.modalidade].map(campo => (
                                        <div key={campo.key}>
                                            <label className="block text-[11px] text-text-tertiary mb-1">{campo.label}</label>
                                            <input
                                                type="text"
                                                className={inp + ' !py-1.5'}
                                                placeholder={campo.placeholder}
                                                value={form.kpis?.[campo.key] || ''}
                                                onChange={e => setForm({...form, kpis: {...(form.kpis||{}), [campo.key]: e.target.value}})}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Duração (min)</label>
                                    <input type="number" className={inp} value={form.duracao_minutos} onChange={e => setForm({...form, duracao_minutos: e.target.value})} />
                                </div>
                                <div>
                                    <label className={lbl}>Intensidade</label>
                                    <select className={inp} value={form.intensidade} onChange={e => setForm({...form, intensidade: e.target.value})}>
                                        <option value="leve">Leve</option>
                                        <option value="moderada">Moderada</option>
                                        <option value="intensa">Intensa</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={lbl}>Notas / Sensação</label>
                                <textarea className={inp} rows="2" placeholder="Como foi o treino? Observações..." value={form.notas || ''} onChange={e => setForm({...form, notas: e.target.value})} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="concluido" 
                                    checked={form.concluido} 
                                    onChange={e => setForm({...form, concluido: e.target.checked})} 
                                    className="accent-accent cursor-pointer"
                                />
                                <label htmlFor="concluido" className="text-[12px] text-text-primary cursor-pointer select-none">Concluído?</label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                                onClick={() => {
                                    setShowModal(false)
                                    setEditandoTreino(null)
                                }} 
                                className="px-4 py-2 text-[12px] text-text-secondary cursor-pointer bg-transparent border-0"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={salvarTreino} 
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
                    titulo="Excluir treino?"
                    mensagem="Esta ação não pode ser desfeita e removerá o registro do histórico."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setExcluindoId(null)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
