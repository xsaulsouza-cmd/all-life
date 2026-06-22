'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'

const NAV_ITEMS = [
    { href: '/desafios',           icon: '🏠', label: 'Dashboard'  },
    { href: '/desafios/treinos',   icon: '🏋️', label: 'Treinos'    },
    { href: '/desafios/habitos',   icon: '✅', label: 'Hábitos'    },
    { href: '/desafios/metas',     icon: '🎯', label: 'Metas'      },
    { href: '/desafios/desafios',  icon: '🏆', label: 'Desafios'   },
    { href: '/desafios/nutricao',  icon: '🥗', label: 'Nutrição'   },
    { href: '/desafios/metricas',  icon: '📊', label: 'Métricas'   },
]

export default function SaudeLayout({ children }) {
    const pathname = usePathname()

    return (
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />

            <div className="ml-[var(--sw)] flex-1 flex flex-col min-h-screen">
                {/* Header + Tabs */}
                <div className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-20">
                    <div className="px-8 pt-5 pb-0">
                        <h1 className="text-[18px] font-semibold text-text-primary m-0 mb-3">
                            💪 Saúde & Esportes
                        </h1>
                        <nav className="flex gap-0.5 overflow-x-auto pb-0 -mb-px">
                            {NAV_ITEMS.map(item => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={[
                                            'flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-t-md no-underline whitespace-nowrap transition-colors border-b-2',
                                            isActive
                                                ? 'text-text-primary border-accent bg-surface/50'
                                                : 'text-text-tertiary hover:text-text-secondary border-transparent hover:bg-surface-hover/50'
                                        ].join(' ')}
                                    >
                                        <span className="text-[13px]">{item.icon}</span>
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                <div className="flex-1">
                    {children}
                </div>
            </div>
        </div>
    )
}
