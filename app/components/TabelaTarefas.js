'use client'

import { isVencida, formatarData, getPrioridadeConfig } from '@/app/lib/tarefas'
import { TarefaCheckbox } from '@/app/components/ui'

export default function TabelaTarefas({ tarefas, onToggle, onSelect }) {
    if (!tarefas || tarefas.length === 0) return null

    return (
        <div className="flex flex-col gap-[2px]">
            {tarefas.map((t) => {
                const concluida = t.status === 'Concluído'
                const vencida = isVencida(t)
                const p = getPrioridadeConfig(t.prioridade)

                return (
                    <div
                        key={t.id}
                        onClick={() => onSelect && onSelect(t)}
                        className={[
                            'flex items-center px-4 py-3 bg-surface hover:bg-surface-hover rounded-[6px] cursor-pointer transition-colors duration-75',
                            concluida ? 'opacity-40' : '',
                        ].join(' ')}
                        style={{ borderLeft: `3px solid ${p.borderColor}` }}
                    >
                        <div className="mr-3">
                            <TarefaCheckbox tarefa={t} onToggle={onToggle} />
                        </div>
                        
                        <div className="flex flex-1 min-w-0 items-center justify-between gap-4">
                            <span className={`text-[13px] truncate ${vencida ? 'font-medium text-priority-urgent' : 'text-text-primary'}`}>
                                {t._tipoSemana === 'prazo' && <span className="mr-1.5 select-none" title="Prazo nesta data">📅</span>}
                                {t.nome}
                            </span>

                            <div className="flex items-center gap-3 flex-shrink-0 text-[11px] text-text-tertiary">
                                {t.projeto && (
                                    <span className="bg-surface-hover px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                        {t.projeto}
                                    </span>
                                )}
                                {t.prazo && (
                                    <span className={`text-[12px] ${vencida ? 'text-priority-urgent' : 'text-text-secondary'}`}>
                                        {formatarData(t.prazo)}
                                    </span>
                                )}
                                {t.prioridade && (
                                    <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${p.dot}`} />
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
