'use client'

import { useMemo, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isVencida, prazoProximo, formatarData, getPrioridadeConfig, toSlug, GRUPOS_AREA } from '@/app/lib/tarefas'
import { KpiCard, ProgressBar, StatusBadge } from '@/app/components/ui'

export default function ViewDashboard({ tarefas, onToggle, onSelect }) {

    const [areas, setAreas] = useState([])
    const [metasKpi, setMetasKpi] = useState(null)
    const [desafiosKpi, setDesafiosKpi] = useState(null)

    useEffect(() => {
        async function fetchMetasDesafios() {
            try {
                // PERF: 3 queries em paralelo numa única Promise.all
                const [{ data: areasData }, { data: metas }, { data: desafios }] = await Promise.all([
                    supabase.from('areas').select('*'),
                    supabase.from('metas').select('id, status, valor_alvo, valor_atual'),
                    supabase.from('desafios').select('id, status, progresso'),
                ])
                if (areasData) setAreas(areasData)
                if (metas) {
                    const ativas = metas.filter(m => m.status === 'ativa')
                    const concluidas = metas.filter(m => m.status === 'concluída')
                    const progMedia = ativas.length > 0
                        ? Math.round(ativas.reduce((acc, m) => {
                            const alvo = parseFloat(m.valor_alvo) || 1
                            const atual = parseFloat(m.valor_atual) || 0
                            return acc + Math.min(100, (atual / alvo) * 100)
                        }, 0) / ativas.length)
                        : 0
                    setMetasKpi({ total: metas.length, ativas: ativas.length, concluidas: concluidas.length, progMedia })
                }
                if (desafios) {
                    const ativos = desafios.filter(d => d.status === 'em andamento')
                    const concluidos = desafios.filter(d => d.status === 'concluído')
                    const progMedia = ativos.length > 0
                        ? Math.round(ativos.reduce((acc, d) => acc + (d.progresso || 0), 0) / ativos.length)
                        : 0
                    setDesafiosKpi({ total: desafios.length, ativos: ativos.length, concluidos: concluidos.length, progMedia })
                }
            } catch (e) { console.error('Erro dashboard kpis:', e.message) }
        }
        fetchMetasDesafios()
    }, [])

    // Processamento de dados centralizado
    const { kpis, foco, proximos7Dias, progressoArea, projetoCritico } = useMemo(() => {
        const hoje = new Date()
        hoje.setHours(0,0,0,0)
        
        const seteDiasDepois = new Date(hoje)
        seteDiasDepois.setDate(seteDiasDepois.getDate() + 7)

        let vencidasAtivas = 0
        let urgentesAtivas = 0
        let concluidasHoje = 0
        let totalAtivas = 0

        const candidatasFoco = []
        const vencimentosProximos = []
        
        const areasCount = {}
        areas.forEach(a => {
            areasCount[a.nome] = { total: 0, done: 0 }
        })

        const projetosCriticosMap = {}

        tarefas.forEach(t => {
            const isDone = t.status === 'Concluído'
            const vencida = isVencida(t)
            const isUrgente = t.prioridade === 'Urgente'
            const isAlta = t.prioridade === 'Alta'

            // KPIs
            if (!isDone) {
                totalAtivas++
                if (vencida) vencidasAtivas++
                if (isUrgente && !vencida) urgentesAtivas++
            } else {
                // Concluidas hoje
                if (t.atualizada_em) {
                    const atualizada = new Date(t.atualizada_em)
                    if (atualizada >= hoje) concluidasHoje++
                }
            }

            // Foco
            if (!isDone) {
                let peso = 0
                if (vencida) peso = 3
                else if (isUrgente) peso = 2
                else if (isAlta) peso = 1

                if (peso > 0) {
                    candidatasFoco.push({ ...t, pesoFoco: peso })
                }
            }

            // Próximos 7 dias
            if (!isDone && t.prazo) {
                const prazoDate = new Date(t.prazo + 'T23:59:59')
                if (prazoDate >= hoje && prazoDate <= seteDiasDepois) {
                    const diffDias = Math.floor((prazoDate - hoje) / 86400000)
                    vencimentosProximos.push({ ...t, diasRestantes: diffDias })
                } else if (vencida) {
                    const diffDias = Math.floor((prazoDate - hoje) / 86400000)
                    vencimentosProximos.push({ ...t, diasRestantes: diffDias }) // diffDias será negativo
                }
            }

            // Áreas — usa mapeamento para encontrar o grupo correto
            let matchedArea = null
            for (const a of areas) {
                const slug = toSlug(a.nome)
                const areasDoGrupo = GRUPOS_AREA[slug] || [a.nome]
                if (areasDoGrupo.some(ag => ag.toLowerCase() === (t.area || '').toLowerCase())) {
                    matchedArea = a.nome
                    break
                }
            }

            if (matchedArea && areasCount[matchedArea]) {
                areasCount[matchedArea].total++
                if (isDone) areasCount[matchedArea].done++
            }

            // Projetos Críticos
            if (!isDone && t.projeto) {
                if (!projetosCriticosMap[t.projeto]) {
                    projetosCriticosMap[t.projeto] = { nome: t.projeto, area: t.area, peso: 0, tarefas: [] }
                }
                if (vencida) {
                    projetosCriticosMap[t.projeto].peso += 2
                    projetosCriticosMap[t.projeto].tarefas.push(t)
                } else if (isUrgente) {
                    projetosCriticosMap[t.projeto].peso += 1
                    projetosCriticosMap[t.projeto].tarefas.push(t)
                }
            }
        })

        // Ordenações Finais
        candidatasFoco.sort((a, b) => b.pesoFoco - a.pesoFoco || new Date(a.criada_em) - new Date(b.criada_em))
        vencimentosProximos.sort((a, b) => a.diasRestantes - b.diasRestantes)
        
        let projetoMaisCritico = null
        const projetosOrdenados = Object.values(projetosCriticosMap).sort((a, b) => b.peso - a.peso)
        if (projetosOrdenados.length > 0 && projetosOrdenados[0].peso > 0) {
            projetoMaisCritico = projetosOrdenados[0]
            // Limita a 3 tarefas mais críticas desse projeto
            projetoMaisCritico.tarefas = projetoMaisCritico.tarefas.slice(0, 3)
        }

        return {
            kpis: { vencidasAtivas, urgentesAtivas, concluidasHoje, totalAtivas },
            foco: candidatasFoco.slice(0, 3),
            proximos7Dias: vencimentosProximos.slice(0, 7),
            progressoArea: areasCount,
            projetoCritico: projetoMaisCritico
        }
    }, [tarefas, areas])

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Bloco 1: KPIs */}
            <div className="grid grid-cols-4 gap-4">
                <KpiCard label="Vencidas" value={kpis.vencidasAtivas} colorClass="text-[#DC2626]" />
                <KpiCard label="Urgentes" value={kpis.urgentesAtivas} colorClass="text-[#D97706]" />
                <KpiCard label="Concluídas Hoje" value={kpis.concluidasHoje} colorClass="text-[#16A34A]" />
                <KpiCard label="Total Ativas" value={kpis.totalAtivas} colorClass="text-[#2563EB]" />
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* Bloco 2: Foco de Hoje */}
                <div>
                    <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest mb-4">Foco de Hoje</h2>
                    <div className="space-y-2">
                        {foco.length === 0 ? (
                            <p className="text-[13px] text-text-tertiary">Nenhuma tarefa crítica para hoje. Bom trabalho!</p>
                        ) : (
                            foco.map(t => (
                                <div key={t.id} onClick={() => onSelect(t)} className="bg-surface border border-border hover:border-[#2a2a2a] hover:bg-surface-hover rounded-xl p-3 cursor-pointer flex justify-between items-center transition-colors">
                                    <div className="min-w-0 pr-3">
                                        <p className="text-[14px] font-medium text-text-primary m-0 truncate">{t.nome}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                                            {t.projeto && <span className="truncate max-w-[120px]">{t.projeto}</span>}
                                            {t.projeto && <span>•</span>}
                                            <span className={isVencida(t) ? 'text-[#DC2626]' : t.prioridade === 'Urgente' ? 'text-[#D97706]' : ''}>
                                                {t.prioridade}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onToggle(t.id, t.status) }}
                                        className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-[#16A34A]/10 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors"
                                        title="Concluir tarefa"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Bloco 3: Próximos 7 Dias */}
                <div>
                    <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest mb-4">Próximos 7 Dias</h2>
                    <div className="space-y-1">
                        {proximos7Dias.length === 0 ? (
                            <p className="text-[13px] text-text-tertiary">Nenhum vencimento próximo.</p>
                        ) : (
                            proximos7Dias.map(t => {
                                const isV = t.diasRestantes < 0
                                const isWarning = t.diasRestantes >= 0 && t.diasRestantes <= 2
                                const colorClass = isV ? 'text-[#DC2626]' : isWarning ? 'text-[#D97706]' : 'text-text-primary'
                                
                                return (
                                    <div key={t.id} onClick={() => onSelect(t)} className="flex items-center justify-between py-2 px-3 hover:bg-surface rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border">
                                        <div className="min-w-0 pr-4">
                                            <p className={`text-[13px] font-medium m-0 truncate ${colorClass}`}>{t.nome}</p>
                                            {t.projeto && <p className="text-[11px] text-text-secondary m-0 mt-0.5 truncate">{t.projeto}</p>}
                                        </div>
                                        <span className={`text-[11px] font-medium whitespace-nowrap ${colorClass}`}>
                                            {isV ? `${Math.abs(t.diasRestantes)}d atraso` : t.diasRestantes === 0 ? 'Hoje' : t.diasRestantes === 1 ? 'Amanhã' : `${t.diasRestantes} dias`}
                                        </span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Bloco KPIs: Metas + Desafios */}
            {(metasKpi || desafiosKpi) && (
                <div className="grid grid-cols-2 gap-6">
                    {metasKpi && (
                        <div className="bg-surface border border-border rounded-xl p-4">
                            <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest mb-3">Metas</h2>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <p className="text-[10px] text-text-tertiary m-0 uppercase tracking-wide">Ativas</p>
                                    <p className="text-[20px] font-semibold text-text-primary m-0">{metasKpi.ativas}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-tertiary m-0 uppercase tracking-wide">Concluídas</p>
                                    <p className="text-[20px] font-semibold text-[#16A34A] m-0">{metasKpi.concluidas}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-tertiary m-0 uppercase tracking-wide">Progresso</p>
                                    <p className="text-[20px] font-semibold text-accent m-0">{metasKpi.progMedia}%</p>
                                </div>
                            </div>
                            <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${metasKpi.progMedia}%` }} />
                            </div>
                        </div>
                    )}
                    {desafiosKpi && (
                        <div className="bg-surface border border-border rounded-xl p-4">
                            <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest mb-3">Desafios</h2>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <p className="text-[10px] text-text-tertiary m-0 uppercase tracking-wide">Em andamento</p>
                                    <p className="text-[20px] font-semibold text-text-primary m-0">{desafiosKpi.ativos}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-tertiary m-0 uppercase tracking-wide">Concluídos</p>
                                    <p className="text-[20px] font-semibold text-[#16A34A] m-0">{desafiosKpi.concluidos}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-tertiary m-0 uppercase tracking-wide">Progresso</p>
                                    <p className="text-[20px] font-semibold text-[#D97706] m-0">{desafiosKpi.progMedia}%</p>
                                </div>
                            </div>
                            <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-[#D97706] rounded-full transition-all" style={{ width: `${desafiosKpi.progMedia}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-8 pt-4">
                {/* Bloco 4: Progresso por Área */}
                <div>
                    <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest mb-4">Progresso Semanal</h2>
                    <div className="space-y-4">
                        {Object.entries(progressoArea).map(([area, stats]) => {
                            const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
                            return (
                                <div key={area}>
                                    <div className="flex justify-between text-[12px] mb-1">
                                        <span className="text-text-primary font-medium">{area}</span>
                                        <span className="text-text-secondary">{stats.done} / {stats.total}</span>
                                    </div>
                                    <div className="h-[4px] bg-border rounded-full overflow-hidden">
                                        <div className="h-full bg-[#2563EB] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Bloco 5: Projeto Mais Crítico */}
                <div>
                    <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest mb-4">Projeto Mais Crítico</h2>
                    {projetoCritico ? (
                        <div className="bg-surface border border-[#DC2626]/30 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <span className="text-6xl">⚠️</span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="m-0 text-[15px] font-medium text-text-primary">{projetoCritico.nome}</h3>
                                <p className="text-[12px] text-text-secondary mt-1 mb-4">{projetoCritico.area || 'Sem área'}</p>
                                
                                <div className="space-y-2">
                                    {projetoCritico.tarefas.map(t => (
                                        <div key={t.id} onClick={() => onSelect(t)} className="text-[12px] bg-bg/50 px-2 py-1.5 rounded cursor-pointer hover:bg-bg transition-colors flex items-center justify-between">
                                            <span className="truncate pr-2">{t.nome}</span>
                                            <span className={`flex-shrink-0 ${isVencida(t) ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
                                                {isVencida(t) ? 'Vencida' : 'Urgente'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[13px] text-text-tertiary">Nenhum projeto em estado crítico. Excelente!</p>
                    )}
                </div>
            </div>
        </div>
    )
}
