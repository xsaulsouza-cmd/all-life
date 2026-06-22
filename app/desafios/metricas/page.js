'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

const FORM_VAZIO = { peso: '', gordura_pct: '', sono_horas: '', hrv: '', energia: '', pressao: '', fc_repouso: '', notas: '' }

const ENERGIA_LABELS = { 1: '😴 Péssima', 2: '😕 Ruim', 3: '😐 Ok', 4: '😊 Boa', 5: '🔥 Ótima' }

function TrendIcon({ valores }) {
    if (valores.length < 2) return null
    const diff = valores[valores.length - 1] - valores[0]
    if (Math.abs(diff) < 0.1) return <span className="text-text-tertiary text-[11px]">→</span>
    return diff < 0
        ? <span className="text-[#22C55E] text-[11px]">↓ {Math.abs(diff).toFixed(1)}</span>
        : <span className="text-[#DC2626] text-[11px]">↑ {Math.abs(diff).toFixed(1)}</span>
}

function SparkLine({ dados, cor = '#8B8BF9', height = 32 }) {
    if (dados.length < 2) return <div className="h-8 flex items-center text-[11px] text-text-tertiary">poucos dados</div>
    const min = Math.min(...dados)
    const max = Math.max(...dados)
    const range = max - min || 1
    const w = 120, h = height
    const pts = dados.map((v, i) => {
        const x = (i / (dados.length - 1)) * w
        const y = h - ((v - min) / range) * (h - 4) - 2
        return `${x},${y}`
    }).join(' ')
    return (
        <svg width={w} height={h} className="overflow-visible">
            <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    )
}

export default function MetricasPage() {
    const [registros, setRegistros] = useState([])
    const [loading, setLoading]     = useState(true)
    const [showForm, setShowForm]   = useState(false)
    const [form, setForm]           = useState(FORM_VAZIO)
    const [saving, setSaving]       = useState(false)
    const [janela, setJanela]       = useState(30) // dias

    useEffect(() => { carregar() }, [janela])

    async function carregar() {
        const desde = new Date()
        desde.setDate(desde.getDate() - janela)
        const { data } = await supabase
            .from('metricas_corporais')
            .select('*')
            .gte('data', desde.toISOString().split('T')[0])
            .order('data', { ascending: true })
        setRegistros(data || [])
        setLoading(false)
    }

    async function salvar() {
        setSaving(true)
        const hojeIso = new Date().toISOString().split('T')[0]
        const payload = {
            data: hojeIso,
            peso:       parseFloat(form.peso)        || null,
            gordura_pct: parseFloat(form.gordura_pct) || null,
            sono_horas: parseFloat(form.sono_horas)  || null,
            hrv:        parseFloat(form.hrv)         || null,
            energia:    parseInt(form.energia)       || null,
            pressao:    form.pressao.trim() || null,
            fc_repouso: parseFloat(form.fc_repouso)  || null,
            notas:      form.notas.trim() || null,
        }

        // Upsert por data
        const existente = registros.find(r => r.data === hojeIso)
        let novoReg
        if (existente) {
            const { data: upd } = await supabase.from('metricas_corporais').update(payload).eq('id', existente.id).select().single()
            novoReg = upd
            setRegistros(prev => prev.map(r => r.id === existente.id ? upd : r))
        } else {
            const { data: ins } = await supabase.from('metricas_corporais').insert(payload).select().single()
            novoReg = ins
            setRegistros(prev => [...prev, ins].sort((a, b) => a.data.localeCompare(b.data)))
        }
        setForm(FORM_VAZIO)
        setShowForm(false)
        setSaving(false)
    }

    async function excluir(id) {
        await supabase.from('metricas_corporais').delete().eq('id', id)
        setRegistros(prev => prev.filter(r => r.id !== id))
    }

    const { ultimo, pesos, sonos, hrvs, energias } = useMemo(() => {
        const ultimo = registros.length ? registros[registros.length - 1] : null
        const pesos    = registros.map(r => r.peso).filter(Boolean)
        const sonos    = registros.map(r => r.sono_horas).filter(Boolean)
        const hrvs     = registros.map(r => r.hrv).filter(Boolean)
        const energias = registros.map(r => r.energia).filter(Boolean)
        return { ultimo, pesos, sonos, hrvs, energias }
    }, [registros])

    const energiaMedia = energias.length ? (energias.reduce((a, b) => a + b, 0) / energias.length).toFixed(1) : null

    if (loading) return (
        <div className="p-8 space-y-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-surface border border-border rounded-xl animate-pulse" />)}
        </div>
    )

    return (
        <div className="p-8 max-w-[900px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
                    {[7, 30, 90].map(d => (
                        <button key={d} onClick={() => setJanela(d)}
                            className={`text-[12px] px-3 py-1 rounded-md cursor-pointer border-0 transition-colors ${janela === d ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary bg-transparent'}`}
                        >{d}d</button>
                    ))}
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="text-[13px] px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 cursor-pointer border-0"
                >
                    + Registrar hoje
                </button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Peso',     valor: ultimo?.peso        ? `${ultimo.peso}kg`              : '—', dados: pesos,    cor: '#8B8BF9', key: 'peso' },
                    { label: 'Gordura',  valor: ultimo?.gordura_pct ? `${ultimo.gordura_pct}%`         : '—', dados: [], cor: '#D97706', key: 'gordura' },
                    { label: 'Sono',     valor: ultimo?.sono_horas  ? `${ultimo.sono_horas}h`          : '—', dados: sonos,   cor: '#22C55E', key: 'sono' },
                    { label: 'HRV',      valor: ultimo?.hrv         ? `${ultimo.hrv}ms`               : '—', dados: hrvs,    cor: '#2563EB', key: 'hrv' },
                ].map(m => (
                    <div key={m.key} className="bg-surface border border-border rounded-xl p-4">
                        <p className="text-[11px] text-text-tertiary uppercase tracking-wider m-0 mb-1">{m.label}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[20px] font-bold text-text-primary">{m.valor}</span>
                            {m.dados.length >= 2 && <TrendIcon valores={m.dados} />}
                        </div>
                        <div className="mt-2">
                            <SparkLine dados={m.dados} cor={m.cor} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Energia + FC Repouso */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surface border border-border rounded-xl p-5">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-3">Energia ({janela} dias)</h3>
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-[28px] font-bold text-text-primary">{energiaMedia || '—'}</span>
                            <span className="text-[12px] text-text-tertiary ml-1">/5</span>
                            <p className="text-[11px] text-text-tertiary m-0 mt-0.5">média</p>
                        </div>
                        <SparkLine dados={energias} cor="#EAB308" height={40} />
                    </div>
                    <div className="mt-3 space-y-1">
                        {[5,4,3].map(n => {
                            const count = energias.filter(e => e === n).length
                            const pct = energias.length ? (count / energias.length * 100) : 0
                            return (
                                <div key={n} className="flex items-center gap-2 text-[11px]">
                                    <span className="w-16 text-text-tertiary">{ENERGIA_LABELS[n]}</span>
                                    <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden border border-border">
                                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-text-tertiary w-5 text-right">{count}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-5">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-3">FC em Repouso</h3>
                    {(() => {
                        const fcs = registros.map(r => r.fc_repouso).filter(Boolean)
                        const ultFc = registros.filter(r => r.fc_repouso).slice(-1)[0]
                        return (
                            <>
                                <div className="flex items-baseline gap-2 mb-3">
                                    <span className="text-[28px] font-bold text-text-primary">{ultFc?.fc_repouso || '—'}</span>
                                    {ultFc?.fc_repouso && <span className="text-[12px] text-text-tertiary">bpm</span>}
                                    {fcs.length >= 2 && <TrendIcon valores={fcs} />}
                                </div>
                                <SparkLine dados={fcs} cor="#DC2626" height={40} />
                                {ultimo?.pressao && (
                                    <p className="text-[11px] text-text-tertiary mt-2 m-0">Pressão: {ultimo.pressao}</p>
                                )}
                            </>
                        )
                    })()}
                </div>
            </div>

            {/* Histórico tabela */}
            {registros.length > 0 && (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                        <h3 className="text-[13px] font-semibold text-text-primary m-0">Histórico</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Data','Peso','Gordura','Sono','HRV','Energia','FC Rep.','Pressão'].map(h => (
                                        <th key={h} className="text-left px-3 py-2 text-text-tertiary font-medium">{h}</th>
                                    ))}
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {[...registros].reverse().map(r => (
                                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg/50 group">
                                        <td className="px-3 py-2 text-text-secondary font-medium">
                                            {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
                                        </td>
                                        <td className="px-3 py-2 text-text-primary">{r.peso ? `${r.peso}kg` : '—'}</td>
                                        <td className="px-3 py-2 text-text-secondary">{r.gordura_pct ? `${r.gordura_pct}%` : '—'}</td>
                                        <td className="px-3 py-2 text-text-secondary">{r.sono_horas ? `${r.sono_horas}h` : '—'}</td>
                                        <td className="px-3 py-2 text-text-secondary">{r.hrv ? `${r.hrv}ms` : '—'}</td>
                                        <td className="px-3 py-2 text-text-secondary">{r.energia ? `${r.energia}/5` : '—'}</td>
                                        <td className="px-3 py-2 text-text-secondary">{r.fc_repouso ? `${r.fc_repouso}bpm` : '—'}</td>
                                        <td className="px-3 py-2 text-text-secondary">{r.pressao || '—'}</td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => excluir(r.id)}
                                                className="opacity-0 group-hover:opacity-100 text-[11px] text-[#DC2626] hover:underline cursor-pointer bg-transparent border-0 p-0 transition-opacity">
                                                excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {registros.length === 0 && (
                <div className="text-center py-16 text-text-tertiary">
                    <p className="text-[32px] mb-2">📊</p>
                    <p className="text-[14px]">Nenhum registro nos últimos {janela} dias.</p>
                    <button onClick={() => setShowForm(true)} className="mt-3 text-[13px] text-accent hover:underline cursor-pointer bg-transparent border-0 p-0">
                        Registrar agora →
                    </button>
                </div>
            )}

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-[460px] p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-[15px] font-semibold text-text-primary m-0 mb-4">Registrar métricas de hoje</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'peso',       label: 'Peso (kg)',         type: 'number', placeholder: 'Ex: 80.5' },
                                { key: 'gordura_pct',label: 'Gordura corporal (%)', type: 'number', placeholder: 'Ex: 18.2' },
                                { key: 'sono_horas', label: 'Sono (horas)',      type: 'number', placeholder: 'Ex: 7.5' },
                                { key: 'hrv',        label: 'HRV (ms)',          type: 'number', placeholder: 'Ex: 42' },
                                { key: 'fc_repouso', label: 'FC repouso (bpm)',  type: 'number', placeholder: 'Ex: 58' },
                                { key: 'pressao',    label: 'Pressão arterial',  type: 'text',   placeholder: 'Ex: 120/80' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">{f.label}</label>
                                    <input
                                        type={f.type}
                                        placeholder={f.placeholder}
                                        value={form[f.key]}
                                        onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary"
                                    />
                                </div>
                            ))}
                            <div className="col-span-2">
                                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Energia subjetiva</label>
                                <div className="flex gap-2">
                                    {[1,2,3,4,5].map(n => (
                                        <button key={n} onClick={() => setForm(f => ({ ...f, energia: n }))}
                                            className={`flex-1 py-2 rounded-lg border text-[12px] cursor-pointer transition-colors ${form.energia === n ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary bg-bg hover:bg-surface'}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                {form.energia && <p className="text-[11px] text-text-tertiary mt-1">{ENERGIA_LABELS[form.energia]}</p>}
                            </div>
                            <div className="col-span-2">
                                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Notas</label>
                                <textarea
                                    value={form.notas}
                                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                                    placeholder="Como foi o dia, sono, recuperação..."
                                    rows={2}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-lg px-4 py-2 text-[13px] text-text-secondary cursor-pointer hover:bg-bg bg-surface">
                                Cancelar
                            </button>
                            <button onClick={salvar} disabled={saving} className="flex-1 bg-accent text-white rounded-lg px-4 py-2 text-[13px] cursor-pointer border-0 hover:bg-accent/90 disabled:opacity-50">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
