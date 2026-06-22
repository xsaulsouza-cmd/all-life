'use client'

import { useState } from 'react'
import { ordenarPorPrioridade, agruparPorChave } from '@/app/lib/tarefas'
import { GrupoHeader, EmptyState } from '@/app/components/ui'
import TabelaTarefas from '@/app/components/TabelaTarefas'

const FREQS = [
    { key: 'Diária',  label: 'DIÁRIA' },
    { key: 'Semanal', label: 'SEMANAL' },
    { key: 'Mensal',  label: 'MENSAL' }
]

export default function ViewRecorrentes({ tarefas, onToggle, onSelect }) {
    const grupos = agruparPorChave(tarefas, 'frequencia', 'Sem frequência')
    const [opens, setOpens] = useState({ Diária: true, Semanal: true, Mensal: true })

    return (
        <div>
            {FREQS.map(({ key, label }) => {
                const lista = ordenarPorPrioridade(grupos[key] || [])
                return (
                    <div key={key} className="mb-5">
                        <GrupoHeader titulo={label} count={lista.length} aberto={opens[key]} onToggle={() => setOpens(p => ({ ...p, [key]: !p[key] }))} />
                        {opens[key] && (
                            lista.length === 0
                                ? <p className="text-[12px] text-text-tertiary pl-4 py-1">Nenhuma</p>
                                : <div className="bg-surface rounded-lg border border-border overflow-hidden">
                                    <TabelaTarefas tarefas={lista} onToggle={onToggle} onSelect={onSelect} />
                                </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
