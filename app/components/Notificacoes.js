'use client'

import { useState, useEffect, useRef } from 'react'

export default function Notificacoes({ tarefas, onSelect }) {
    const [open, setOpen] = useState(false)
    const [grupos, setGrupos] = useState({ vencidas: [], hoje: [], amanha: [] })
    const containerRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const hojeStr   = new Date().toISOString().slice(0, 10)
        const amanhaStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

        const vencidas = tarefas.filter(t => {
            if (!t.prazo || t.status === 'Concluído') return false
            return new Date(t.prazo + 'T23:59:59') < hoje
        }).map(t => {
            const atraso = Math.floor((hoje - new Date(t.prazo + 'T23:59:59')) / 86400000)
            return { ...t, atraso }
        })

        const venceHoje  = tarefas.filter(t => t.prazo === hojeStr  && t.status !== 'Concluído')
        const venceAmanha = tarefas.filter(t => t.prazo === amanhaStr && t.status !== 'Concluído')

        setGrupos({ vencidas, hoje: venceHoje, amanha: venceAmanha })

        // Web Notification — só para vencidas
        if (vencidas.length > 0 && typeof window !== 'undefined' && 'Notification' in window) {
            const lastNotified = localStorage.getItem('alllife_last_notification')
            const now = Date.now()
            if (!lastNotified || (now - parseInt(lastNotified)) > 3600000) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        const notif = new Notification('⚠️ Tarefas atrasadas', {
                            body: `${vencidas.length} ${vencidas.length === 1 ? 'tarefa vencida' : 'tarefas vencidas'}`,
                            icon: '/favicon.ico'
                        })
                        notif.onclick = () => { window.focus(); setOpen(true) }
                        localStorage.setItem('alllife_last_notification', now.toString())
                    }
                })
            }
        }
    }, [tarefas])

    const total = grupos.vencidas.length + grupos.hoje.length + grupos.amanha.length

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setOpen(!open)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-surface border border-border hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {total > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-[#DC2626] rounded-full border-2 border-bg">
                        {total}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[320px] bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <h3 className="m-0 text-[13px] font-semibold text-text-primary">Alertas</h3>
                        {total > 0 && (
                            <span className="text-[11px] font-medium text-[#DC2626] bg-[#DC2626]/10 px-2 py-0.5 rounded-full">
                                {total} {total === 1 ? 'item' : 'itens'}
                            </span>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {total === 0 ? (
                            <div className="text-center py-8 text-text-tertiary text-[12px]">
                                ✅ Tudo em dia!
                            </div>
                        ) : (
                            <>
                                <Secao
                                    titulo="Vencidas"
                                    cor="#DC2626"
                                    tarefas={grupos.vencidas}
                                    onSelect={t => { onSelect?.(t); setOpen(false) }}
                                    renderExtra={t => (
                                        <span className="text-[11px] font-semibold text-[#DC2626] whitespace-nowrap bg-[#DC2626]/10 px-1.5 py-0.5 rounded">
                                            -{t.atraso} {t.atraso === 1 ? 'dia' : 'dias'}
                                        </span>
                                    )}
                                />
                                <Secao
                                    titulo="Vence hoje"
                                    cor="#D97706"
                                    tarefas={grupos.hoje}
                                    onSelect={t => { onSelect?.(t); setOpen(false) }}
                                    renderExtra={() => (
                                        <span className="text-[11px] font-semibold text-[#D97706] whitespace-nowrap bg-[#D97706]/10 px-1.5 py-0.5 rounded">
                                            hoje
                                        </span>
                                    )}
                                />
                                <Secao
                                    titulo="Vence amanhã"
                                    cor="#2563EB"
                                    tarefas={grupos.amanha}
                                    onSelect={t => { onSelect?.(t); setOpen(false) }}
                                    renderExtra={() => (
                                        <span className="text-[11px] font-semibold text-[#2563EB] whitespace-nowrap bg-[#2563EB]/10 px-1.5 py-0.5 rounded">
                                            amanhã
                                        </span>
                                    )}
                                />
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function Secao({ titulo, cor, tarefas, renderExtra, onSelect }) {
    if (!tarefas.length) return null
    return (
        <div>
            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: cor, background: cor + '10' }}>
                {titulo} · {tarefas.length}
            </div>
            <div className="p-2 space-y-1">
                {tarefas.map(t => (
                    <button
                        key={t.id}
                        onClick={() => onSelect?.(t)}
                        className="w-full text-left p-3 bg-bg border border-border rounded-lg hover:border-text-tertiary transition-colors cursor-pointer"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <p className="m-0 text-[13px] font-medium text-text-primary leading-tight flex-1">{t.nome}</p>
                            {renderExtra(t)}
                        </div>
                        {(t.projeto || t.area) && (
                            <div className="mt-1.5 text-[11px] text-text-secondary flex items-center gap-1.5">
                                {t.projeto && <span>{t.projeto}</span>}
                                {t.projeto && t.area && <span className="text-border">·</span>}
                                {t.area && <span>{t.area}</span>}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}
