'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import Header from '@/app/components/Header'
import ModalNovaTarefa from '@/app/components/ModalNovaTarefa'
import PainelTarefa from '@/app/components/PainelTarefa'
import { LoadingSkeleton } from '@/app/components/ui'
import KanbanBoard from '@/app/components/kanban/KanbanBoard'
import { ordenarPorPrioridade } from '@/app/lib/tarefas'

// Componente interno com acesso a searchParams
function KanbanContent() {
    const router       = useRouter()
    const searchParams = useSearchParams()

    const [tarefas, setTarefas]               = useState([])
    const [loading, setLoading]               = useState(true)
    const [erro, setErro]                     = useState(null)
    const [showModal, setShowModal]           = useState(false)
    const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
    const [carregado, setCarregado]           = useState(false)

    // Filtros sincronizados com URL
    const [filtroArea, setFiltroArea]             = useState(() => searchParams.get('area')       || 'Todas as áreas')
    const [filtroProjeto, setFiltroProjeto]       = useState(() => searchParams.get('projeto')    || 'Todos os projetos')
    const [filtroPrioridade, setFiltroPrioridade] = useState(() => searchParams.get('prioridade') || 'Todas as prioridades')

    // Sincronizar filtros → URL (replace para não poluir histórico)
    useEffect(() => {
        const params = new URLSearchParams()
        if (filtroArea       !== 'Todas as áreas')       params.set('area',       filtroArea)
        if (filtroProjeto    !== 'Todos os projetos')     params.set('projeto',    filtroProjeto)
        if (filtroPrioridade !== 'Todas as prioridades') params.set('prioridade', filtroPrioridade)
        const qs = params.toString()
        router.replace('/kanban' + (qs ? '?' + qs : ''), { scroll: false })
    }, [filtroArea, filtroProjeto, filtroPrioridade])

    async function carregar() {
        setLoading(true)
        const { data, error } = await supabase
            .from('tarefas')
            .select('id, nome, status, prioridade, prazo, area, projeto, criada_em')
            .order('criada_em', { ascending: false })
            .limit(200)

        if (error) setErro(error.message)
        else setTarefas(data || [])
        setLoading(false)
        setCarregado(true)
    }

    useEffect(() => {
        if (!carregado) carregar()
    }, [carregado])

    const STATUS_ORDER = ['Não iniciada', 'Em andamento', 'Concluído']

    // Botões ← → no card
    async function handleTaskMove(tarefa, direction) {
        const currentIndex = STATUS_ORDER.indexOf(tarefa.status)
        const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1
        if (nextIndex >= 0 && nextIndex < STATUS_ORDER.length) {
            const novoStatus = STATUS_ORDER[nextIndex]
            setTarefas(prev => prev.map(t => t.id === tarefa.id ? { ...t, status: novoStatus } : t))
            await supabase.from('tarefas').update({ status: novoStatus }).eq('id', tarefa.id)
            if (tarefaSelecionada?.id === tarefa.id) {
                setTarefaSelecionada(p => ({ ...p, status: novoStatus }))
            }
        }
    }

    // Drag & drop — muda status direto para a coluna alvo
    const handleDrop = useCallback(async (tarefaId, novoStatus) => {
        setTarefas(prev => prev.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t))
        await supabase.from('tarefas').update({ status: novoStatus }).eq('id', tarefaId)
        if (tarefaSelecionada?.id === tarefaId) {
            setTarefaSelecionada(p => ({ ...p, status: novoStatus }))
        }
    }, [tarefaSelecionada])

    function handleUpdateTarefa(id, updates) {
        setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
        if (tarefaSelecionada?.id === id) setTarefaSelecionada(p => ({ ...p, ...updates }))
    }

    function handleDeleteTarefa(id) {
        setTarefas(prev => prev.filter(t => t.id !== id))
        setTarefaSelecionada(null)
    }

    // Opções únicas para os selects
    const uniqueAreas       = ['Todas as áreas',       ...new Set(tarefas.map(t => t.area).filter(Boolean))]
    const uniqueProjetos    = ['Todos os projetos',    ...new Set(tarefas.map(t => t.projeto).filter(Boolean))]
    const uniquePrioridades = ['Todas as prioridades', ...new Set(tarefas.map(t => t.prioridade).filter(Boolean))]

    const filteredTarefas = tarefas.filter(t => {
        if (filtroArea       !== 'Todas as áreas'       && t.area       !== filtroArea)       return false
        if (filtroProjeto    !== 'Todos os projetos'    && t.projeto    !== filtroProjeto)    return false
        if (filtroPrioridade !== 'Todas as prioridades' && t.prioridade !== filtroPrioridade) return false
        return true
    })

    const tarefasOrdenadas = ordenarPorPrioridade(filteredTarefas)
    const tarefasAtivas    = tarefas.filter(t => t.status !== 'Concluído')

    // Contagem de filtros ativos para badge
    const filtrosAtivos = [
        filtroArea       !== 'Todas as áreas',
        filtroProjeto    !== 'Todos os projetos',
        filtroPrioridade !== 'Todas as prioridades',
    ].filter(Boolean).length

    const slcStyle = "bg-surface border border-border text-text-secondary text-[12px] px-3 py-1.5 rounded-md hover:border-text-tertiary focus:outline-none focus:border-text-primary outline-none cursor-pointer [color-scheme:dark] transition-colors"

    if (loading) return (
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />
            <div className="ml-[var(--sw)] p-8 flex-1"><LoadingSkeleton /></div>
        </div>
    )

    if (erro) return (
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />
            <div className="ml-[var(--sw)] p-8 flex-1 text-priority-urgent">
                ⚠️ Erro ao carregar tarefas: {erro}
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />

            <div className={`ml-[var(--sw)] flex-1 flex flex-col min-h-screen transition-all duration-300 ${tarefaSelecionada ? 'mr-[420px]' : ''}`}>
                <Header
                    titulo="Kanban"
                    icon="⬛"
                    tarefasAtivas={tarefas}
                    totalTarefas={tarefasAtivas.length}
                    onNovaTarefa={() => setShowModal(true)}
                />

                <main className="flex-1 flex flex-col px-8 py-4">

                    {/* Filtros */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <select className={slcStyle} value={filtroArea} onChange={e => setFiltroArea(e.target.value)}>
                            {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>

                        <select className={slcStyle} value={filtroProjeto} onChange={e => setFiltroProjeto(e.target.value)}>
                            {uniqueProjetos.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <select className={slcStyle} value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)}>
                            {uniquePrioridades.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        {filtrosAtivos > 0 && (
                            <button
                                onClick={() => {
                                    setFiltroArea('Todas as áreas')
                                    setFiltroProjeto('Todos os projetos')
                                    setFiltroPrioridade('Todas as prioridades')
                                }}
                                className="text-[11px] font-medium text-accent hover:text-accent/70 bg-transparent border-0 cursor-pointer transition-colors flex items-center gap-1"
                            >
                                ✕ Limpar filtros
                                <span className="bg-accent/15 text-accent text-[10px] px-1.5 py-0.5 rounded-full">{filtrosAtivos}</span>
                            </button>
                        )}

                        <span className="ml-auto text-[12px] text-text-tertiary">
                            {tarefasOrdenadas.length} de {tarefas.length} tarefas
                        </span>
                    </div>

                    {/* Board */}
                    <div className="flex-1">
                        <KanbanBoard
                            tarefas={tarefasOrdenadas}
                            onTaskClick={setTarefaSelecionada}
                            onTaskMove={handleTaskMove}
                            moverTarefa={handleDrop}
                        />
                    </div>
                </main>
            </div>

            {tarefaSelecionada && (
                <PainelTarefa
                    tarefa={tarefaSelecionada}
                    onClose={() => setTarefaSelecionada(null)}
                    onUpdate={handleUpdateTarefa}
                    onDelete={handleDeleteTarefa}
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

// Wrapper com Suspense obrigatório para useSearchParams no App Router
export default function KanbanPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen bg-bg">
                <div className="ml-[var(--sw)] p-8 flex-1"><LoadingSkeleton /></div>
            </div>
        }>
            <KanbanContent />
        </Suspense>
    )
}
