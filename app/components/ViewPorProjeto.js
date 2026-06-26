'use client'

import { useState } from 'react'
import { calcularProgresso, ordenarPorPrioridade, getAreaIcon } from '@/app/lib/tarefas'
import { ProgressBar, EmptyState } from '@/app/components/ui'
import TabelaTarefas from '@/app/components/TabelaTarefas'

function ProjetoNode({ nome, tarefas, onToggle, onSelect }) {
    const [aberto, setAberto] = useState(false)
    const [mostrarConcluidas, setMostrarConcluidas] = useState(false)

    const ativas = ordenarPorPrioridade(tarefas.filter(t => t.status !== 'Concluído'))
    const concluidas = tarefas.filter(t => t.status === 'Concluído')
    const pct = calcularProgresso(tarefas)

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
                <span className="text-[11px] text-text-tertiary">{concluidas.length}/{tarefas.length}</span>
                <div className="w-16">
                    <ProgressBar pct={pct} />
                </div>
            </button>
            {aberto && (
                <div className="ml-5 mt-1">
                    {/* Tarefas ativas */}
                    {ativas.length > 0 && (
                        <div className="bg-surface rounded-lg border border-border overflow-hidden mb-1">
                            <TabelaTarefas tarefas={ativas} onToggle={onToggle} onSelect={onSelect} />
                        </div>
                    )}

                    {/* Toggle concluídas */}
                    {concluidas.length > 0 && (
                        <div>
                            <button
                                onClick={() => setMostrarConcluidas(v => !v)}
                                className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-text-tertiary hover:text-text-secondary bg-transparent border-0 cursor-pointer transition-colors w-full text-left"
                            >
                                <svg width="7" height="7" viewBox="0 0 10 10" className={`transition-transform duration-100 ${mostrarConcluidas ? 'rotate-90' : ''}`}>
                                    <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                {mostrarConcluidas ? 'Esconder' : `Ver ${concluidas.length} concluída${concluidas.length > 1 ? 's' : ''}`}
                            </button>
                            {mostrarConcluidas && (
                                <div className="bg-surface rounded-lg border border-border overflow-hidden opacity-60">
                                    <TabelaTarefas tarefas={concluidas} onToggle={onToggle} onSelect={onSelect} />
                                </div>
                            )}
                        </div>
                    )}

                    {ativas.length === 0 && concluidas.length === 0 && (
                        <p className="text-[11px] text-text-tertiary px-2 py-2 italic">Nenhuma tarefa.</p>
                    )}
                </div>
            )}
        </div>
    )
}

function AreaNode({ area, proj