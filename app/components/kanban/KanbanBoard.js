'use client'

import { useState } from 'react'
import KanbanCard from './KanbanCard'

const COLUMNS = [
    { id: 'Não iniciada', title: 'Não iniciada' },
    { id: 'Em andamento', title: 'Em andamento' },
    { id: 'Concluído',    title: 'Concluída' }
]

export default function KanbanBoard({ tarefas, onTaskClick, onTaskMove, moverTarefa }) {
    const [dragOver, setDragOver] = useState(null)
    const [draggingId, setDraggingId]   = useState(null)

    function handleDragStart(e, tarefa) {
        setDraggingId(tarefa.id)
        e.dataTransfer.setData('tarefaId', tarefa.id)
        e.dataTransfer.setData('tarefaStatus', tarefa.status)
        e.dataTransfer.effectAllowed = 'move'
    }

    function handleDragEnd() {
        setDraggingId(null)
        setDragOver(null)
    }

    function handleDragOver(e, colId) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragOver !== colId) setDragOver(colId)
    }

    function handleDragLeave(e) {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOver(null)
        }
    }

    function handleDrop(e, novoStatus) {
        e.preventDefault()
        const tarefaId   = e.dataTransfer.getData('tarefaId')
        setDragOver(null)
        setDraggingId(null)
        if (tarefaId) {
            moverTarefa(tarefaId, novoStatus)
        }
    }

    return (
        <div className="flex gap-4 h-full min-h-[600px] pb-4">
            {COLUMNS.map(col => {
                const colTasks = tarefas.filter(t => t.status === col.id)
                const isOver   = dragOver === col.id

                return (
                    <div
                        key={col.id}
                        className={`flex flex-col flex-1 border rounded-[8px] overflow-hidden max-h-[calc(100vh-140px)] transition-colors duration-150 ${
                            isOver
                                ? 'bg-accent/5 border-accent/40'
                                : 'bg-[#0f0f0f] border-[#1a1a1a]'
                        }`}
                        onDragOver={e => handleDragOver(e, col.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, col.id)}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] flex-shrink-0 bg-[#0a0a0a]/50">
                            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em]">
                                {col.title}
                            </span>
                            <span className="bg-[#1a1a1a] text-text-tertiary text-[11px] font-medium px-2 py-0.5 rounded-full border border-[#222]">
                                {colTasks.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="flex-1 overflow-y-auto p-3 min-h-0">
                            {colTasks.map(t => (
                                <KanbanCard
                                    key={t.id}
                                    tarefa={t}
                                    onClick={onTaskClick}
                                    onMove={onTaskMove}
                                    dragging={draggingId === t.id}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                />
                            ))}

                            {colTasks.length === 0 && (
                                <div className={`text-center py-12 text-[12px] italic transition-colors duration-150 border-2 border-dashed rounded-lg ${
                                    isOver
                                        ? 'text-accent/70 border-accent/30 bg-accent/5'
                                        : 'text-text-tertiary border-transparent'
                                }`}>
                                    {isOver ? '↓ Soltar aqui' : 'Nenhuma tarefa'}
                                </div>
                            )}

                            {/* Drop zone indicator quando tem cards mas está em hover */}
                            {colTasks.length > 0 && isOver && (
                                <div className="h-1 rounded-full bg-accent/40 mx-1 mt-1 transition-all" />
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
