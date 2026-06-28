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
import { showToast } from '@/app/lib/toast'

export default function AreaPage() {
    const params = useParams()
    const router = useRouter()

    const [area, setArea] = useState(null)
    const [portfolios, setPortfolios] = useState([])
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
    const [todasTarefas, setTodasTarefas] = useState([])

    // Edit/delete state
    const [editandoPortfolio, setEditandoPortfolio] = useState(null)
    const [novoNome, setNovoNome] = useState('')
    const [salvandoRename, setSalvandoRename] = useState(false)
    const [excluindoPortfolio, setExcluindoPortfolio] = useState(null)

    async function carregar() {
        setLoading(true)
        setErro(null)
        try {
            const { data: areaData, error: areaError } = await supabase
                .from('areas')
                .select('*')
                .eq('slug', params.slug)
                .single()

            if (areaError) {
                setErro('Ãrea nÃ£o encontrada: ' + areaError.message)
                setLoading(false)
                return
            }
            setArea(areaData)

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

            const grupos = (tarefasData || []).reduce((acc, t) => {
                const proj = t.projeto || 'Sem projeto'
                if (!acc[proj]) acc[proj] = []
                acc[proj].push(t)
                return acc
            }, {})

            const portfoliosList = Object.entries(grupos).map(([nome, list]) => {
                const total = list.length
                const concluidas = list.filter(t => t.status === 'ConcluÃ­do').length
                const urgentes = list.filter(t => t.prioridade === 'Urgente' && t.status !== 'ConcluÃ­do').length
                return { nome, total, concluidas, urgentes }
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

    async function handleRenomear(e) {
        e.preventDefault()
        if (!novoNome.trim()) return
        if (novoNome.trim() === editandoPortfolio) { setEditandoPortfolio(null); return }
        setSalvandoRename(true)
        try {
            const areasDoGrupo = GRUPOS_AREA[params.slug] || [area?.nome]
            const { error } = await supabase
                .from('tarefas')
                .update({ projeto: novoNome.trim() })
                .eq('projeto', editandoPortfolio)
                .in('area', areasDoGrupo)
            if (error) throw error
            showToast('PortfÃ³lio renomeado!')
            setEditandoPortfolio(null)
            setNovoNome('')
            carregar()
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
        setSalvandoRename(false)
    }

    async function handleExcluir(nome) {
        setExcluindoPortfolio(null)
        try {
            const areasDoGrupo = GRUPOS_AREA[params.slug] || [area?.nome]
            const { error } = await supabase
                .from('tarefas')
                .update({ projeto: null })
                .eq('projeto', nome)
                .in('area', areasDoGrupo)
            if (error) throw error
            showToast('PortfÃ³lio removido (tarefas mantidas sem projeto)')
            carregar()
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    const tarefasAtivas = todasTarefas.filter(t => t.status !== 'ConcluÃ­do')

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
                    â ï¸ {erro}
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />

            <div className={`ml-[var(--sw)] flex-1 flex flex-col min-h-screen transition-all duration-300 ${tarefaSelecionada ? 'mr-[420px]' : ''}`}>
                <Header
                    titulo={area?.nome || 'Ãrea'}
                    subtitulo="Ãrea"
                    icon="ð"
                    tarefasAtivas={tarefasAtivas}
                    totalTarefas={tarefasAtivas.length}
                    onNovaTarefa={() => setShowModal(true)}
                />

                <main className="flex-1 px-8 py-6">
                    <p className="text-[13px] text-text-secondary m-0 mb-6">
                        {portfolios.reduce((s, p) => s + p.total, 0)} tarefas em {portfolios.length} portfÃ³lios
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {portfolios.map(p => {
                            const pct = p.total > 0 ? Math.round((p.concluidas / p.total) * 100) : 0
                            const isEditing = editandoPortfolio === p.nome
                            const isConfirmDelete = excluindoPortfolio === p.nome

                            return (
                                <div
                                    key={p.nome}
                                    className="bg-surface border border-border hover:border-text-tertiary/50 rounded-xl p-5 transition-all duration-150 flex flex-col justify-between min-h-[140px] group relative"
                                >
                                    {isConfirmDelete && (
                                        <div className="absolute inset-0 bg-surface/95 rounded-xl flex flex-col items-center justify-center gap-3 z-10 p-4">
                                            <p className="text-[13px] font-medium text-text-primary text-center m-0">
                                                Excluir portfÃ³lio <strong>{p.nome}</strong>?
                                            </p>
                                            <p className="text-[11px] text-text-tertiary text-center m-0">
                                                As {p.total} tarefa{p.total !== 1 ? 's' : ''} ficarÃ£o sem projeto.
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setExcluindoPortfolio(null)}
                                                    className="px-3 py-1.5 text-[11px] text-text-secondary border border-border rounded-lg cursor-pointer bg-transparent"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleExcluir(p.nome)}
                                                    className="px-3 py-1.5 text-[11px] font-medium bg-priority-urgent text-white border-0 rounded-lg cursor-pointer"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {isEditing ? (
                                        <form onSubmit={handleRenomear} className="flex flex-col gap-2 flex-1 justify-center">
                                            <input
                                                value={novoNome}
                                                onChange={e => setNovoNome(e.target.value)}
                                                className="w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-1.5 outline-none focus:border-accent text-text-primary"
                                                autoFocus
                                                placeholder="Novo nome..."
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditandoPortfolio(null); setNovoNome('') }}
                                                    className="flex-1 text-[11px] text-text-secondary border border-border px-2 py-1 rounded-lg cursor-pointer bg-transparent"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={salvandoRename}
                                                    className="flex-1 text-[11px] font-medium bg-accent text-bg px-2 py-1 rounded-lg border-0 cursor-pointer disabled:opacity-50"
                                                >
                                                    {salvandoRename ? '...' : 'Salvar'}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div>
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <span
                                                        className="text-[15px] font-semibold text-text-primary truncate cursor-pointer hover:text-accent transition-colors"
                                                        onClick={() => router.push(`/area/${params.slug}/${toSlug(p.nome)}`)}
                                                    >
                                                        {p.nome}
                                                    </span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEditandoPortfolio(p.nome)
                                                                setNovoNome(p.nome)
                                                                setExcluindoPortfolio(null)
                                                            }}
                                                            className="p-1 text-text-tertiary hover:text-accent bg-bg border border-border rounded cursor-pointer transition-colors text-[11px]"
                                                            title="Renomear"
                                                        >
                                                            âï¸
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setExcluindoPortfolio(p.nome)
                                                                setEditandoPortfolio(null)
                                                            }}
                                                            className="p-1 text-text-tertiary hover:text-priority-urgent bg-bg border border-border rounded cursor-pointer transition-colors text-[11px]"
                                                            title="Excluir"
                                                        >
                                                            ðï¸
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[12px] text-text-secondary">
                                                        {p.concluidas} / {p.total} concluÃ­das
                                                    </span>
                                                    {p.urgentes > 0 && (
                                                        <span className="bg-[#DC2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                            {p.urgentes} urgente{p.urgentes > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                className="mt-4 cursor-pointer"
                                                onClick={() => router.push(`/area/${params.slug}/${toSlug(p.nome)}`)}
                                            >
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
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {portfolios.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                            <span className="text-[24px] mb-2">ð</span>
                            <p className="text-[13px] m-0">Nenhum portfÃ³lio encontrado nesta Ã¡rea.</p>
                        </div>
                    )}
                </main>
            </div>

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

            {showModal && (
                <ModalNovaTarefa
                    onClose={() => setShowModal(false)}
                    onSalvar={() => carregar()}
                />
            )}
        </div>
    )
}
