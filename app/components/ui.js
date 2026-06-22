'use client'

import { getPrioridadeConfig, getStatusConfig } from '@/app/lib/tarefas'

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ children, className = '' }) {
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded text-[11px] font-medium leading-[18px] ${className}`}>
            {children}
        </span>
    )
}

export function StatusBadge({ status }) {
    const c = getStatusConfig(status)
    return (
        <Badge className={`${c.text} bg-transparent`}>
            <span className={`w-[6px] h-[6px] rounded-full ${c.dot}`} />
            {status || 'Não iniciada'}
        </Badge>
    )
}

export function PriorityBadge({ prioridade }) {
    const c = getPrioridadeConfig(prioridade)
    return (
        <Badge className={`${c.text} bg-transparent`}>
            <span className={`w-[6px] h-[6px] rounded-full ${c.dot}`} />
            {c.label}
        </Badge>
    )
}

// ─── PropRow ──────────────────────────────────────────────────────────────────

export function PropRow({ label, children }) {
    return (
        <div className="flex items-center py-[6px] text-[13px] border-b border-border-light last:border-0">
            <span className="w-[140px] flex-shrink-0 text-text-tertiary text-[12px]">{label}</span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">{children}</div>
        </div>
    )
}

// ─── GrupoHeader ──────────────────────────────────────────────────────────────

export function GrupoHeader({ titulo, count, aberto, onToggle, colorClass = 'text-text-secondary' }) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-2 mb-2 bg-transparent border-0 cursor-pointer p-0 w-full text-left group"
        >
            <svg width="10" height="10" viewBox="0 0 10 10" className={`text-text-tertiary transition-transform duration-150 ${aberto ? 'rotate-90' : 'rotate-0'}`}>
                <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${colorClass}`}>{titulo}</span>
            <span className="text-[11px] text-text-tertiary">{count}</span>
        </button>
    )
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

export function KpiCard({ label, value, colorClass = 'text-text-primary' }) {
    return (
        <div className="bg-surface rounded-lg border border-border px-4 py-3">
            <p className="text-[11px] text-text-tertiary m-0 mb-1 uppercase tracking-wide">{label}</p>
            <p className={`text-[22px] font-semibold m-0 ${colorClass}`}>{value}</p>
        </div>
    )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

export function ProgressBar({ pct, className = '' }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-text-tertiary w-7 text-right">{pct}%</span>
        </div>
    )
}

// ─── TarefaCheckbox ───────────────────────────────────────────────────────────

export function TarefaCheckbox({ tarefa, onToggle }) {
    const status = tarefa.status || 'Não iniciada'
    const p = getPrioridadeConfig(tarefa.prioridade)

    if (status === 'Concluído') {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(tarefa.id, status) }}
                className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white text-[10px] cursor-pointer border-0 p-0 transition-all font-bold"
                title={status}
            >
                ✓
            </button>
        )
    }

    if (status === 'Em andamento') {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(tarefa.id, status) }}
                className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full bg-accent/30 hover:bg-accent/40 border border-accent text-accent text-[8px] cursor-pointer p-0 transition-all font-black pl-[1.5px]"
                title={status}
            >
                ▶
            </button>
        )
    }

    // Não iniciada
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onToggle(tarefa.id, status) }}
            className="w-4 h-4 flex-shrink-0 rounded-full border bg-transparent hover:opacity-80 cursor-pointer p-0 transition-all"
            style={{ borderColor: p.borderColor }}
            title={status}
        />
    )
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

export function LoadingSkeleton() {
    return (
        <div className="p-8 flex flex-col gap-3">
            {[['40%'], ['60%'], ['30%']].map(([w], i) => (
                <div key={i} className="h-5 bg-surface-hover rounded animate-pulse" style={{ width: w }} />
            ))}
        </div>
    )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ msg = 'Nenhuma tarefa.' }) {
    return (
        <div className="flex items-center justify-center py-12 text-text-tertiary text-[13px]">
            {msg}
        </div>
    )
}
