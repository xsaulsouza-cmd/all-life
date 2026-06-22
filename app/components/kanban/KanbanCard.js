'use client'

import { useState } from 'react'
import { getPrioridadeConfig, isVencida, prazoProximo, formatarData } from '@/app/lib/tarefas'

export default function KanbanCard({ tarefa, onClick, onMove }) {
    const [isDragging, setIsDragging] = useState(false)
    const p      = getPrioridadeConfig(tarefa.prioridade)
    const vencida = isVencida(tarefa)
    const px     = prazoProximo(tarefa)

    let prazoColor = 'text-text-tertiary'
    if (vencida) prazoColor = 'text-priority-urgent font-medium'
    else if (px) prazoColor = 'text-priority-high'

    const handleMove = (e, direction) => {
        e.stopPropagation()
        onMove(tarefa, direction)
    }

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('tarefaId', tarefa.id)
                setIsDragging(true)
            }}
            onDragEnd={() => setIsDragging(false)}
            onClick={() => !isDragging && onClick(tarefa)}
            className={`group relative bg-[#1a1a1a] border border-[#222] rounded-[6px] p-3 mb-2 transition-all overflow-hidden flex flex-col select-none ${
                isDragging
                    ? 'opacity-40 scale-[0.97] cursor-grabbing shadow-none'
                    : 'opacity-100 hover:bg-[#222] hover:border-text-tertiary cursor-grab active:cursor-grabbing hover:shadow-lg'
            }`}
            style={{ borderLeft: `3px solid ${p.borderColor}` }}
        >
            <div className="flex justify-between items-start mb-1.5">
                <span className="text-[13px] font-medium text-text-primary leading-tight line-clamp-2 pr-4">
                    {tarefa.nome}
                </span>
            </div>

            <div className="text-[12px] text-[#6b7280] mb-2 truncate">
                {tarefa.projeto || 'Sem projeto'}{tarefa.area ? ` · ${tarefa.area}` : ''}
            </div>

            <div className="flex items-center justify-between mt-auto pt-1">
                <div className="flex items-center gap-2">
                    {tarefa.prazo && (
                        <span className={`text-[11px] flex items-center gap-1 ${prazoColor}`}>
                            📅 {formatarData(tarefa.prazo)}
                            {vencida && (
                                <span className="text-[10px] uppercase font-bold text-priority-urgent ml-1">Vencida</span>
                            )}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {p.label !== 'Sem' && (
                        <span className={`flex items-center text-[10px] px-1.5 py-0.5 rounded-sm bg-surface border border-border ${p.text}`}>
                            {p.icon} <span className="ml-1">{p.label}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Quick Actions — aparecem no hover (só quando não está dragging) */}
            {!isDragging && (
                <div className="absolute inset-0 bg-[#222]/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                        onClick={e => handleMove(e, 'back')}
                        disabled={tarefa.status === 'Não iniciada'}
                        className="px-3 py-1.5 text-[12px] font-medium bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-border rounded-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        ← Voltar
                    </button>
                    <button
                        onClick={e => handleMove(e, 'forward')}
                        disabled={tarefa.status === 'Concluído'}
                        className="px-3 py-1.5 text-[12px] font-medium bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-border rounded-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Avançar →
                    </button>
                </div>
            )}
        </div>
    )
}
