'use client'

import { useState } from 'react'
import { calcularProgresso, ordenarPorPrioridade, agruparPorChave, norm } from '@/app/lib/tarefas'
import { KpiCard, ProgressBar, GrupoHeader, EmptyState } from '@/app/components/ui'
import TabelaTarefas from '@/app/components/TabelaTarefas'

const CONFIGS = {
    trabalho: {
        titulo: 'Trabalho',
        match: (t) => ['spf', 'pge', 'relat', 'setdig', 'crc', 'prospec', 'petra', 'cannalab', 'incorpora', 'mounjaro'].some(k => norm(t.area).includes(k)),
    },
    pessoal: {
        titulo: 'Pessoal',
        match: (t) => ['pessoal', 'financeiro', 'saude', 'saúde', 'bem-estar', 'rotina', 'organiza'].some(k => norm(t.area).includes(k)),
    },
    faculdade: {
        titulo: 'Faculdade',
        match: (t) => ['direito', 'oab', 'ufms'].some(k => norm(t.area).includes(k)),
    },
}

export default function ViewArea({ tarefas, onToggle, onSelect, tipo }) {
    const cfg = CONFIGS[tipo] || CONFIGS.trabalho
    const filtered = tarefas.filter(cfg.match)
    const ordered  = ordenarPorPrioridade(filtered)

    const urgentes  = filtered.filter(t => norm(t.prioridade) === 'urgente' && t.status !== 'Concluído').length
    const altas     = filtered.filter(t => norm(t.prioridade) === 'alta'    && t.status !== 'Concluído').length
    const done      = filtered.filter(t => t.status === 'Concluído').length
    const pct       = calcularProgresso(filtered)

    const byProj = agruparPorChave(ordered, 'projeto', 'Sem projeto')
    const [opens, setOpens] = useState({})

    function isOpen(k) { return opens[k] !== false }
    function toggle(k) { setOpens(p => ({ ...p, [k]: !isOpen(k) })) }

    return (
        <div>
            <div className="grid grid-cols-4 gap-3 mb-5">
                <KpiCard label="Urgentes"       value={urgentes}  colorClass="text-priority-urgent" />
                <KpiCard label="Alta prioridade" value={altas}    colorClass="text-priority-high" />
                <KpiCard label="Concluídas"      value={done}     colorClass="text-status-done" />
                <KpiCard label="Progresso"       value={`${pct}%`} colorClass="text-accent" />
            </div>

            {filtered.length > 0 && <ProgressBar pct={pct} className="mb-5" />}
            {filtered.length === 0 && <EmptyState msg={`Nenhuma tarefa em ${cfg.titulo}.`} />}

            {Object.entries(byProj).map(([proj, ts]) => (
                <div key={proj} className="mb-4">
                    <GrupoHeader titulo={proj} count={ts.length} aberto={isOpen(proj)} onToggle={() => toggle(proj)} />
                    {isOpen(proj) && (
                        <div className="bg-surface rounded-lg border border-border overflow-hidden">
                            <TabelaTarefas tarefas={ts} onToggle={onToggle} onSelect={onSelect} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
