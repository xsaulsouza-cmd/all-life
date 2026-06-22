'use client'

import { useState } from 'react'
import { calcularProgresso, ordenarPorPrioridade, getAreaIcon } from '@/app/lib/tarefas'
import { ProgressBar, EmptyState } from '@/app/components/ui'
import TabelaTarefas from '@/app/components/TabelaTarefas'

function ProjetoNode({ nome, tarefas, onToggle, onSelect }) {
    const [aberto, setAberto] = useState(false)
    const pct = calcularProgresso(tarefas)
    const done = tarefas.filter(t => t.status === 'Concluído').length

    return (
        <div className="mb-1">
            <button
                onClick={() => setAberto(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-[6px] rounded-md bg-transparent hover:bg-surface-hover border-0 cursor-pointer text-left transition-colors"
            >
                <svg width="8" height="8" viewBox="0 0 10 10" className={`text-text-tertiary transition-transform duration-100 ${aberto ? 'rotate-90' : ''}`}>
                    <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[13px] text-text-primary flex-1 truncate">{nome}</span>
                <span className="text-[11px] text-text-tertiary">{done}/{tarefas.length}</span>
                <div className="w-16">
                    <ProgressBar pct={pct} />
                </div>
            </button>
            {aberto && (
                <div className="ml-5 bg-surface rounded-lg border border-border overflow-hidden mt-1">
                    <TabelaTarefas tarefas={ordenarPorPrioridade(tarefas)} onToggle={onToggle} onSelect={onSelect} />
                </div>
            )}
        </div>
    )
}

function AreaNode({ area, projetos, onToggle, onSelect }) {
    const [aberto, setAberto] = useState(true)
    const icon = getAreaIcon(area)

    return (
        <div className="mb-4">
            <button
                onClick={() => setAberto(v => !v)}
                className="flex items-center gap-2 px-2 py-1 bg-transparent border-0 cursor-pointer text-left w-full"
            >
                <svg width="8" height="8" viewBox="0 0 10 10" className={`text-text-tertiary transition-transform duration-100 ${aberto ? 'rotate-90' : ''}`}>
                    <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[12px] text-text-tertiary">{icon}</span>
                <span className="text-[12px] font-medium text-text-secondary uppercase tracking-wide">{area}</span>
                <span className="text-[11px] text-text-tertiary">{Object.keys(projetos).length} proj.</span>
            </button>
            {aberto && (
                <div className="ml-3 mt-1">
                    {Object.entries(projetos).map(([proj, ts]) => (
                        <ProjetoNode key={proj} nome={proj} tarefas={ts} onToggle={onToggle} onSelect={onSelect} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function ViewPorProjeto({ tarefas, onToggle, onSelect }) {
    const byArea = {}
    tarefas.forEach(t => {
        const a = t.area || 'Sem área'; const p = t.projeto || 'Sem projeto'
        if (!byArea[a]) byArea[a] = {}
        if (!byArea[a][p]) byArea[a][p] = []
        byArea[a][p].push(t)
    })

    if (tarefas.length === 0) return <EmptyState msg="Nenhuma tarefa." />

    return (
        <div>
            {Object.entries(byArea).map(([area, projs]) => (
                <AreaNode key={area} area={area} projetos={projs} onToggle={onToggle} onSelect={onSelect} />
            ))}
        </div>
    )
}
