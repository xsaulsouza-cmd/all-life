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

// --- View "Em Breve" ---

function ViewEmBreve({ label }) {
    return (
        <div className="flex flex-col items-center justify-center h-[360px] text-text-tertiary gap-3">
            <span className="text-[32px]">🚧</span>
            <p className="text-[14px] font-semibold text-text-secondary">Vista &quot;{label}&quot; em breve</p>
            <p className="text-[13px]">Esta seção será implementada em breve.</p>
        </div>
    )
}

// --- Conteudo Interno ---

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
    const tarefaSelecionadaRef = useRef(null)
    tarefaSelecionadaRef.current = tarefaSelecionada

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
    }, [])

    useEffect(() => {
        function handleKey(e) {
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

    async function toggleTarefa(id, statusAtual) {
        const ciclo = { 'Não iniciada': 'Em andamento', 'Em andamento': 'Concluído', 'Concluído': 'Não iniciada' }
        const novoStatus = ciclo[statusAtual] || 'Em andamento'
        setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t))
        await supabase.from('tarefas').update({ status: novoStatus, atualizada_em: new Date().toISOString() }).eq('id', id)
        if (tarefaSelecionada?.id === id) {
            setTarefaSelecionada(p => ({ ...p, status: novoStatus }))
        }
    }

    function handleUpdateTarefa(id, updates) {
        setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
        setTarefaSelecionada(p => ({ ...p, ...updates }))
    }

    function handleDeleteTarefa(id) {
        setTarefas(prev => prev.filter(t => t.id !== id))
        setTarefaSelecionada(null)
    }

    function handleNovaTarefa() {}

    async function handleBulkDelete(ids) {
        setTarefas(prev => prev.filter(t => !ids.includes(t.id)))
        await Promise.all(ids.map(id => supabase.from('tarefas').delete().eq('id', id)))
    }

    async function handleBulkStatus(ids, status) {
        setTarefas(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t))
        await Promise.all(ids.map(id => supabase.from('tarefas').update({ status, atualizada_em: new Date().toISOString() }).eq('id', id)))
    }

    const viewInfo = NAV_VIEWS.find(i => i.id === viewAtiva)
    const viewLabel = viewInfo?.label || 'Dashboard'
    const viewIcon = viewInfo?.icon || ''
    const tarefasOrdenadas = useMemo(() => ordenarPorPrioridade(tarefas), [tarefas])

    const tarefasFiltradas = useMemo(() => {
        return busca.length >= 2
            ? tarefasOrdenadas.filter(t => t.nome.toLowerCase().includes(busca.toLowerCase()))
            : tarefasOrdenadas
    }, [busca, tarefasOrdenadas])

    function renderView() {
        if (loading) return <LoadingSkeleton />
        if (erro) return (
            <div className="bg-surface border border-priority-urgent rounded-lg px-4 py-3 text-priority-urgent text-[13px]">
                ⚠️ Erro ao carregar tarefas: {erro}
            </div>
        )

        switch (viewAtiva) {
            case 'dashboard':   return (
                <div className="flex gap-6 items-start">
                    <div className="flex-1 min-w-0">
                        <ViewDashboard tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
                    </div>
                    <div className="w-[340px] flex-shrink-0 border-l border-border pl-6">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.08em] mb-3">☀️ Hoje</p>
                        <ViewHoje tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
                    </div>
                </div>
            )
            case 'hoje':        return <ViewHoje        tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            case 'semana':      return <ViewSemana      tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            case 'mes':         return <ViewSemana      tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} modo="mes" />
            case 'gantt':       return (
                <div className="flex gap-6 items-start">
                    <div className="flex-1 min-w-0">
                        <ViewGantt tarefas={tarefasFiltradas} />
                    </div>
                    <div className="w-[320px] flex-shrink-0 border-l border-border pl-6">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.08em] mb-3">🗂️ Por Projeto</p>
                        <ViewPorProjeto tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
                    </div>
                </div>
            )
            case 'recorrentes': return <ViewRecorrentes tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            case 'projetos':    return <ViewPorProjeto  tarefas={tarefasFiltradas} onToggle={toggleTarefa} onSelect={setTarefaSelecionada} />
            default:            return <ViewEmBreve label={viewLabel} />
        }
    }

    const tarefasAtivas = useMemo(() => tarefas.filter(t => t.status !== 'Concluído'), [tarefas])

    return (
        <BulkSelectProvider onDelete={handleBulkDelete} onStatusChange={handleBulkStatus}>
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />

            {showModal && (
                <ModalNovaTarefa
                    onClose={() => setShowModal(false)}
                    onSalvar={handleNovaTarefa}
                />
            )}

            {showPalette && (
                <CommandPalette
                    tarefas={tarefas}
                    onClose={() => setShowPalette(false)}
                    onSelect={(t) => { setTarefaSelecionada(t); setShowPalette(false) }}
                    onNovaTarefa={() => { setShowPalette(false); setShowModal(true) }}
                />
            )}

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

                <main className="flex-1 px-8 py-6">
                    <div className={['dashboard', 'gantt'].includes(viewAtiva) ? 'w-full' : 'max-w-[800px]'}>
                        <ErrorBoundary titulo={`Erro na view "${viewLabel}"`}>
                            {renderView()}
                        </ErrorBoundary>
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

            <BulkActionsBar />
        </div>
        </BulkSelectProvider>
    )
}

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><LoadingSkeleton /></div>}>
            <HomeContent />
        </Suspense>
    )
}
