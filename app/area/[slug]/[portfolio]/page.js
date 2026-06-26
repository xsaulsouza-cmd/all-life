'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import Header from '@/app/components/Header'
import PainelTarefa from '@/app/components/PainelTarefa'
import ModalNovaTarefa from '@/app/components/ModalNovaTarefa'
import { LoadingSkeleton, TarefaCheckbox } from '@/app/components/ui'
import { supabase } from '@/lib/supabase'
import { toSlug, ordenarPorPrioridade, GRUPOS_AREA } from '@/app/lib/tarefas'

function ConcluídasSection({ tarefas, TarefaRow }) {
    const [aberta, setAberta] = useState(false)
    return (
        <div>
            <button
                onClick={() => setAberta(v => !v)}
                className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-text-secondary bg-transparent border-0 cursor-pointer py-1 transition-colors"
            >
                <svg width="8" height="8" viewBox="0 0 10 10" className={`transition-transform duration-100 ${aberta ? 'rotate-90' : ''}`}>
                    <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {aberta ? 'Esconder concluídas' : `Ver ${tarefas.length} concluída${tarefas.length > 1 ? 's' : ''}`}
            </button>
            {aberta && (
                <div className="bg-surface border border-border rounded-xl overflow-hidden opacity-60 mt-1">
                    <div className="divide-y divide-border">
                        {tarefas.map(t => <TarefaRow key={t.id} t={t} />)}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function PortfolioPage() {
    const params = useParams()
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [tarefas, setTarefas] = useState([])
    const [area, setArea] = useState(null)
    const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
    const [showModal, setShowModal] = useState(false) // placeholder for modal state as requested

    async function carregar() {
        setLoading(true)
        setErro(null)
        try {
            // 1. Fetch area
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

            // 2. Fetch tasks under this area (usando mapeamento de grupos)
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

            // Filter tasks by matching params.portfolio with the slug of the project (campo 'projeto')
            const projectTasks = (tarefasData || []).filter(t => {
                const projectSlug = toSlug(t.projeto || 'Sem projeto')
                return projectSlug === params.portfolio
            })

            // Sort project tasks by priority: Urgente -> Alta -> Média -> others
            const sortedTasks = ordenarPorPrioridade(projectTasks)
            setTarefas(sortedTasks)
        } catch (e) {
            setErro(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        carregar()
    }, [params.slug, params.portfolio])

    // Local toggling status
    async function handleToggleStatus(id, currentStatus) {
        const ciclo = { 'Não iniciada': 'Em andamento', 'Em andamento': 'Concluído', 'Concluído': 'Não iniciada' }
        const novoStatus = ciclo[currentStatus] || 'Em andamento'
        
        // Optimistic update
        setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t))
        
        const { error } = await supabase
            .from('tarefas')
            .update({ status: novoStatus, atualizada_em: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            // Revert state
            setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t))
            console.error('Erro ao atualizar status:', error.message)
        }
    }

    function handleUpdateTarefa(id, updates) {
        setTarefas(prev => ordenarPorPrioridade(prev.map(t => t.id === id ? { ...t, ...updates } : t)))
        if (tarefaSelecionada?.id === id) {
            setTarefaSelecionada(p => ({ ...p, ...updates }))
        }
    }

    function handleDeleteTarefa(id) {
        setTarefas(prev => prev.filter(t => t.id !== id))
        setTarefaSelecionada(null)
    }

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

    // Determine the original project name from tasks or fallback to parameter
    const firstTaskWithProject = tarefas.find(t => t.projeto)
    const nomeDoPortfolio = firstTaskWithProject ? firstTaskWithProject.projeto : (params.portfolio.charAt(0).toUpperCase() + params.portfolio.slice(1)).replace(/-/g, ' ')

    // KPIs calculation
    const total = tarefas.length
    const concluidas = tarefas.filter(t => t.status === 'Concluído').length
    const emAndamento = tarefas.filter(t => t.status === 'Em andamento').length
    const urgentes = tarefas.filter(t => t.prioridade === 'Urgente' && t.status !== 'Concluído').length

    const breadcrumb = (
        <div className="flex items-center gap-1.5 text-text-tertiary">
            <a href={`/area/${params.slug}`} className="hover:text-text-primary hover:underline transition-colors font-medium">
                {area?.nome || params.slug}
            </a>
            <span>&gt;</span>
            <span className="text-text-secondary">{nomeDoPortfolio}</span>
        </div>
    )

    const priorityBadge = (p) => {
        let style = 'bg-surface-hover text-text-tertiary border border-border'
        if (p === 'Urgente') style = 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 font-semibold'
        if (p === 'Alta') style = 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20 font-semibold'
        if (p === 'Média') style = 'bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20'

        return (
            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${style}`}>
                {p || 'Média'}
            </span>
        )
    }

    return (
        <div className="flex min-h-screen bg-bg overflow-x-hidden">
            <Sidebar />

            <div className={`ml-[var(--sw)] flex-1 flex flex-col min-h-screen transition-all duration-300 ${tarefaSelecionada ? 'mr-[420px]' : ''}`}>
                <Header 
                    titulo={nomeDoPortfolio}
                    subtitulo={breadcrumb}
                    icon="📋"
                    tarefasAtivas={tarefas.filter(t => t.status !== 'Concluído')}
                    totalTarefas={tarefas.filter(t => t.status !== 'Concluído').length}
                    onNovaTarefa={() => setShowModal(true)}
                />

                <main className="flex-1 px-8 py-6">
                    {/* KPIs Container */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Total', value: total, color: 'text-text-primary' },
                            { label: 'Concluídas', value: concluidas, color: 'text-status-done' },
                            { label: 'Em Andamento', value: emAndamento, color: 'text-status-progress' },
                            { label: 'Urgentes', value: urgentes, color: 'text-priority-urgent' }
                        ].map(kpi => (
                            <div key={kpi.label} className="bg-surface border border-border rounded-xl px-4 py-3">
                                <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">
                                    {kpi.label}
                                </span>
                                <span className={`text-[22px] font-semibold ${kpi.color}`}>
                                    {kpi.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Task List */}
                    {(() => {
                        const ativas = tarefas.filter(t => t.status !== 'Concluído')
                        const concluidasList = tarefas.filter(t => t.status === 'Concluído')

                        function TarefaRow({ t }) {
                            const concluida = t.status === 'Concluído'
                            const isOverdue = t.prazo && new Date(t.prazo + 'T23:59:59') < new Date() && !concluida
                            return (
                                <div
                                    onClick={() => setTarefaSelecionada(t)}
                                    className={`flex items-center gap-4 px-5 py-3 hover:bg-surface-hover/50 cursor-pointer transition-colors ${concluida ? 'opacity-50' : ''}`}
                                >
                                    <TarefaCheckbox tarefa={t} onToggle={handleToggleStatus} />
                                    <span className={`text-[13px] flex-1 ${concluida ? 'line-through text-text-tertiary' : 'text-text-primary font-medium'}`}>
                                        {t.nome}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        {priorityBadge(t.prioridade)}
                                        {t.tempo_estimado && (
                                            <span className="text-[11px] text-text-tertiary bg-bg px-2 py-0.5 rounded border border-border">⏱️ {t.tempo_estimado}</span>
                                        )}
                                        {t.prazo && (
                                            <span className={`text-[11px] px-2 py-0.5 rounded ${isOverdue ? 'text-white bg-[#DC2626]/80 font-semibold' : 'text-text-tertiary bg-bg border border-border'}`}>
                                                📅 {new Date(t.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <>
                                {/* Ativas */}
                                {ativas.length > 0 && (
                                    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-3">
                                        <div className="divide-y divide-border">
                                            {ativas.map(t => <TarefaRow key={t.id} t={t} />)}
                                        </div>
                                    </div>
                                )}

                                {/* Concluídas colapsáveis */}
                                {concl