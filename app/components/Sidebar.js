'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NAV_VIEWS, toSlug } from '@/app/lib/tarefas'
import ModalNovaArea from '@/app/components/ModalNovaArea'
import ModalEditarArea from '@/app/components/ModalEditarArea'
import { showToast } from '@/app/lib/toast'

function CalendarioGroup({ collapsed, viewAtiva, isHome, pathname }) {
    const calViews = ['hoje', 'semana', 'mes']
    const calActive = isHome && calViews.includes(viewAtiva)
    const [aberto, setAberto] = useState(calActive)

    if (collapsed) {
        return (
            <>
                {[
                    { id: 'hoje', icon: '◉', label: 'Hoje' },
                    { id: 'semana', icon: '▦', label: 'Semana' },
                    { id: 'mes', icon: '📅', label: 'Mês' },
                ].map(item => {
                    const active = isHome && viewAtiva === item.id
                    return (
                        <Link key={item.id} href={`/?view=${item.id}`} title={item.label}
                            className={['flex justify-center w-8 h-8 mx-auto mb-0.5 rounded-md transition-colors no-underline text-[13px] items-center',
                                active ? 'bg-nav-active-bg text-text-primary' : 'text-text-tertiary hover:bg-surface-hover hover:text-text-primary',
                            ].join(' ')}>
                            {item.icon}
                        </Link>
                    )
                })}
            </>
        )
    }

    return (
        <div className="mt-0.5">
            <button
                onClick={() => setAberto(v => !v)}
                className={['w-full flex items-center gap-2.5 px-2 py-[5px] rounded-md text-[13px] bg-transparent border-0 cursor-pointer text-left transition-colors',
                    calActive ? 'text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                ].join(' ')}
            >
                <span className={`text-[13px] w-4 text-center flex-shrink-0 ${calActive ? 'text-text-primary' : 'text-text-tertiary'}`}>📅</span>
                <span className="flex-1">Agenda</span>
                <svg width="8" height="8" viewBox="0 0 10 10" className={`text-text-tertiary flex-shrink-0 transition-transform duration-100 ${aberto ? 'rotate-90' : ''}`}>
                    <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>
            {aberto && (
                <div className="ml-4 mt-0.5">
                    {[
                        { id: 'hoje', icon: '◉', label: 'Hoje' },
                        { id: 'semana', icon: '▦', label: 'Semana' },
                        { id: 'mes', icon: '🗓', label: 'Mês' },
                    ].map(item => {
                        const active = isHome && viewAtiva === item.id
                        return (
                            <Link key={item.id} href={`/?view=${item.id}`}
                                className={['flex items-center gap-2 px-2 py-[4px] rounded-md text-[12px] no-underline transition-colors',
                                    active ? 'bg-nav-active-bg text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                                ].join(' ')}>
                                <span className={`text-[11px] w-3 text-center flex-shrink-0 ${active ? 'text-text-primary' : 'text-text-tertiary'}`}>{item.icon}</span>
                                {item.label}
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function SidebarContent() {
    const [areas, setAreas]           = useState([])
    const [showModalArea, setShowModalArea] = useState(false)
    const [editandoArea, setEditandoArea] = useState(null)
    const [calendarConnected, setCalendarConnected] = useState(null)
    const [mounted, setMounted] = useState(false)
    const [collapsed, setCollapsed]   = useState(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('sidebar_collapsed') === '1'
    })
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Sincroniza CSS var --sw para todos os layouts
    useEffect(() => {
        const w = collapsed ? '48px' : '200px'
        document.documentElement.style.setProperty('--sw', w)
    }, [collapsed])

    function toggleCollapse() {
        const next = !collapsed
        setCollapsed(next)
        localStorage.setItem('sidebar_collapsed', next ? '1' : '0')
    }

    useEffect(() => {
        async function carregarAreas() {
            const { data } = await supabase.from('areas').select('*').order('criada_em')
            setAreas(data || [])
        }
        async function checkCalendar() {
            try {
                const r = await fetch('/api/calendar/status')
                const d = await r.json()
                setCalendarConnected(d.connected)
            } catch {
                setCalendarConnected(false)
            }
        }
        setMounted(true)
        carregarAreas()
        checkCalendar()
    }, [])

    function connectCalendar() {
        const popup = window.open('/api/calendar/auth', 'google_auth', 'width=500,height=640')
        const timer = setInterval(() => {
            if (popup?.closed) {
                clearInterval(timer)
                // Re-check status after popup closes
                fetch('/api/calendar/status')
                    .then(r => r.json())
                    .then(d => {
                        setCalendarConnected(d.connected)
                        if (d.connected) showToast('Google Calendar conectado! 📅')
                    })
            }
        }, 800)
    }

    function handleNovaArea(novaArea) {
        setAreas(prev => [...prev, novaArea])
    }

    function handleAtualizarArea(areaAtualizada) {
        setAreas(prev => prev.map(a => a.id === areaAtualizada.id ? areaAtualizada : a))
    }

    function handleExcluirArea(id) {
        setAreas(prev => prev.filter(a => a.id !== id))
    }

    const isHome = pathname === '/'
    const viewAtiva = isHome ? (searchParams.get('view') || 'dashboard') : null

    const W = collapsed ? 48 : 200

    return (
        <aside
            className="flex-shrink-0 h-screen fixed top-0 left-0 bg-sidebar border-r border-border flex flex-col z-10 transition-[width] duration-200"
            style={{ width: W }}
        >
            {/* Logo + toggle */}
            <div className={`flex items-center pt-4 pb-3 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
                {!collapsed && (
                    <Link href="/" className="flex items-center gap-2 no-underline">
                        <span className="w-4 h-4 rounded-full bg-accent flex-shrink-0 inline-block" />
                        <span className="text-text-primary text-[14px] font-semibold tracking-tight">All Life</span>
                    </Link>
                )}
                <button
                    onClick={toggleCollapse}
                    title={collapsed ? 'Expandir' : 'Recolher'}
                    className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1 flex-shrink-0"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        {collapsed
                            ? <><path d="M9 18l6-6-6-6"/></>
                            : <><path d="M15 18l-6-6 6-6"/></>
                        }
                    </svg>
                </button>
            </div>

            {/* Nav */}
            <nav className={`flex-1 py-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-1' : 'px-2'}`}>
                {/* Visão */}
                <div className="mb-4">
                    {!collapsed && (
                        <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.08em] px-2 mb-1">
                            Visão
                        </span>
                    )}

                    {/* 1. Dashboard */}
                    {(() => {
                        const active = isHome && viewAtiva === 'dashboard'
                        return (
                            <Link href="/?view=dashboard" title={collapsed ? 'Dashboard' : undefined}
                                className={['flex items-center rounded-md text-[13px] no-underline transition-colors duration-100',
                                    collapsed ? 'justify-center w-8 h-8 mx-auto mb-0.5' : 'gap-2.5 w-full px-2 py-[5px]',
                                    active ? 'bg-nav-active-bg text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                                ].join(' ')}>
                                <span className={`text-[13px] w-4 text-center flex-shrink-0 ${active ? 'text-text-primary' : 'text-text-tertiary'}`}>▤</span>
                                {!collapsed && 'Dashboard'}
                            </Link>
                        )
                    })()}

                    {/* 2. Calendário (Hoje / Semana / Mês) */}
                    <CalendarioGroup collapsed={collapsed} viewAtiva={viewAtiva} isHome={isHome} pathname={pathname} />

                    {/* 3. Kanban */}
                    {(() => {
                        const active = pathname.startsWith('/kanban')
                        return (
                            <Link href="/kanban" title={collapsed ? 'Kanban' : undefined}
                                className={['flex items-center rounded-md text-[13px] no-underline transition-colors duration-100 mt-0.5',
                                    collapsed ? 'justify-center w-8 h-8 mx-auto' : 'gap-2.5 w-full px-2 py-[5px]',
                                    active ? 'bg-nav-active-bg text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                                ].join(' ')}>
                                <span className={`text-[13px] w-4 text-center flex-shrink-0 ${active ? 'text-text-primary' : 'text-text-tertiary'}`}>⬛</span>
                                {!collapsed && 'Kanban'}
                            </Link>
                        )
                    })()}

                    {/* 4. Gantt & Projetos (split screen) */}
                    {(() => {
                        const active = isHome && (viewAtiva === 'gantt' || viewAtiva === 'projetos')
                        return (
                            <Link href="/?view=gantt" title={collapsed ? 'Gantt & Projetos' : undefined}
                                className={['flex items-center rounded-md text-[13px] no-underline transition-colors duration-100 mt-0.5',
                                    collapsed ? 'justify-center w-8 h-8 mx-auto' : 'gap-2.5 w-full px-2 py-[5px]',
                                    active ? 'bg-nav-active-bg text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                                ].join(' ')}>
                                <span className={`text-[13px] w-4 text-center flex-shrink-0 ${active ? 'text-text-primary' : 'text-text-tertiary'}`}>◫</span>
                                {!collapsed && 'Gantt & Projetos'}
                            </Link>
                        )
                    })()}

                    {/* 5. Recorrentes */}
                    {(() => {
                        const active = isHome && viewAtiva === 'recorrentes'
                        return (
                            <Link href="/?view=recorrentes" title={collapsed ? 'Recorrentes' : undefined}
                                className={['flex items-center rounded-md text-[13px] no-underline transition-colors duration-100 mt-0.5',
                                    collapsed ? 'justify-center w-8 h-8 mx-auto' : 'gap-2.5 w-full px-2 py-[5px]',
                                    active ? 'bg-nav-active-bg text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                                ].join(' ')}>
                                <span className={`text-[13px] w-4 text-center flex-shrink-0 ${active ? 'text-text-primary' : 'text-text-tertiary'}`}>⟳</span>
                                {!collapsed && 'Recorrentes'}
                            </Link>
                        )
                    })()}

                    {/* 6-7. Finanças + Saúde */}
                    {[
                        { href: '/financas', icon: '💰', label: 'Finanças' },
                        { href: '/desafios', icon: '💪', label: 'Saúde & Esportes' },
                    ].map(({ href, icon, label }) => {
                        const active = pathname.startsWith(href)
                        return (
                            <Link key={href} href={href} title={collapsed ? label : undefined}
                                className={['flex items-center rounded-md text-[13px] no-underline transition-colors duration-100 mt-0.5',
                                    collapsed ? 'justify-center w-8 h-8 mx-auto' : 'gap-2.5 w-full px-2 py-[5px]',
                                    active ? 'bg-nav-active-bg text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                                ].join(' ')}>
                                <span className={`text-[13px] w-4 text-center flex-shrink-0 ${active ? 'text-text-primary' : 'text-text-tertiary'}`}>{icon}</span>
                                {!collapsed && label}
                            </Link>
                        )
                    })}
                </div>

                {/* Projetos */}
                {!collapsed && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between px-3 mb-2 group">
                            <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Projetos</span>
                            <button
                                onClick={() => setShowModalArea(true)}
                                className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Nova Área"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                        </div>
                        <ul className="list-none p-0 m-0 space-y-0.5">
                            {areas.map(a => {
                                const slug = a.slug || toSlug(a.nome)
                                const active = pathname.startsWith(`/area/${slug}`)
                                return (
                                    <li key={a.id} className="group relative">
                                        <Link
                                            href={`/area/${slug}`}
                                            className={`flex items-center px-3 py-1.5 text-[13px] rounded-md transition-colors no-underline pr-8 ${active ? 'bg-nav-active-bg text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/50'}`}
                                        >
                                            <span className="mr-2 text-[14px] leading-none">{a.icone || '📁'}</span>
                                            <span className="truncate">{a.nome}</span>
                                        </Link>
                                        <button
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setEditandoArea(a) }}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer rounded"
                                            title="Editar projeto"
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )}

                {/* Projetos (collapsed — só ícones) */}
                {collapsed && areas.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                        {areas.map(a => {
                            const slug = a.slug || toSlug(a.nome)
                            const active = pathname.startsWith(`/area/${slug}`)
                            return (
                                <Link key={a.id} href={`/area/${slug}`} title={a.nome}
                                    className={`flex justify-center w-8 h-8 mx-auto rounded-md transition-colors no-underline text-[14px] items-center ${active ? 'bg-nav-active-bg' : 'hover:bg-surface-hover/50'}`}
                                >
                                    {a.icone || '📁'}
                                </Link>
                            )
                        })}
                    </div>
                )}
            </nav>

            {/* Configurações + Google Calendar */}
            {!collapsed && mounted && (
                <div className="px-3 pb-2 space-y-1">
                    {/* Configurações */}
                    {(() => {
                        const active = pathname.startsWith('/configuracoes')
                        return (
                            <Link href="/configuracoes/areas"
                                className={['flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] no-underline transition-colors',
                                    active ? 'bg-nav-active-bg text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                                ].join(' ')}>
                                <span className="text-[13px] w-4 text-center flex-shrink-0 text-text-tertiary">⚙️</span>
                                Configurações
                            </Link>
                        )
                    })()}

                    {/* Google Calendar */}
                    {calendarConnected === true ? (
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                            <span className="text-[10px]">📅</span>
                            <span className="text-[11px] text-[#16A34A] font-medium">Calendar conectado</span>
                        </div>
                    ) : calendarConnected === false ? (
                        <button
                            onClick={connectCalendar}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left bg-transparent border border-dashed border-border hover:border-text-tertiary text-text-tertiary hover:text-text-secondary cursor-pointer transition-colors"
                        >
                            <span className="text-[10px]">📅</span>
                            <span className="text-[11px]">Conectar Google Calendar</span>
                        </button>
                    ) : null}
                </div>
            )}
            {collapsed && mounted && (
                <div className="px-1 pb-2">
                    <Link href="/configuracoes/areas" title="Configurações"
                        className={['flex justify-center w-8 h-8 mx-auto rounded-md transition-colors no-underline text-[14px] items-center',
                            pathname.startsWith('/configuracoes') ? 'bg-nav-active-bg' : 'hover:bg-surface-hover text-text-tertiary',
                        ].join(' ')}>
                        ⚙️
                    </Link>
                </div>
            )}

            {/* User */}
            <div className={`py-3 border-t border-border ${collapsed ? 'flex justify-center' : 'px-3'}`}>
                {collapsed ? (
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold" title="Saul Franco">S</div>
                ) : (
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold flex-shrink-0">S</div>
                        <span className="text-[12px] text-text-secondary">Saul Franco</span>
                    </div>
                )}
            </div>

            {/* Modal Nova Área */}
            {showModalArea && (
                <ModalNovaArea
                    onClose={() => setShowModalArea(false)}
                    onSalvar={handleNovaArea}
                />
            )}

            {/* Modal Editar Área */}
            {editandoArea && (
                <ModalEditarArea
                    area={editandoArea}
                    onClose={() => setEditandoArea(null)}
                    onAtualizar={handleAtualizarArea}
                    onExcluir={handleExcluirArea}
                />
            )}
        </aside>
    )
}

export default function Sidebar() {
    return (
        <Suspense fallback={<aside className="w-[200px] flex-shrink-0 h-screen fixed top-0 left-0 bg-sidebar border-r border-border" />}>
            <SidebarContent />
        </Suspense>
    )
}
