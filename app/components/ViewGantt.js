'use client'

import { useState, useMemo } from 'react'
import { getPrioridadeConfig, isVencida, formatarData, ordenarPorPrioridade, agruparPorChave, GRUPOS_AREA, getAreaNome } from '@/app/lib/tarefas'
import { EmptyState } from '@/app/components/ui'

const PX   = 8
const LEFT = 280
const ROW  = 44

const PRIORIDADE_COR = {
    'Urgente': '#DC2626',
    'Alta': '#D97706',
    'Média': '#2563EB',
    'Sem prioridade': '#6B7280'
}

const NOMES_MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function diasNoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate()
}

// Calcula o range dinâmico a partir das tarefas
function calcRange(tarefas) {
    const hoje = new Date(); hoje.setHours(12,0,0,0)
    // pega datas válidas: criada_em e prazo
    const datas = tarefas.flatMap(t => [
        t.prazo ? new Date(t.prazo + 'T12:00:00') : null,
        t.criada_em ? new Date(t.criada_em.split('T')[0] + 'T12:00:00') : null,
    ]).filter(Boolean)

    if (datas.length === 0) {
        // fallback: mês atual + 2 meses
        const start = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        start.setHours(12,0,0,0)
        const end   = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 28)
        end.setHours(12,0,0,0)
        return { start, end }
    }
    const minD = new Date(Math.min(...datas.map(d => d.getTime())))
    const maxD = new Date(Math.max(...datas.map(d => d.getTime())))
    // Margem: início do mês mais cedo, fim do mês mais tarde
    const start = new Date(minD.getFullYear(), minD.getMonth(), 1); start.setHours(12,0,0,0)
    const end   = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0); end.setHours(12,0,0,0)
    return { start, end }
}

// Gera array de meses entre start e end
function buildMonths(start, end) {
    const months = []
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
        const ano = cur.getFullYear()
        const mes = cur.getMonth()
        const days = diasNoMes(ano, mes)
        months.push({ label: NOMES_MESES[mes] + (ano !== new Date().getFullYear() ? `/${String(ano).slice(2)}` : ''), days, ano, mes })
        cur = new Date(ano, mes + 1, 1)
    }
    return months
}

export default function ViewGantt({ tarefas }) {
    const [filtroArea, setFiltroArea] = useState('Todas')

    // PERF: tudo memoizado — recalcula só quando tarefas ou filtro mudam
    const { filtradas, START, TOTAL, TW, mOffs, todayOff, agrupadas, projetosOrdenados } = useMemo(() => {
        let filt = tarefas.filter(t => t.prazo && t.status !== 'Concluído')
        if (filtroArea !== 'Todas') {
            const areasDoGrupo = GRUPOS_AREA[filtroArea.toLowerCase()] || []
            filt = filt.filter(t => areasDoGrupo.includes(t.area))
        }

        const { start, end } = calcRange(filt)
        const months = buildMonths(start, end)
        const total  = months.reduce((a, m) => a + m.days, 0)
        let acc = 0
        const offs = months.map(m => { const o = acc; acc += m.days * PX; return { ...m, left: o } })
        const today = new Date(); today.setHours(12,0,0,0)
        const todOff = Math.round((today - start) / 864e5)

        const agrup = agruparPorChave(filt, 'projeto', 'Sem Projeto')
        const projOrdenados = Object.keys(agrup).sort((a, b) => a === 'Sem Projeto' ? 1 : b === 'Sem Projeto' ? -1 : a.localeCompare(b))

        return { filtradas: filt, START: start, TOTAL: total, TW: total * PX, mOffs: offs, todayOff: todOff, agrupadas: agrup, projetosOrdenados: projOrdenados }
    }, [tarefas, filtroArea])

    // helper de posição — definido fora do map para não recriar por row
    const dayOff = (d) => Math.round((new Date(d + 'T12:00:00') - START) / 864e5)

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-2 bg-surface p-1 rounded-lg border border-border w-fit">
                    {['Todas', 'Trabalho', 'Pessoal', 'Faculdade'].map(a => (
                        <button
                            key={a}
                            onClick={() => setFiltroArea(a)}
                            className={`px-3 py-1 text-[12px] rounded-md transition-colors border-0 cursor-pointer ${filtroArea === a ? 'bg-nav-active-bg text-text-primary font-medium' : 'bg-transparent text-text-tertiary hover:text-text-primary'}`}
                        >
                            {a}
                        </button>
                    ))}
                </div>
            </div>

            {filtradas.length === 0 ? (
                <EmptyState msg="Nenhuma tarefa encontrada para este filtro." />
            ) : (
                <div className="rounded-lg border border-border bg-surface overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    <div style={{ minWidth: LEFT + TW }}>
                        {/* Header */}
                        <div className="flex sticky top-0 z-20 bg-surface border-b border-border" style={{ height: 36 }}>
                            <div className="flex-shrink-0 flex items-center px-3 border-r border-border sticky left-0 bg-surface z-30 text-[11px] text-text-tertiary font-medium uppercase tracking-wider" style={{ width: LEFT }}>
                                Projeto / Tarefa
                            </div>
                            <div className="relative flex-1" style={{ width: TW }}>
                                {mOffs.map(m => (
                                    <div key={m.label} className="absolute top-0 bottom-0 border-r border-border-light flex items-center px-2" style={{ left: m.left, width: m.days * PX }}>
                                        <span className="text-[11px] text-text-tertiary">{m.label}</span>
                                    </div>
                                ))}
                                {todayOff >= 0 && todayOff <= TOTAL && <div className="absolute top-0 bottom-0 w-px bg-priority-urgent/50 z-10" style={{ left: todayOff * PX }} />}
                            </div>
                        </div>

                        {/* Rows */}
                        {projetosOrdenados.map(proj => (
                            <div key={proj}>
                                {/* Cabeçalho do Projeto */}
                                <div className="flex bg-surface-hover/30 border-b border-border-light" style={{ height: 32 }}>
                                    <div className="flex-shrink-0 flex items-center px-3 sticky left-0 bg-surface-hover/30 z-10 border-r border-border-light" style={{ width: LEFT }}>
                                        <span className="text-[12px] font-semibold text-text-primary">{proj}</span>
                                    </div>
                                    <div className="relative flex-1" style={{ width: TW }}>
                                        {mOffs.map(m => <div key={m.label} className="absolute top-0 bottom-0 border-r border-border-light/30" style={{ left: m.left }} />)}
                                        {todayOff >= 0 && todayOff <= TOTAL && <div className="absolute top-0 bottom-0 w-px bg-priority-urgent/30" style={{ left: todayOff * PX }} />}
                                    </div>
                                </div>

                                {/* Tarefas do Projeto */}
                                {ordenarPorPrioridade(agrupadas[proj]).map(t => {
                                    let sOff = dayOff(t.criada_em ? t.criada_em.split('T')[0] : t.prazo)
                                    let eOff = dayOff(t.prazo)
                                    
                                    if (sOff > eOff) sOff = eOff

                                    sOff = Math.max(0, sOff)
                                    eOff = Math.min(TOTAL, eOff)

                                    const left = sOff * PX
                                    const width = Math.max(8, (eOff - sOff) * PX) // mínimo de 8px

                                    return (
                                        <div key={t.id} className="flex border-b border-border-light hover:bg-surface-hover/50 transition-colors" style={{ height: ROW }}>
                                            <div className="flex-shrink-0 flex flex-col justify-center px-3 border-r border-border-light sticky left-0 bg-surface hover:bg-surface-hover/50 z-10" style={{ width: LEFT }}>
                                                <span className="text-[13px] text-text-primary truncate font-medium">{t.nome}</span>
                                                {t.portfolio && <span className="text-[11px] text-text-tertiary truncate">{t.portfolio}</span>}
                                            </div>
                                            <div className="relative flex-1" style={{ width: TW }}>
                                                {mOffs.map(m => <div key={m.label} className="absolute top-0 bottom-0 border-r border-border-light/30" style={{ left: m.left }} />)}
                                                {todayOff >= 0 && todayOff <= TOTAL && <div className="absolute top-0 bottom-0 w-px bg-priority-urgent/30" style={{ left: todayOff * PX }} />}
                                                
                                                {/* Barra de Tarefa */}
                                                <div
                                                    className="absolute rounded-full"
                                                    style={{ 
                                                        top: (ROW - 12) / 2, 
                                                        left, 
                                                        width, 
                                                        height: 12, 
                                                        backgroundColor: isVencida(t) ? '#DC2626' : (PRIORIDADE_COR[t.prioridade] || PRIORIDADE_COR['Sem prioridade']),
                                                        opacity: 0.9 
                                                    }}
                                                    title={`${t.nome} — ${formatarData(t.prazo)}${isVencida(t) ? ' (vencida)' : ''}`}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
