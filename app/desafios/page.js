'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ICON_TREINO = { 'musculação': '🏋️', 'jiu-jitsu': '🥋', 'pilates': '🧘', 'corrida': '🏃', 'outro': '⚡' }
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const COR_ENERGIA = ['', '#DC2626', '#D97706', '#EAB308', '#22C55E', '#8B8BF9']

function KpiCard({ icon, label, valor, sub, href, cor }) {
    const inner = (
        <div className="bg-surface border border-border rounded-xl p-4 hover:border-text-tertiary transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-2">
                <span className="text-[20px]">{icon}</span>
                {cor && <span className="w-2 h-2 rounded-full mt-1" style={{ background: cor }} />}
            </div>
            <p className="text-[11px] text-text-tertiary uppercase tracking-wider m-0 mb-1">{label}</p>
            <p className="text-[22px] font-bold text-text-primary m-0 leading-tight">{valor ?? '—'}</p>
            {sub && <p className="text-[11px] text-text-tertiary m-0 mt-1">{sub}</p>}
        </div>
    )
    return href ? <Link href={href} className="no-underline">{inner}</Link> : inner
}

function MiniBar({ valor, meta, cor = '#8B8BF9' }) {
    const pct = meta ? Math.min(100, Math.round((valor / meta) * 100)) : 0
    return (
        <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-border">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor }} />
        </div>
    )
}

export default function SaudeDashboard() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        habitosHoje: [], registrosHoje: [], registros30: [],
        treinosSemana: [], metas: [],
        ultimaMetrica: null, nutricaoHoje: [], nutricaoMeta: null,
    })

    useEffect(() => { carregar() }, [])

    async function carregar() {
        const hojeIso    = new Date().toISOString().split('T')[0]
        const diaSemana  = new Date().getDay()
        const diaNome    = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][diaSemana]

        // Início da semana (segunda-feira)
        const seg = new Date()
        seg.setDate(seg.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
        const inicioSemana = seg.toISOString().split('T')[0]

        // 30 dias atrás
        const d30 = new Date(); d30.setDate(d30.getDate() - 30)
        const iso30 = d30.toISOString().split('T')[0]

        const [
            { data: habitos },
            { data: regHoje },
            { data: reg30 },
            { data: treinos },
            { data: metas },
            { data: metricas },
            { data: nutHoje },
            { data: nutMeta },
        ] = await Promise.all([
            supabase.from('habitos').select('id,nome,frequencia,dias_semana').eq('ativo', true),
            supabase.from('habitos_registro').select('*').eq('data', hojeIso),
            supabase.from('habitos_registro').select('*').gte('data', iso30),
            supabase.from('treinos').select('*').gte('data', inicioSemana),
            supabase.from('metas').select('*').eq('status', 'ativa').limit(4),
            supabase.from('metricas_corporais').select('*').order('data', { ascending: false }).limit(1),
            supabase.from('nutricao_registros').select('*').eq('data', hojeIso),
            supabase.from('nutricao_metas').select('*').limit(1),
        ])

        const habitosFiltrados = (habitos || []).filter(h => {
            if (h.frequencia === 'diária') return true
            if (h.frequencia === 'semanal') return h.dias_semana?.includes(diaNome)
            return false
        })

        setData({
            habitosHoje: habitosFiltrados,
            registrosHoje: regHoje || [],
            registros30: reg30 || [],
            treinosSemana: treinos || [],
            metas: metas || [],
            ultimaMetrica: metricas?.[0] || null,
            nutricaoHoje: nutHoje || [],
            nutricaoMeta: nutMeta?.[0] || null,
        })
        setLoading(false)
    }

    async function toggleHabito(habitoId, concluido) {
        const hojeIso = new Date().toISOString().split('T')[0]
        // Optimistic update — sem refetch
        if (concluido) {
            setData(prev => ({
                ...prev,
                registrosHoje: [...prev.registrosHoje, { habito_id: habitoId, data: hojeIso, concluido: true }]
            }))
            await supabase.from('habitos_registro').insert({ habito_id: habitoId, data: hojeIso, concluido: true })
        } else {
            setData(prev => ({
                ...prev,
                registrosHoje: prev.registrosHoje.filter(r => r.habito_id !== habitoId)
            }))
            await supabase.from('habitos_registro').delete().eq('habito_id', habitoId).eq('data', hojeIso)
        }
    }

    const {
        habitosConcluidosHoje, caloHoje, calMeta, protHoje, protMeta,
        treinosPorDia, streakMax, ultimoPeso, ultimoSono,
    } = useMemo(() => {
        const { habitosHoje, registrosHoje, registros30, treinosSemana, ultimaMetrica, nutricaoHoje, nutricaoMeta } = data

        const habitosConcluidosHoje = registrosHoje.filter(r => r.concluido).length

        // Nutrição de hoje
        const caloHoje = nutricaoHoje.reduce((a, r) => a + (r.calorias || 0), 0)
        const protHoje = nutricaoHoje.reduce((a, r) => a + (r.proteina || 0), 0)
        const calMeta  = nutricaoMeta?.calorias || 2000
        const protMeta = nutricaoMeta?.proteina || 150

        // Treinos por dia desta semana (0=Dom...6=Sab)
        const treinosPorDia = Array(7).fill(null)
        treinosSemana.forEach(t => {
            const d = new Date(t.data + 'T12:00:00').getDay()
            if (!treinosPorDia[d]) treinosPorDia[d] = []
            treinosPorDia[d].push(t)
        })

        // Streak máximo dos hábitos (pega o maior)
        let streakMax = 0
        const habIds = [...new Set(registros30.map(r => r.habito_id))]
        habIds.forEach(id => {
            let s = 0
            for (let i = 0; i < 30; i++) {
                const d = new Date(); d.setDate(d.getDate() - i)
                const str = d.toISOString().split('T')[0]
                if (registros30.some(r => r.habito_id === id && r.data === str && r.concluido)) s++
                else if (i > 0) break
            }
            if (s > streakMax) streakMax = s
        })

        return {
            habitosConcluidosHoje,
            caloHoje, calMeta, protHoje, protMeta,
            treinosPorDia,
            streakMax,
            ultimoPeso: ultimaMetrica?.peso ?? null,
            ultimoSono: ultimaMetrica?.sono_horas ?? null,
        }
    }, [data])

    if (loading) {
        return (
            <div className="p-8 grid grid-cols-4 gap-4 max-w-[1100px] mx-auto">
                {Array(8).fill(0).map((_, i) => (
                    <div key={i} className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
                ))}
            </div>
        )
    }

    const hoje = new Date()
    const diaSemana = hoje.getDay() || 7 // 1=Seg...7=Dom
    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - diaSemana + 1)

    const diasSemana = Array.from({length: 7}, (_, i) => {
        const d = new Date(inicioSemana)
        d.setDate(inicioSemana.getDate() + i)
        return d.toISOString().split('T')[0]
    })

    return (
        <div className="p-8 max-w-[1100px] mx-auto space-y-8">

            {/* ── KPIs ─────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                    icon="✅" label="Hábitos hoje" href="/desafios/habitos"
                    valor={`${habitosConcluidosHoje}/${data.habitosHoje.length}`}
                    sub={habitosConcluidosHoje === data.habitosHoje.length && data.habitosHoje.length > 0 ? '🎉 Todos feitos!' : 'pendentes'}
                />
                <KpiCard
                    icon="🏋️" label="Treinos semana" href="/desafios/treinos"
                    valor={data.treinosSemana.length}
                    sub={data.treinosSemana.map(t => ICON_TREINO[t.modalidade?.toLowerCase()] || '⚡').join(' ') || 'nenhum ainda'}
                />
                <KpiCard
                    icon="🔥" label="Maior streak" href="/desafios/habitos"
                    valor={streakMax > 0 ? `${streakMax}d` : '—'}
                    sub="dias consecutivos"
                />
                <KpiCard
                    icon="⚖️" label="Peso atual" href="/desafios/metricas"
                    valor={ultimoPeso ? `${ultimoPeso}kg` : '—'}
                    sub={data.ultimaMetrica?.data ? `em ${new Date(data.ultimaMetrica.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}` : 'não registrado'}
                />
                <KpiCard
                    icon="🍽️" label="Calorias hoje" href="/desafios/nutricao"
                    valor={caloHoje ? `${caloHoje} kcal` : '—'}
                    sub={calMeta ? `meta: ${calMeta} kcal` : ''}
                    cor={caloHoje > calMeta * 1.1 ? '#DC2626' : caloHoje > calMeta * 0.8 ? '#22C55E' : null}
                />
                <KpiCard
                    icon="🥩" label="Proteína hoje" href="/desafios/nutricao"
                    valor={protHoje ? `${Math.round(protHoje)}g` : '—'}
                    sub={protMeta ? `meta: ${protMeta}g` : ''}
                />
                <KpiCard
                    icon="😴" label="Sono" href="/desafios/metricas"
                    valor={ultimoSono ? `${ultimoSono}h` : '—'}
                    sub="última noite registrada"
                />
                <KpiCard
                    icon="📊" label="HRV" href="/desafios/metricas"
                    valor={data.ultimaMetrica?.hrv ? `${data.ultimaMetrica.hrv}ms` : '—'}
                    sub={data.ultimaMetrica?.energia ? `energia ${data.ultimaMetrica.energia}/5` : 'não registrado'}
                />
            </div>

            {/* ── Semana de Treinos ─────────────────── */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[14px] font-semibold text-text-primary m-0">Semana de Treinos</h2>
                    <Link href="/desafios/treinos" className="text-[11px] text-accent no-underline hover:underline">
                        Ver todos →
                    </Link>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }, (_, i) => {
                        const nomesDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
                        const dateStr = diasSemana[i]
                        const treinosDoDia = data.treinosSemana.filter(t => t.data === dateStr)
                        const icone = treinosDoDia.length > 0 ? ICON_TREINO[treinosDoDia[0].modalidade?.toLowerCase()] || '⚡' : null
                        
                        const hojeStr = new Date().toISOString().split('T')[0]
                        const isHoje = dateStr === hojeStr

                        return (
                            <div 
                                key={i} 
                                className={`flex flex-col items-center gap-2 p-2 rounded-lg border transition-colors ${isHoje ? 'bg-accent/5 border-accent' : 'border-border'}`}
                            >
                                <span className={`text-[10px] font-medium uppercase ${isHoje ? 'text-accent' : 'text-text-tertiary'}`}>
                                    {nomesDias[i]}
                                </span>
                                {icone ? (
                                    <div 
                                        className="w-8 h-8 rounded-full border border-accent flex items-center justify-center bg-accent/5 cursor-help"
                                        title={treinosDoDia.map(t => `${t.modalidade} · ${t.duracao_minutos}min`).join(', ')}
                                    >
                                        <span className="text-[16px]">{icone}</span>
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
                                        <span className="text-text-tertiary text-[10px]">—</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* ── Hábitos de hoje ────────────────── */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[14px] font-semibold text-text-primary m-0">Hábitos de hoje</h2>
                        <Link href="/desafios/habitos" className="text-[11px] text-accent no-underline hover:underline">Gerenciar →</Link>
                    </div>
                    <div className="space-y-2">
                        {data.habitosHoje.map(hab => {
                            const isDone = data.registrosHoje.some(r => r.habito_id === hab.id && r.concluido)
                            return (
                                <label key={hab.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-bg/50 cursor-pointer hover:border-text-tertiary transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isDone}
                                        onChange={e => toggleHabito(hab.id, e.target.checked)}
                                        className="accent-accent w-4 h-4 cursor-pointer"
                                    />
                                    <span className={`text-[13px] ${isDone ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                                        {hab.nome}
                                    </span>
                                    {isDone && <span className="ml-auto text-[11px] text-status-done">✓</span>}
                                </label>
                            )
                        })}
                        {data.habitosHoje.length === 0 && (
                            <p className="text-[13px] text-text-tertiary text-center py-4">Nenhum hábito programado para hoje.</p>
                        )}
                    </div>
                </div>

                {/* ── Nutrição hoje ──────────────────── */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[14px] font-semibold text-text-primary m-0">Nutrição hoje</h2>
                        <Link href="/desafios/nutricao" className="text-[11px] text-accent no-underline hover:underline">Registrar →</Link>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: 'Calorias', valor: caloHoje, meta: calMeta, unit: 'kcal', cor: '#8B8BF9' },
                            { label: 'Proteína', valor: Math.round(protHoje), meta: data.nutricaoMeta?.proteina || 150, unit: 'g', cor: '#22C55E' },
                            { label: 'Carboidratos', valor: Math.round(data.nutricaoHoje.reduce((a, r) => a + (r.carbo || 0), 0)), meta: data.nutricaoMeta?.carbo || 250, unit: 'g', cor: '#EAB308' },
                            { label: 'Gordura', valor: Math.round(data.nutricaoHoje.reduce((a, r) => a + (r.gordura || 0), 0)), meta: data.nutricaoMeta?.gordura || 65, unit: 'g', cor: '#D97706' },
                        ].map(m => (
                            <div key={m.label}>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span className="text-text-secondary">{m.label}</span>
                                    <span className="text-text-tertiary">{m.valor || 0}<span className="text-[10px]">/{m.meta}{m.unit}</span></span>
                                </div>
                                <MiniBar valor={m.valor || 0} meta={m.meta} cor={m.cor} />
                            </div>
                        ))}
                        {data.nutricaoHoje.length === 0 && (
                            <p className="text-[13px] text-text-tertiary text-center pt-2">Nenhum registro hoje.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Metas em andamento ─────────────────── */}
            {data.metas.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[14px] font-semibold text-text-primary m-0">Metas em andamento</h2>
                        <Link href="/desafios/metas" className="text-[11px] text-accent no-underline hover:underline">Ver todas →</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {data.metas.map(meta => {
                            const pct = meta.valor_alvo ? Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100)) : 0
                            return (
                                <div key={meta.id} className="p-3 border border-border rounded-lg bg-bg/50">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[13px] font-medium text-text-primary truncate pr-2">{meta.titulo}</span>
                                        <span className="text-[11px] font-semibold text-accent flex-shrink-0">{pct}%</span>
                                    </div>
                                    <MiniBar valor={meta.valor_atual} meta={meta.valor_alvo} />
                                    <div className="text-[11px] text-text-tertiary mt-1">
                                        {meta.valor_atual} / {meta.valor_alvo} {meta.unidade}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

        </div>
    )
}
