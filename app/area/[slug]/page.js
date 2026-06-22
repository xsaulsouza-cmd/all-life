'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import Header from '@/app/components/Header'
import ModalNovaTarefa from '@/app/components/ModalNovaTarefa'
import PainelTarefa from '@/app/components/PainelTarefa'
import { LoadingSkeleton } from '@/app/components/ui'
import { supabase } from '@/lib/supabase'
import { toSlug, GRUPOS_AREA } from '@/app/lib/tarefas'

export default function AreaPage() {
    const params = useParams()
    const router = useRouter()
    
    const [area, setArea] = useState(null)
    const [portfolios, setPortfolios] = useState([]) // represented as projects
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
    const [todasTarefas, setTodasTarefas] = useState([])

    async function carregar() {
        setLoading(true)
        setErro(null)
        try {
            // 1. Fetch Area by slug
            const { data: areaData, error: areaError } = await supabase
                .from('areas')
                .select('*')
                .eq('slug', params.slug)
                .single()

            if (areaError) {
                setErro('Área não encontrada: ' + areaError.message)
                setLoading(false)
                return
            }
            setArea(areaData)

            // 2. Fetch Tasks under this area (usando mapeamento de grupos)
            const areasDoGrupo = GRUPOS_AREA[params.slug] || [areaData.nome]
            const { data: tarefasData, error: tarefasError } = await supabase
                .from('tarefas')
                .select('*')
                .in('area', areasDoGrupo)

            if (tarefasError) {
                setErro('Erro ao buscar tarefas: ' + tarefasError.message)
                setLoading(false)
                return
            }

            setTodasTarefas(tarefasData || [])

            // Group tasks by project (campo 'projeto')
            const grupos = (tarefasData || []).reduce((acc, t) => {
                const proj = t.projeto || 'Sem projeto'
                if (!acc[proj]) acc[proj] = []
                acc[proj].push(t)
                return acc
            }, {})

            const portfoliosList = Object.entries(grupos).map(([nome, list]) => {
                const total = list.length
                const concluidas = list.filter(t => t.status === 'Concluído').length
                const urgentes = list.filter(t => t.prioridade === 'Urgente' && t.status !== 'Concluído').length
                return {
                    nome,
                    total,
                    concluidas,
                    urgentes
                }
            })

            setPortfolios(portfoliosList)
        } catch (e) {
            setErro(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        carregar()
    }, [params.slug])

    const tarefasAtivas = todasTarefas.filter(t => t.status !== 'Concluído')

    if (loading) {
        return (
            <div className="flex min-h-screen bg-bg overflow-x-hidden">
                <Sidebar />
                <div className="ml-[var(--sw)] p-8 flex-1">
                    <LoadingSkeleton />
                </div>
            </div>
        )
    }

    if (erro) {
        return (
            <div className="flex min-h-screen bg-bg overflow-x-hidden">
                <Sidebar />
                <div className="ml-[var(--sw)] p-8 flex-1 text-priority-urgent">
                    ⚠️ {erro}
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />

            <div className={`ml-[var(--sw)] flex-1 flex flex-col min-h-screen transition-all duration-300 ${tarefaSelecionada ? 'mr-[420px]' : ''}`}>
                <Header 
                    titulo={area?.nome || 'Área'}
                    subtitulo="Área"
                    icon="📂"
                    tarefasAtivas={tarefasAtivas}
                    totalTarefas={tarefasAtivas.length}
                    onNovaTarefa={() => setShowModal(true)}
                />

                <main className="flex-1 px-8 py-6">
                    <p className="text-[13px] text-text-secondary m-0 mb-6">
                        {portfolios.reduce((s, p) => s + p.total, 0)} tarefas em {portfolios.length} projetos
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {portfolios.map(p => {
                            const pct = p.total > 0 ? Math.round((p.concluidas / p.total) * 100) : 0
                            return (
                                <div
                                    key={p.nome}
                                    onClick={() => router.push(`/area/${params.slug}/${toSlug(p.nome)}`)}
                                    className="bg-surface hover:bg-surface-hover border border-border hover:border-text-tertiary rounded-xl p-5 cursor-pointer transition-all duration-150 flex flex-col justify-between h-[140px]"
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <span className="text-[15px] font-semibold text-text-primary truncate">
                                                {p.nome}
                                            </span>
                                            {p.urgentes > 0 && (
                                                <span className="bg-[#DC2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    {p.urgentes} urgente{p.urgentes > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[12px] text-text-secondary">
                                            {p.concluidas} / {p.total} concluídas
                                        </span>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1 bg-bg border border-border rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-accent rounded-full transition-all duration-300" 
                                                    style={{ width: `${pct}%` }} 
                                                />
                                            </div>
                                            <span className="text-[11px] text-text-tertiary w-7 text-right">
                                                {pct}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {portfolios.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                            <span className="text-[24px] mb-2">📂</span>
                            <p className="text-[13px] m-0">Nenhum projeto encontrado nesta área.</p>
                        </div>
                    )}
                </main>
            </div>

            {/* Painel Lateral Direito (Drawer) se alguma tarefa for selecionada */}
            {tarefaSelecionada && (
                <PainelTarefa 
                    tarefa={tarefaSelecionada} 
                    onClose={() => setTarefaSelecionada(null)}
                    onUpdate={() => carregar()}
                    onDelete={() => {
                        setTarefaSelecionada(null)
                        carregar()
                    }}
                />
            )}

            {/* Modal Nova Tarefa */}
            {showModal && (
                <ModalNovaTarefa
                    onClose={() => setShowModal(false)}
                    onSalvar={() => carregar()}
                />
            )}
        </div>
    )
}
