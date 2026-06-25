'use client'

import { useEffect, useState, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NAV_VIEWS, hojeLabel, ordenarPorPrioridade } from '@/app/lib/tarefas'
import { LoadingSkeleton } from '@/app/components/ui'
import Sidebar from '@/app/components/Sidebar'
import Header from '@/app/components/Header'
import ModalNovaTarefa from '@/app/components/ModalNovaTarefa'
import ViewDashboard from '@/app/components/ViewDashboard'
import ViewHoje from '@/app/components/ViewHoje'
import ViewSemana from '@/app/components/ViewSemana'
import ViewGantt from '@/app/components/ViewGantt'
import ViewRecorrentes from '@/app/components/ViewRecorrentes'
import ViewPorProjeto from '@/app/components/ViewPorProjeto'
import PainelTarefa from '@/app/components/PainelTarefa'
import CommandPalette from '@/app/components/CommandPalette'
import ErrorBoundary from '@/app/components/ErrorBoundary'
import BulkActionsBar from '@/app/components/BulkActionsBar'
import { BulkSelectProvider } from '@/app/contexts/BulkSelectContext'

// ─── View "Em Breve" ─────────────────────────────────────────────────────────

function ViewEmBreve({ label }) {
    return (
        <div className="flex flex-col items-center justify-center h-[360px] text-text-tertiary gap-3">
            <span className="text-[32px]">🚧</span>
            <p className="text-[14px] font-semibold text-text-secondary">Vista &quot;{label}&quot; em breve</p>
            <p className="text-[13px]">Esta seção será implementada em breve.</p>
        </div>
    )
}

// ─── Conteúdo Interno ─────────────────────────────────────────────────────────

function HomeContent() {
    const searchParams = useSearchParams()
    const viewAtiva = searchParams.get('view') || 'dashboard'

    const [tarefas,    setTarefas]    = useState([])
    const [loading,    setLoading]    = useState(true)
    const [erro,       setErro]       = useState(null)
    const [showModal,  setShowModal]  = useState(false)
    const [showPalette, setShowPalette] = useState(false)
    const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
    const [carregado,  setCarregado]  = useState(false)
    const [busca,      setBusca]      = useState('')
    // Ref para o Realtime não precisar resubscrever a cada seleção de tarefa
    const tarefaSelecionadaRef = useRef(null)
    tarefaSelecionadaRef.current = tarefaSelecionada

    // ─── Carregar tarefas ───────────────────────────────────────────────
    async function carregar() {
        const { data, error } = await supabase
            .from('tarefas')
            .select('id, nome, status, prioridade, prazo, area, projeto, frequencia, dia_semana, tempo_estimado, atualizada_em, criada_em')
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

    // ─── Supabase Realtime ──────────────────────────────────────────────
    // PERF: usa ref para tarefaSelecionada → subscription nunca é recriada
    useEffect(() => {
        const channel = supabase
            .channel('tarefas-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTarefas(prev => prev.find(t => t.id === payload.new.id) ? prev : [payload.new, ...prev])
                } else if (payload.eventType === 'UPDATE') {
                    setTarefas(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t))
                    if (tarefaSelecionadaRef.current?.id === payload.new.id) {
                        setTarefaSelecionada(p => ({ ...p, ...payload.new }))
                    }
                } else if (payload.eventType === 'DELETE') {
                    setTarefas(prev => prev.filter(t => t.id !== payload.old.id))
                    if (tarefaSelecionadaRef.current?.id === payload.old.id) setTarefaSelecionada(null)
                }
            })
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, []) // sem deps → subscription criada 1x e nunca recriada

    // ─── Keyboard shortcuts ──────────────────────────────────────────────
    useEffect(() => {
        function handleKey(e) {
            // Ignorar se estiver digitando em input/textarea/select
            if (['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)) return

            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault()
                setShowModal(true)
                return
            }
            if (e.key === 'Escape') {
                setShowPalette(false)
                setShowModal(false)
                setTarefaSelecionada(null)
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    // ─── Toggle de status (3 estados) ──────────────────────────────────
    async function toggleTarefa(id, statusAtual) {
        const ciclo = { 'Não iniciada': 'Em andamento', 'Em andamento': 'Concluído', 'Concluído': 'Não iniciada' }
        const novoStatus = ciclo[statusAtual] || 'Em andamento'
        setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t))
        await supabase.from('tarefas').update({ status: novoStatus, atualizada_em: new Date().toISOString() }).eq('id', id)
        if (tarefaSelecionada?.id === id) {
            setTarefaSelecionada(p => ({ ...p, status: novoStatus }))
        }
    }

    // ─── Atualizar Tarefa (do painel) ───────────────────────────────────
    function handleUpdateTarefa(id, updates) {
        setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
        setTarefaSelecionada(p => ({ ...p, ...updates }))
    }

    // ─── Excluir Tarefa (do painel) ─────────────────────────────────────
    function handleDeleteTarefa(id) {
        setTarefas(prev => prev.filter(t => t.id !== id))
        setTarefaSelecionada(null)
    }

    // ─── Adicionar nova tarefa ──────────────────────────────────────────
    // PERF: Realtime INSERT já atualiza o estado — não precisa refetch
    function handleNovaTarefa() {}

    // ─── Bulk actions ──────────────────────────────────────────────────
    async function handleBulkDelete(ids) {
        setTarefas(prev => prev.filter(t => !ids.includes(t.id)))
        await Promise.all(ids.map(id => supabase.from('tarefas').delete().eq('id', id)))
    }

    async function handleBulkStatus(ids, status) {
        setTarefas(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t))
        await Promise.all(ids.map(id => supabase.from('tarefas').update({ status, atualizada_em: new Date().toISOString() }).eq('id', id)))
    }

    // ─── Info da view activa ─────────────────────────────────────────────
    const viewInfo = NAV_VIEWS.find(i => i.id === viewAtiva)
    const viewLabel = viewInfo?.label || 'Dashboard'
    const viewIcon = viewInfo?.icon || ''
    // PERF: memoizado para não reordenar em todo render (ex: ao abrir modal)
    const tarefasOrdenadas = useMemo(() => ordenarPorPrioridade(tarefas), [tarefas])

    // Filtro de busca global
    const tarefasFiltradas = useMemo(() => {
        return busca.length >= 2
            ? tarefasOrdenadas.filter(t => t.nome.toLowerCase().includes(busca.toLowerCase()))
            : tarefasOrdenadas
    }, [busca, tarefasOrdenadas])

    // ─── Render da view ─────────────────────────────────────────────────
    function renderView() {
        if (loading) return <LoadingSkeleton />
        if (erro) return (
            <div className="bg-surface border border-priority-urgent rounded-lg px-4 py-3 text-priority-urgent text-[13px]">
                ⚠️ Erro ao carregar tarefas: {erro}
            </div>
        )

        switch (viewAtiva) {
            case 'hoje':        return <ViewHoje        tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            case 'dashboard':   return <ViewDashboard   tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            case 'semana':      return <ViewSemana      tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            case 'gantt':       return <ViewGantt       tarefas={tarefasFiltradas} />
            case 'recorrentes': return <ViewRecorrentes tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            case 'projetos':    return <ViewPorProjeto  tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            default:            return <ViewEmBreve label={viewLabel} />
        }
    }

    // PERF: memoizado — recalcula só quando tarefas muda
    const tarefasAtivas = useMemo(() => tarefas.filter(t => t.status !== 'Concluído'), [tarefas])

    return (
        <BulkSelectProvider onDelete={handleBulkDelete} onStatusChange={handleBulkStatus}>
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />

            {/* Modal */}
            {showModal && (
                <ModalNovaTarefa
                    onClose={() => setShowModal(false)}
                    onSalvar={handleNovaTarefa}
                />
            )}

            {/* Command Palette */}
            {showPalette && (
                <CommandPalette
                    tarefas={tarefas}
                    onClose={() => setShowPalette(false)}
                    onSelect={(t) => { setTarefaSelecionada(t); setShowPalette(false) }}
                    onNovaTarefa={() => { setShowPalette(false); setShowModal(true) }}
                />
            )}

            {/* Área Principal */}
            <div className={`ml-[var(--sw)] flex-1 flex flex-col min-h-screen transition-all duration-300 ${tarefaSelecionada ? 'mr-[420px]' : ''}`}>

                <Header
                    titulo={viewLabel}
                    icon={viewIcon}
                    tarefasAtivas={tarefas}
                    totalTarefas={busca.length >= 2 ? tarefasFiltradas.length : tarefasAtivas.length}
                    onNovaTarefa={() => setShowModal(true)}
                    onOpenPalette={() => setShowPalette(true)}
                    onSelect={setTarefaSelecionada}
                    onBusca={setBusca}
                />

                {/* Conteúdo scrollável */}
                <main className="flex-1 px-8 py-6">
                    <div className={viewAtiva === 'dashboard' ? 'max-w-[900px]' : 'max-w-[800px]'}>
                        <ErrorBoundary titulo={`Erro na view "${viewLabel}"`}>
                            {renderView()}
                        </ErrorBoundary>
                    </div>
                </main>
            </div>

            {/* Painel Lateral Direito (Expandido) */}
            {tarefaSelecionada && (
                <PainelTarefa
                    tarefa={tarefaSelecionada}
                    onClose={() => setTarefaSelecionada(null)}
                    onUpdate={handleUpdateTarefa}
                    onDelete={handleDeleteTarefa}
                />
            )}

            {/* Bulk Actions Bar (flutuante) */}
            <BulkActionsBar />
        </div>
        </BulkSelectProvider>
    )
}

// ─── Componente Principal (com Suspense) ──────────────────────────────────────

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><LoadingSkeleton /></div>}>
            <HomeContent />
        </Suspense>
    )
}