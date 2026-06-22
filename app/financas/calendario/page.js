'use client'

import { useState } from 'react'
import { useFinancas } from '@/app/hooks/useFinancas'
import { gerarCalendarioVencimentos, formatCurrency } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'

export default function CalendarioPage() {
    const { despesasFixas, despesasVariaveis, dividas, faturasCartao, loading, erro } = useFinancas()
    
    // Meses para navegar
    const hoje = new Date()
    const [mesAtual, setMesAtual] = useState(hoje.getMonth())
    const [anoAtual, setAnoAtual] = useState(hoje.getFullYear())

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    // Gera os vencimentos e filtra pelo mês/ano selecionado
    const todosVencimentos = gerarCalendarioVencimentos(despesasFixas, despesasVariaveis, dividas, faturasCartao)
    
    const vencimentosDoMes = todosVencimentos.filter(v => 
        v.data.getMonth() === mesAtual && 
        v.data.getFullYear() === anoAtual
    )

    // Agrupa por dia para exibição no calendário
    const vencimentosPorDia = {}
    vencimentosDoMes.forEach(v => {
        const d = v.data.getDate()
        if (!vencimentosPorDia[d]) vencimentosPorDia[d] = []
        vencimentosPorDia[d].push(v)
    })

    const totalDoMes = vencimentosDoMes.reduce((acc, v) => acc + v.valor, 0)
    const pendentes = vencimentosDoMes.filter(v => v.status === 'pendente')
    const totalPendente = pendentes.reduce((acc, v) => acc + v.valor, 0)

    // Helper para gerar o grid do calendário
    function getDiasNoMes(mes, ano) {
        return new Date(ano, mes + 1, 0).getDate()
    }
    
    function getPrimeiroDiaDoMes(mes, ano) {
        return new Date(ano, mes, 1).getDay()
    }

    const diasTotais = getDiasNoMes(mesAtual, anoAtual)
    const primeiroDia = getPrimeiroDiaDoMes(mesAtual, anoAtual) // 0 (Dom) a 6 (Sáb)
    
    const nomeDoMes = new Date(anoAtual, mesAtual, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    function mudarMes(delta) {
        let novoMes = mesAtual + delta
        let novoAno = anoAtual
        if (novoMes > 11) { novoMes = 0; novoAno++ }
        if (novoMes < 0) { novoMes = 11; novoAno-- }
        setMesAtual(novoMes)
        setAnoAtual(novoAno)
    }

    return (
        <div className="px-8 py-6 max-w-[1000px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Calendário de Vencimentos</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">Visualize todos os seus compromissos financeiros do mês</p>
                </div>
                <div className="flex items-center gap-4 bg-surface border border-border rounded-lg p-1">
                    <button onClick={() => mudarMes(-1)} className="p-1 px-3 text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer">←</button>
                    <span className="text-[13px] font-medium text-text-primary min-w-[120px] text-center capitalize">{nomeDoMes}</span>
                    <button onClick={() => mudarMes(1)} className="p-1 px-3 text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer">→</button>
                </div>
            </div>

            <div className="flex gap-6 items-start">
                {/* Calendário */}
                <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-7 bg-bg border-b border-border">
                        {diasDaSemana.map(d => (
                            <div key={d} className="py-2 text-center text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {/* Espaços em branco antes do dia 1 */}
                        {Array.from({ length: primeiroDia }).map((_, i) => (
                            <div key={`vazio-${i}`} className="min-h-[80px] p-2 border-r border-b border-border/50 bg-bg/20" />
                        ))}
                        
                        {/* Dias do mês */}
                        {Array.from({ length: diasTotais }).map((_, i) => {
                            const dia = i + 1
                            const itens = vencimentosPorDia[dia] || []
                            const totalDia = itens.reduce((acc, v) => acc + v.valor, 0)
                            const isHoje = hoje.getDate() === dia && hoje.getMonth() === mesAtual && hoje.getFullYear() === anoAtual
                            
                            return (
                                <div key={dia} className={`min-h-[80px] p-2 border-r border-b border-border/50 transition-colors ${isHoje ? 'bg-accent/5' : 'hover:bg-surface-hover/30'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[12px] font-medium w-5 h-5 flex items-center justify-center rounded-full ${isHoje ? 'bg-accent text-bg' : 'text-text-secondary'}`}>
                                            {dia}
                                        </span>
                                    </div>
                                    {itens.length > 0 && (
                                        <div className="mt-1 space-y-1">
                                            <div className="text-[10px] font-semibold text-priority-urgent">
                                                {formatCurrency(totalDia)}
                                            </div>
                                            <div className="text-[9px] text-text-tertiary leading-tight">
                                                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Lista Lateral */}
                <div className="w-[320px] shrink-0 space-y-4">
                    {/* Resumo */}
                    <div className="bg-surface border border-border rounded-xl p-5">
                        <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider m-0 mb-4">Resumo do Mês</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[13px] text-text-secondary">Total a pagar</span>
                                <span className="text-[14px] font-semibold text-text-primary">{formatCurrency(totalDoMes)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-border/50">
                                <span className="text-[13px] text-text-secondary">Pendente</span>
                                <span className="text-[14px] font-semibold text-priority-urgent">{formatCurrency(totalPendente)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-[13px] text-text-secondary">Itens</span>
                                <span className="text-[13px] font-medium text-text-primary">{vencimentosDoMes.length} compromissos</span>
                            </div>
                        </div>
                    </div>

                    {/* Lista detalhada */}
                    <div className="bg-surface border border-border rounded-xl p-5 max-h-[500px] overflow-y-auto">
                        <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider m-0 mb-4">Todos os Vencimentos</h3>
                        {vencimentosDoMes.length === 0 ? (
                            <p className="text-[12px] text-text-tertiary italic">Nenhum compromisso neste mês</p>
                        ) : (
                            <div className="space-y-4">
                                {Object.keys(vencimentosPorDia).sort((a,b) => Number(a) - Number(b)).map(dia => (
                                    <div key={dia}>
                                        <div className="text-[10px] font-bold text-text-tertiary mb-2 border-b border-border/50 pb-1">DIA {dia}</div>
                                        <div className="space-y-2">
                                            {vencimentosPorDia[dia].map((v, i) => (
                                                <div key={`${dia}-${i}`} className="flex justify-between items-start">
                                                    <div className="flex gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${v.status === 'pago' ? 'bg-status-done' : 'bg-priority-urgent'}`} />
                                                        <div>
                                                            <p className="text-[12px] font-medium text-text-primary m-0">{v.nome}</p>
                                                            <p className="text-[10px] text-text-tertiary m-0 capitalize">{v.tipo.replace('_', ' ')} {v.info ? `· ${v.info}` : ''}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[12px] font-medium text-text-primary shrink-0 ml-2">
                                                        {formatCurrency(v.valor)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
