'use client'

import { useState } from 'react'
import { DIAS_SEMANA_DISPLAY, JS_TO_DIA_PT, isRecorrenteNoDia, ordenarPorPrioridade } from '@/app/lib/tarefas'
import TabelaTarefas from '@/app/components/TabelaTarefas'

function DiaSection({ dia, tarefas, onToggle, onSelect, isHoje, inicioDaSemana }) {
    const [aberto, setAberto] = useState(true)

    // Helper function to get date of current weekday
    function getDataDoDia(nomeDia) {
        const idx = { 'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3, 'Sexta': 4, 'Sábado': 5, 'Domingo': 6 }
        const d = new Date(inicioDaSemana)
        d.setDate(inicioDaSemana.getDate() + idx[nomeDia])
        return d
    }

    const dataDoDia = getDataDoDia(dia)
    const dataStr = dataDoDia.toISOString().split('T')[0]

    // 1. Recurrent tasks for this day (active/not completed)
    const pendingRecorrentes = tarefas.filter(t => {
        const f = (t.frequencia || '').toLowerCase()
        const isRec = f === 'diária' || f === 'diaria' || f === 'semanal'
        return isRec && isRecorrenteNoDia(t, dia) && t.status !== 'Concluído'
    }).map(t => ({ ...t, _tipoSemana: 'recorrente' }))

    // 2. Deadline tasks matching this day (active/not completed, not duplicated)
    const tarefasPrazo = tarefas.filter(t =>
        t.prazo === dataStr &&
        t.status !== 'Concluído' &&
        !isRecorrenteNoDia(t, dia)
    ).map(t => ({ ...t, _tipoSemana: 'prazo' }))

    // Group and sort by priority
    const todasTarefas = ordenarPorPrioridade([...pendingRecorrentes, ...tarefasPrazo])

    return (
        <div className="mb-3">
            <button
                onClick={() => setAberto(v => !v)}
                className={[
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg border-0 cursor-pointer text-left transition-colors',
                    isHoje ? 'bg-surface-hover' : 'bg-transparent hover:bg-surface-hover',
                ].join(' ')}
            >
                <svg width="8" height="8" viewBox="0 0 10 10" className={`text-text-tertiary transition-transform duration-100 ${aberto ? 'rotate-90' : 'rotate-0'}`}>
                    <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className={`text-[13px] font-medium ${isHoje ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {dia}
                </span>
                {isHoje && <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-px rounded-full font-medium">hoje</span>}
                <span className="text-[11px] text-text-tertiary ml-auto">{todasTarefas.length}</span>
            </button>
            {aberto && todasTarefas.length > 0 && (
                <div className="ml-4 bg-surface rounded-lg border border-border overflow-hidden mt-1">
                    <TabelaTarefas tarefas={todasTarefas} onToggle={onToggle} onSelect={onSelect} />
                </div>
            )}
            {aberto && todasTarefas.length === 0 && (
                <p className="ml-6 text-[12px] text-text-tertiary py-2 m-0">Sem tarefas</p>
            )}
        </div>
    )
}

export default function ViewSemana({ tarefas, onToggle, onSelect }) {
    const today = new Date()
    const diaSemana = today.getDay() // 0=Dom, 1=Seg...
    const inicioDaSemana = new Date(today)
    // Set to Monday of this week
    inicioDaSemana.setDate(today.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
    inicioDaSemana.setHours(0, 0, 0, 0)

    const JS_BY = { 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6, 'Domingo': 0 }

    return (
        <div>
            {DIAS_SEMANA_DISPLAY.map(dia => (
                <DiaSection 
                    key={dia} 
                    dia={dia} 
                    tarefas={tarefas} 
                    onToggle={onToggle} 
                    onSelect={onSelect} 
                    isHoje={JS_BY[dia] === new Date().getDay()} 
                    inicioDaSemana={inicioDaSemana}
                />
            ))}
        </div>
    )
}
