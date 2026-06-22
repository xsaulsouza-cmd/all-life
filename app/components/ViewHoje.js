'use client'

import { useState, useMemo } from 'react'
import { isVencida, isRecorrenteHoje, isUrgente, ordenarPorPrioridade } from '@/app/lib/tarefas'
import { GrupoHeader, EmptyState } from '@/app/components/ui'
import TabelaTarefas from '@/app/components/TabelaTarefas'

// Converte "30min", "1h", "2h", "3h+" etc. para minutos
function tempoParaMinutos(str) {
    if (!str) return 0
    const s = str.toLowerCase().trim()
    const h = s.match(/(\d+(?:[.,]\d+)?)\s*h/)
    const m = s.match(/(\d+)\s*min/)
    let total = 0
    if (h) total += parseFloat(h[1].replace(',', '.')) * 60
    if (m) total += parseInt(m[1])
    if (!h && !m && /^\d+$/.test(s)) total += parseInt(s) // número puro → minutos
    return Math.round(total)
}

function formatarTempo(min) {
    if (!min) return null
    if (min < 60) return `${min}min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m ? `${h}h${m}min` : `${h}h`
}

export default function ViewHoje({ tarefas, onToggle, onSelect }) {
    const [aV, setAV] = useState(true)
    const [aH, setAH] = useState(true)
    const [aR, setAR] = useState(true)
    const [aU, setAU] = useState(true)
    const [aA, setAA] = useState(true)
    const [aS, setAS] = useState(true)
    const [ocultarConcluidas, setOcultarConcluidas] = useState(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('hoje_ocultar_concluidas') === '1'
    })

    function toggleOcultar() {
        const next = !ocultarConcluidas
        setOcultarConcluidas(next)
        if (typeof window !== 'undefined') localStorage.setItem('hoje_ocultar_concluidas', next ? '1' : '0')
    }

    // PERF: memoizado — só recomputa quando tarefas muda
    const { vencidas, venceHoje, recorrentes, urgentes, amanha, semana, totalMin } = useMemo(() => {
        const hoje = new Date()
        const hojeStr = hoje.toISOString().slice(0, 10)

        const amanhaD = new Date(hoje); amanhaD.setDate(hoje.getDate() + 1)
        const amanhaStr = amanhaD.toISOString().slice(0, 10)

        const em7D = new Date(hoje); em7D.setDate(hoje.getDate() + 7)
        const em7Str = em7D.toISOString().slice(0, 10)

        const venc  = ordenarPorPrioridade(tarefas.filter(isVencida))
        const vh    = ordenarPorPrioridade(tarefas.filter(t =>
            t.prazo === hojeStr && t.status !== 'Concluído' &&
            !isVencida(t) && !isRecorrenteHoje(t) && !isUrgente(t)
        ))
        const rec   = ordenarPorPrioridade(tarefas.filter(t => isRecorrenteHoje(t) && t.status !== 'Concluído' && !isVencida(t)))
        const urg   = ordenarPorPrioridade(tarefas.filter(t => isUrgente(t) && !isVencida(t) && !isRecorrenteHoje(t) && t.prazo !== hojeStr))

        // Amanhã: prazo exatamente amanhã, não concluída, não já aparece em outro grupo
        const idsJaExibidos = new Set([...venc, ...vh, ...rec, ...urg].map(t => t.id))
        const ama = ordenarPorPrioridade(tarefas.filter(t =>
            t.prazo === amanhaStr &&
            t.status !== 'Concluído' &&
            !idsJaExibidos.has(t.id)
        ))

        // Esta semana: prazo entre depois de amanhã e 7 dias, não concluída
        const idsAteAmanha = new Set([...idsJaExibidos, ...ama.map(t => t.id)])
        const sem = ordenarPorPrioridade(tarefas.filter(t =>
            t.prazo > amanhaStr &&
            t.prazo <= em7Str &&
            t.status !== 'Concluído' &&
            !idsAteAmanha.has(t.id)
        ))

        // Tempo total estimado das pendentes do dia
        const pendentes = [...venc, ...vh, ...rec, ...urg].filter(t => t.status !== 'Concluído')
        const totalMin = pendentes.reduce((acc, t) => acc + tempoParaMinutos(t.tempo_estimado), 0)

        return { vencidas: venc, venceHoje: vh, recorrentes: rec, urgentes: urg, amanha: ama, semana: sem, totalMin }
    }, [tarefas])

    // Filtro de concluídas
    const filtrar = (arr) => ocultarConcluidas ? arr.filter(t => t.status !== 'Concluído') : arr

    const totalFormatado = formatarTempo(totalMin)

    return (
        <div>
            {/* Barra de controles */}
            <div className="flex items-center justify-between mb-4">
                {totalFormatado && (
                    <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>{totalFormatado} estimados hoje</span>
                    </div>
                )}
                {!totalFormatado && <div />}
                <button
                    onClick={toggleOcultar}
                    className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                        ocultarConcluidas
                            ? 'bg-accent/15 border-accent/30 text-accent'
                            : 'bg-transparent border-border text-text-tertiary hover:text-text-primary'
                    }`}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {ocultarConcluidas
                            ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                            : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                        }
                    </svg>
                    {ocultarConcluidas ? 'Mostrar concluídas' : 'Ocultar concluídas'}
                </button>
            </div>

            {/* Vencidas */}
            {filtrar(vencidas).length > 0 && (
                <div className="mb-5">
                    <GrupoHeader titulo="Vencidas" count={filtrar(vencidas).length} aberto={aV} onToggle={() => setAV(v => !v)} colorClass="text-section-vencidas" />
                    {aV && <TabelaTarefas tarefas={filtrar(vencidas)} onToggle={onToggle} onSelect={onSelect} />}
                </div>
            )}

            {/* Vence Hoje */}
            {venceHoje.length > 0 && (
                <div className="mb-5">
                    <GrupoHeader titulo="Vence hoje" count={venceHoje.length} aberto={aH} onToggle={() => setAH(v => !v)} colorClass="text-priority-high" />
                    {aH && <TabelaTarefas tarefas={venceHoje} onToggle={onToggle} onSelect={onSelect} />}
                </div>
            )}

            {/* Rotina de Hoje */}
            <div className="mb-5">
                <GrupoHeader titulo="Rotina de hoje" count={filtrar(recorrentes).length} aberto={aR} onToggle={() => setAR(v => !v)} colorClass="text-section-rotina" />
                {aR && (
                    filtrar(recorrentes).length === 0
                        ? <EmptyState msg={ocultarConcluidas ? 'Todas as rotinas concluídas!' : 'Sem tarefas de rotina para hoje.'} />
                        : <TabelaTarefas tarefas={filtrar(recorrentes)} onToggle={onToggle} onSelect={onSelect} />
                )}
            </div>

            {/* Urgentes */}
            <div className="mb-5">
                <GrupoHeader titulo="Urgentes" count={filtrar(urgentes).length} aberto={aU} onToggle={() => setAU(v => !v)} colorClass="text-section-urgentes" />
                {aU && (
                    filtrar(urgentes).length === 0
                        ? <EmptyState msg={ocultarConcluidas ? 'Todas as urgentes resolvidas!' : 'Nenhuma urgência.'} />
                        : <TabelaTarefas tarefas={filtrar(urgentes)} onToggle={onToggle} onSelect={onSelect} />
                )}
            </div>

            {/* Amanhã */}
            {amanha.length > 0 && (
                <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.1em]">No horizonte</span>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <GrupoHeader titulo="Amanhã" count={amanha.length} aberto={aA} onToggle={() => setAA(v => !v)} colorClass="text-text-secondary" />
                    {aA && <TabelaTarefas tarefas={amanha} onToggle={onToggle} onSelect={onSelect} />}
                </div>
            )}

            {/* Esta semana */}
            {semana.length > 0 && (
                <div className="mb-5">
                    {amanha.length === 0 && (
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.1em]">No horizonte</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                    )}
                    <GrupoHeader titulo="Esta semana" count={semana.length} aberto={aS} onToggle={() => setAS(v => !v)} colorClass="text-text-tertiary" />
                    {aS && <TabelaTarefas tarefas={semana} onToggle={onToggle} onSelect={onSelect} />}
                </div>
            )}
        </div>
    )
}
