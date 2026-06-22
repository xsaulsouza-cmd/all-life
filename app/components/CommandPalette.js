'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { NAV_VIEWS, getPrioridadeConfig } from '@/app/lib/tarefas'

const STATUS_ICON = { 'Não iniciada': '○', 'Em andamento': '◐', 'Concluído': '●' }
const STATUS_COR = { 'Não iniciada': 'text-text-tertiary', 'Em andamento': 'text-[#2563EB]', 'Concluído': 'text-[#16A34A]' }

export default function CommandPalette({ tarefas = [], onClose, onSelect, onNovaTarefa }) {
    const [query, setQuery] = useState('')
    const [selecionado, setSelecionado] = useState(0)
    const inputRef = useRef(null)
    const router = useRouter()

    useEffect(() => { inputRef.current?.focus() }, [])

    // Fechar com Escape
    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    // ─── Construir itens ──────────────────────────────────────────────────
    const acoes = [
        { type: 'acao', id: 'nova',   icon: '＋', label: 'Nova tarefa',    hint: 'N',    action: onNovaTarefa },
        ...NAV_VIEWS.map(v => ({
            type: 'acao', id: `view-${v.id}`, icon: v.icon, label: `Ir para ${v.label}`, hint: '',
            action: () => { router.push(`/?view=${v.id}`); onClose() }
        })),
        { type: 'acao', id: 'kanban',  icon: '⬛', label: 'Ir para Kanban',   hint: '', action: () => { router.push('/kanban'); onClose() } },
        { type: 'acao', id: 'financas',icon: '💰', label: 'Ir para Finanças',  hint: '', action: () => { router.push('/financas'); onClose() } },
        { type: 'acao', id: 'desafios',icon: '🎯', label: 'Ir para Desafios',  hint: '', action: () => { router.push('/desafios'); onClose() } },
    ]

    const q = query.toLowerCase().trim()

    const acoesVisiveis = !q
        ? acoes
        : acoes.filter(a => a.label.toLowerCase().includes(q))

    const tarefasFiltradas = !q
        ? tarefas.filter(t => t.status !== 'Concluído').slice(0, 5)
        : tarefas
            .filter(t =>
                t.nome?.toLowerCase().includes(q) ||
                t.projeto?.toLowerCase().includes(q) ||
                t.area?.toLowerCase().includes(q) ||
                t.notas?.toLowerCase().includes(q)
            )
            .slice(0, 8)

    const grupos = []
    if (acoesVisiveis.length > 0) grupos.push({ label: 'Ações', items: acoesVisiveis.map(a => ({ ...a, _grupo: 'acao' })) })
    if (tarefasFiltradas.length > 0) grupos.push({ label: q ? 'Tarefas' : 'Recentes', items: tarefasFiltradas.map(t => ({ ...t, _grupo: 'tarefa' })) })

    const todosItens = grupos.flatMap(g => g.items)
    const sel = Math.min(selecionado, todosItens.length - 1)

    // ─── Navegação teclado ────────────────────────────────────────────────
    function handleKeyDown(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelecionado(s => Math.min(s + 1, todosItens.length - 1)) }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setSelecionado(s => Math.max(s - 1, 0)) }
        if (e.key === 'Enter') {
            e.preventDefault()
            const item = todosItens[sel]
            if (!item) return
            if (item._grupo === 'acao') item.action?.()
            else onSelect?.(item)
        }
    }

    // Resetar seleção quando query muda
    useEffect(() => setSelecionado(0), [query])

    let globalIdx = 0

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className="relative w-full max-w-[560px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <svg className="text-text-tertiary flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar tarefas ou ações..."
                        className="flex-1 bg-transparent border-0 outline-none text-[15px] text-text-primary placeholder:text-text-tertiary"
                    />
                    <kbd className="text-[10px] text-text-tertiary bg-bg border border-border px-1.5 py-0.5 rounded">ESC</kbd>
                </div>

                {/* Resultados */}
                <div className="max-h-[420px] overflow-y-auto py-2">
                    {todosItens.length === 0 && (
                        <p className="text-center text-[13px] text-text-tertiary py-8">Nenhum resultado para &quot;{query}&quot;</p>
                    )}

                    {grupos.map(grupo => (
                        <div key={grupo.label}>
                            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest px-4 pt-3 pb-1 m-0">
                                {grupo.label}
                            </p>
                            {grupo.items.map(item => {
                                const idx = globalIdx++
                                const isSelected = idx === sel

                                if (item._grupo === 'acao') {
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={item.action}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-0 cursor-pointer transition-colors ${isSelected ? 'bg-accent/10 text-accent' : 'bg-transparent text-text-primary hover:bg-surface-hover'}`}
                                        >
                                            <span className="w-5 text-center text-[14px] flex-shrink-0 opacity-60">{item.icon}</span>
                                            <span className="flex-1 text-[13px]">{item.label}</span>
                                            {item.hint && <kbd className="text-[10px] text-text-tertiary bg-bg border border-border px-1.5 py-0.5 rounded">{item.hint}</kbd>}
                                        </button>
                                    )
                                }

                                // Tarefa
                                const prioridadeCfg = getPrioridadeConfig(item.prioridade)
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelect?.(item)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-0 cursor-pointer transition-colors ${isSelected ? 'bg-accent/10' : 'bg-transparent hover:bg-surface-hover'}`}
                                    >
                                        <span className={`text-[13px] w-5 text-center flex-shrink-0 ${STATUS_COR[item.status] || 'text-text-tertiary'}`}>
                                            {STATUS_ICON[item.status] || '○'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] text-text-primary m-0 truncate">{item.nome}</p>
                                            {item.projeto && <p className="text-[11px] text-text-tertiary m-0 mt-0.5 truncate">{item.projeto}</p>}
                                        </div>
                                        {item.prioridade && (
                                            <span className={`text-[10px] font-medium flex-shrink-0 ${prioridadeCfg.text}`}>
                                                {item.prioridade}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[11px] text-text-tertiary">
                    <span>↑↓ navegar</span>
                    <span>↵ selecionar</span>
                    <span>ESC fechar</span>
                </div>
            </div>
        </div>
    )
}
