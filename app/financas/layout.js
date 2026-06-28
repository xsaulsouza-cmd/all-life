'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import ModalLancamentoRapido from '@/app/components/financas/ModalLancamentoRapido'

const NAV_ITEMS = [
    { href: '/financas',                label: 'Dashboard' },
    { href: '/financas/contas',         label: 'Contas' },
    { href: '/financas/receitas',       label: 'Receitas' },
    { href: '/financas/despesas',       label: 'Despesas' },
    { href: '/financas/cartoes',        label: 'Cartões' },
    { href: '/financas/dividas',        label: 'Dívidas' },
    { href: '/financas/orcamento',      label: 'Orçamento' },
    { href: '/financas/projecao',       label: 'Projeção' },
    { href: '/financas/calendario',     label: 'Calendário' },
    { href: '/financas/categorias',     label: 'Categorias' },
    { href: '/financas/gastos-previstos', label: 'Previstos' },
    { href: '/financas/reconciliacao',  label: 'Reconciliação' },
    { href: '/financas/investimentos',  label: '📈 Investimentos' },
]

export default function FinancasLayout({ children }) {
    const [showModal, setShowModal] = useState(false)
    const pathname = usePathname()

    return (
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />

            <div className="ml-[var(--sw)] flex-1 flex flex-col min-h-screen">
                {/* Header + Nav Tabs */}
                <div className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-20">
                    <div className="px-8 pt-5 pb-0">
                        <h1 className="text-[18px] font-semibold text-text-primary m-0 mb-3">💰 Finanças</h1>
                        <nav className="flex gap-1 overflow-x-auto pb-0 -mb-px">
                            {NAV_ITEMS.map(item => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={[
                                            'text-[12px] font-medium px-3 py-2 rounded-t-md no-underline whitespace-nowrap transition-colors border-b-2',
                                            isActive
                                                ? 'text-text-primary border-accent bg-surface/50'
                                                : 'text-text-tertiary hover:text-text-secondary border-transparent hover:bg-surface-hover/50'
                                        ].join(' ')}
                                    >
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="flex-1">
                    {children}
                </div>
            </div>

            {/* Botão Flutuante de Lançamento Rápido */}
            <button
                onClick={() => setShowModal(true)}
                style={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#2563EB',
                    color: 'white',
                    fontSize: 24,
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)'
                }}
                title="Lançamento Rápido"
            >
                +
            </button>

            {showModal && <ModalLancamentoRapido onClose={() => setShowModal(false)} />}
        </div>
    )
}
