'use client'

import { useState } from 'react'
import { getPrioridadeConfig, getStatusConfig, isVencida, formatarData } from '@/app/lib/tarefas'
import { Badge, PropRow, StatusBadge, PriorityBadge, TarefaCheckbox } from '@/app/components/ui'
import { IconClock, IconCalendar, IconFolder, IconNotes, IconArea, IconPortfolio, IconFrequency, IconChevronDown } from '@/app/components/icons'
import { useBulkSelect } from '@/app/contexts/BulkSelectContext'

export default function TarefaCardDiaria({ tarefa, onToggle }) {
    const { isSelectMode, selectedIds, toggleSelect } = useBulkSelect()
    const isSelected = selectedIds.has(tarefa.id)
    const [expandido, setExpandido] = useState(false)
    const concluida = tarefa.status === 'Concluído'
    const vencida   = isVencida(tarefa)

    return (
        <div
            className={[
                'group bg-white rounded-xl border overflow-hidden',
                'transition-shadow duration-150 hover:shadow-md',
                concluida ? 'opacity-60' : '',
                isSelected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200',
            ].join(' ')}
        >
            {/* Título */}
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
                {isSelectMode ? (
                    <button
                        onClick={() => toggleSelect(tarefa.id)}
                        className={[
                            'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer bg-transparent transition-colors',
                            isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 hover:border-indigo-400',
                        ].join(' ')}
                    >
                        {isSelected && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                ) : (
                    <TarefaCheckbox tarefa={tarefa} onToggle={onToggle} />
                )}
                <button
                    onClick={() => setExpandido(v => !v)}
                    className="flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                >
                    <span className={[
                        'text-[14px] font-semibold text-gray-900',
                        concluida ? 'line-through text-gray-400' : '',
                    ].join(' ')}>
                        {tarefa.nome}
                    </span>
                </button>
                {/* Botão de entrar em modo seleção (aparece no hover) */}
                {!isSelectMode && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(tarefa.id) }}
                        title="Selecionar"
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded border-2 border-gray-300 hover:border-indigo-400 flex items-center justify-center flex-shrink-0 cursor-pointer bg-transparent transition-all"
                    />
                )}
                <button
                    onClick={() => setExpandido(v => !v)}
                    className={[
                        'text-gray-300 hover:text-gray-500 bg-transparent border-0 cursor-pointer p-1',
                        'transition-transform duration-200',
                        expandido ? 'rotate-180' : 'rotate-0',
                    ].join(' ')}
                >
                    <IconChevronDown />
                </button>
            </div>

            {/* Resumo (colapsado) */}
            {!expandido && (
                <div className="flex items-center gap-1.5 px-4 pb-3 flex-wrap">
                    {tarefa.frequencia && (
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200">{tarefa.frequencia}</Badge>
                    )}
                    {tarefa.projeto && (
                        <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100">{tarefa.projeto}</Badge>
                    )}
                    <StatusBadge status={tarefa.status} />
                    {tarefa.tempo_estimado && (
                        <Badge className="bg-lime-50 text-lime-700 border border-lime-200">
                            <IconClock />{tarefa.tempo_estimado}
                        </Badge>
                    )}
                    {tarefa.prazo && (
                        <span className={`text-[12px] flex items-center gap-1 ${vencida ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            <IconCalendar />{formatarData(tarefa.prazo)}
                        </span>
                    )}
                </div>
            )}

            {/* Propriedades expandidas */}
            {expandido && (
                <div className="border-t border-gray-100 px-4 pt-3 pb-4 space-y-px">
                    <PropRow icon={<IconFrequency />} label="Frequência">
                        {tarefa.frequencia
                            ? <Badge className="bg-amber-50 text-amber-700 border border-amber-200">{tarefa.frequencia}</Badge>
                            : <span className="text-gray-300 text-[12px]">Vazio</span>}
                        {tarefa.dia_semana && (
                            <Badge className="bg-gray-100 text-gray-600 border border-gray-200">{tarefa.dia_semana}</Badge>
                        )}
                    </PropRow>

                    <PropRow icon={<IconPortfolio />} label="Portfólio">
                        {tarefa.portfolio
                            ? <Badge className="bg-gray-100 text-gray-700 border border-gray-200">{tarefa.portfolio}</Badge>
                            : <span className="text-gray-300 text-[12px]">Vazio</span>}
                    </PropRow>

                    <PropRow icon={<IconCalendar />} label="Prazo">
                        {tarefa.prazo
                            ? <span className={`text-[13px] font-medium ${vencida ? 'text-red-600' : 'text-gray-700'}`}>{formatarData(tarefa.prazo)}</span>
                            : <span className="text-gray-300 text-[12px]">Vazio</span>}
                    </PropRow>

                    <PropRow icon={<span className="text-[11px] leading-none">◎</span>} label="Prioridade">
                        {tarefa.prioridade
                            ? <PriorityBadge prioridade={tarefa.prioridade} />
                            : <span className="text-gray-300 text-[12px]">Vazio</span>}
                    </PropRow>

                    <PropRow icon={<IconFolder />} label="Projeto">
                        {tarefa.projeto
                            ? <Badge className="bg-gray-100 text-gray-700 border border-gray-200">{tarefa.projeto}</Badge>
                            : <span className="text-gray-300 text-[12px]">Vazio</span>}
                    </PropRow>

                    <PropRow icon={<span className="text-[11px] leading-none">✦</span>} label="Status">
                        <StatusBadge status={tarefa.status} />
                    </PropRow>

                    <PropRow icon={<IconClock />} label="Tempo estimado">
                        {tarefa.tempo_estimado
                            ? <Badge className="bg-lime-50 text-lime-700 border border-lime-200">{tarefa.tempo_estimado}</Badge>
                            : <span className="text-gray-300 text-[12px]">Vazio</span>}
                    </PropRow>

                    <PropRow icon={<IconArea />} label="Área">
                        {tarefa.area
                            ? <Badge className="bg-pink-50 text-pink-700 border border-pink-200">{tarefa.area}</Badge>
                            : <span className="text-gray-300 text-[12px]">Vazio</span>}
                    </PropRow>

                    {tarefa.notas && (
                        <PropRow icon={<IconNotes />} label="Notas">
                            <span className="text-[12px] text-gray-600 leading-relaxed">{tarefa.notas}</span>
                        </PropRow>
                    )}
                </div>
            )}
        </div>
    )
}
