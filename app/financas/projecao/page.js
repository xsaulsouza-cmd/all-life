'use client'

import { useFinancas } from '@/app/hooks/useFinancas'
import { calcularProjecaoMultiMes, verificarBufferSeguranca, formatCurrency } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import { useState } from 'react'

export default function ProjecaoPage() {
    const financas = useFinancas()
    const { loading, erro } = financas
    const [mesesProjecao, setMesesProjecao] = useState(6)
    const [saldoMinimo, setSaldoMinimo] = useState(1000)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    // Passamos o objeto completo do hook para a função pura
    const projecao = calcularProjecaoMultiMes(financas, mesesProjecao)
    
    // Análise rápida: qual o menor saldo que vamos atingir nestes meses?
    const menorSaldo = Math.min(...projecao.map(p => p.saldo))
    const { alerta, deficit } = verificarBufferSeguranca(menorSaldo, saldoMinimo)

    return (
        <div className="px-8 py-6 max-w-[1000px] mx-auto">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Projeção Multi-Mês</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">Efeito cascata de entradas e saídas programadas</p>
                </div>
                <div className="flex gap-4">
                    <div>
                        <label className="block text-[10px] font-medium text-text-tertiary uppercase mb-1">Horizonte</label>
                        <select 
                            value={mesesProjecao} 
                            onChange={e => setMesesProjecao(Number(e.target.value))}
                            className="bg-surface border border-border text-text-primary text-[12px] rounded p-1.5 outline-none"
                        >
                            <option value={3}>3 meses</option>
                            <option value={6}>6 meses</option>
                            <option value={12}>12 meses</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-text-tertiary uppercase mb-1">Buffer Seguro (R$)</label>
                        <input 
                            type="number" 
                            value={saldoMinimo} 
                            onChange={e => setSaldoMinimo(Number(e.target.value))}
                            className="bg-surface border border-border text-text-primary text-[12px] rounded p-1.5 outline-none w-24"
                        />
                    </div>
                </div>
            </div>

            {/* Alerta de Buffer */}
            {alerta && (
                <div className="mb-6 bg-priority-high/10 border border-priority-high/20 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-[18px]">⚠️</span>
                    <div>
                        <p className="text-[13px] text-priority-high font-medium m-0 mb-1">Alerta de Fluxo de Caixa</p>
                        <p className="text-[12px] text-text-secondary m-0">
                            A projeção indica que o saldo cairá abaixo da margem de segurança ({formatCurrency(saldoMinimo)}) nos próximos meses.
                            O ponto mais baixo projetado é {formatCurrency(menorSaldo)} (déficit de {formatCurrency(deficit)} em relação ao buffer).
                        </p>
                    </div>
                </div>
            )}

            {/* Tabela de Projeção */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-bg border-b border-border">
                            <th className="p-4 text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Mês</th>
                            <th className="p-4 text-[11px] font-medium text-text-tertiary uppercase tracking-wider text-right">Entradas Fixas/Previstas</th>
                            <th className="p-4 text-[11px] font-medium text-text-tertiary uppercase tracking-wider text-right">Saídas Projetadas</th>
                            <th className="p-4 text-[11px] font-medium text-text-tertiary uppercase tracking-wider text-right">Saldo Fim do Mês</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projecao.map((p, i) => {
                            const isAbaixoBuffer = p.saldo < saldoMinimo
                            return (
                                <tr key={p.mes} className={`border-b border-border/50 hover:bg-surface-hover/30 transition-colors ${isAbaixoBuffer ? 'bg-priority-high/5' : ''}`}>
                                    <td className="p-4">
                                        <p className="text-[14px] font-medium text-text-primary m-0">{p.label}</p>
                                        {i === 0 && <span className="text-[10px] text-accent font-medium mt-1 inline-block">MÊS ATUAL</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="text-[14px] font-medium text-text-secondary">{formatCurrency(p.entradas)}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="text-[14px] font-medium text-text-secondary">{formatCurrency(p.saidas)}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`text-[15px] font-bold ${p.deficit ? 'text-priority-urgent' : isAbaixoBuffer ? 'text-priority-high' : 'text-status-done'}`}>
                                            {formatCurrency(p.saldo)}
                                        </span>
                                        {p.deficit && <p className="text-[10px] text-priority-urgent m-0 mt-1 uppercase">Saldo Negativo</p>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 text-[11px] text-text-tertiary flex gap-4">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-status-done" /> Acima do buffer seguro</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-priority-high" /> Abaixo do buffer seguro</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-priority-urgent" /> Saldo negativo (Cheque especial)</span>
            </div>
        </div>
    )
}
