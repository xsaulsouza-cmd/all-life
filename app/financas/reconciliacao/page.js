'use client'

import { useState } from 'react'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { formatCurrency, mesAtualStr } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import { showToast } from '@/app/lib/toast'

export default function ReconciliacaoPage() {
    const { receitas, despesasFixas, despesasVariaveis, faturasCartao, loading, erro, refetch } = useFinancas()
    const [processandoId, setProcessandoId] = useState(null)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    const mesAtual = mesAtualStr()

    // Itens pendentes/previstos
    const receitasPrevistas = receitas.filter(r => r.status === 'previsto')
    const fixasPendentes = despesasFixas.filter(d => d.status === 'pendente')
    const faturasAbertas = faturasCartao.filter(f => f.status === 'aberta' || f.status === 'pendente')
    const varPendentes = despesasVariaveis.filter(d => d.status === 'pendente')

    const totalItens = receitasPrevistas.length + fixasPendentes.length + faturasAbertas.length + varPendentes.length

    async function confirmarReceita(id) {
        setProcessandoId(`rec-${id}`)
        try {
            await financeService.atualizarReceita(id, { 
                status: 'recebido',
                data_recebida: new Date().toISOString().split('T')[0]
            })
            await refetch()
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setProcessandoId(null)
    }

    async function confirmarDespesaFixa(id) {
        setProcessandoId(`fix-${id}`)
        try {
            await financeService.atualizarDespesaFixa(id, { status: 'pago' })
            await refetch()
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setProcessandoId(null)
    }

    async function confirmarDespesaVariavel(id) {
        setProcessandoId(`var-${id}`)
        try {
            await financeService.atualizarDespesaVariavel(id, { status: 'pago' })
            await refetch()
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setProcessandoId(null)
    }

    async function confirmarFatura(id) {
        setProcessandoId(`fat-${id}`)
        try {
            await financeService.atualizarFatura(id, { status: 'paga' })
            await refetch()
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setProcessandoId(null)
    }

    const BtnConfirmar = ({ id, onClick, text = "Confirmar" }) => (
        <button 
            onClick={onClick}
            disabled={processandoId === id}
            className="px-4 py-2 text-[11px] font-medium bg-status-done text-bg hover:bg-[#32963f] rounded cursor-pointer border-0 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
            {processandoId === id ? 'Processando...' : `✓ ${text}`}
        </button>
    )

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Reconciliação</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">Confirme as transações previstas para atualizá-las para "Realizado/Pago"</p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider m-0 mb-1">Pendências Totais</p>
                    <p className={`text-[20px] font-semibold m-0 ${totalItens > 0 ? 'text-priority-high' : 'text-status-done'}`}>
                        {totalItens} itens
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* Entradas */}
                <div>
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4 border-b border-border pb-2 flex justify-between">
                        Entradas Previstas
                        <span className="text-[11px] font-normal text-text-tertiary bg-surface px-2 rounded-full">{receitasPrevistas.length}</span>
                    </h3>
                    
                    {receitasPrevistas.length === 0 ? (
                        <p className="text-[12px] text-text-tertiary italic p-4 bg-surface border border-border rounded-xl">Tudo em dia! 🎉 Nenhuma entrada pendente de confirmação.</p>
                    ) : (
                        <div className="space-y-3">
                            {receitasPrevistas.map(r => (
                                <div key={r.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center group hover:border-accent/30 transition-colors">
                                    <div>
                                        <p className="text-[13px] font-medium text-text-primary m-0">{r.nome}</p>
                                        <p className="text-[11px] text-text-tertiary m-0 mt-1">Previsto p/ {r.data_prevista || 'mês atual'}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[14px] font-bold text-status-done">{formatCurrency(r.valor)}</span>
                                        <BtnConfirmar id={`rec-${r.id}`} onClick={() => confirmarReceita(r.id)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Saídas */}
                <div>
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4 border-b border-border pb-2 flex justify-between">
                        Saídas Pendentes
                        <span className="text-[11px] font-normal text-text-tertiary bg-surface px-2 rounded-full">{fixasPendentes.length + faturasAbertas.length + varPendentes.length}</span>
                    </h3>

                    {fixasPendentes.length === 0 && faturasAbertas.length === 0 && varPendentes.length === 0 ? (
                        <p className="text-[12px] text-text-tertiary italic p-4 bg-surface border border-border rounded-xl">Tudo em dia! 🎉 Nenhum pagamento pendente de confirmação.</p>
                    ) : (
                        <div className="space-y-4">
                            {/* Faturas */}
                            {faturasAbertas.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-text-tertiary uppercase mb-2">Faturas de Cartão</p>
                                    {faturasAbertas.map(f => (
                                        <div key={f.id} className="bg-surface border border-priority-high/30 rounded-xl p-4 flex justify-between items-center group">
                                            <div>
                                                <p className="text-[13px] font-medium text-text-primary m-0">Fatura Cartão</p>
                                                <p className="text-[11px] text-text-tertiary m-0 mt-1">Ref: {f.mes_referencia}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[14px] font-bold text-text-primary">{formatCurrency(f.valor_fatura)}</span>
                                                <BtnConfirmar id={`fat-${f.id}`} onClick={() => confirmarFatura(f.id)} text="Pago" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Despesas Fixas */}
                            {fixasPendentes.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-text-tertiary uppercase mb-2">Despesas Fixas</p>
                                    {fixasPendentes.map(d => (
                                        <div key={d.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center group">
                                            <div>
                                                <p className="text-[13px] font-medium text-text-primary m-0">{d.nome}</p>
                                                <p className="text-[11px] text-text-tertiary m-0 mt-1">Vence dia {d.dia_vencimento}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[14px] font-bold text-text-primary">{formatCurrency(d.valor)}</span>
                                                <BtnConfirmar id={`fix-${d.id}`} onClick={() => confirmarDespesaFixa(d.id)} text="Pago" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Despesas Variáveis Pendentes */}
                            {varPendentes.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-text-tertiary uppercase mb-2">Despesas Variáveis (Pendentes)</p>
                                    {varPendentes.map(d => (
                                        <div key={d.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center group">
                                            <div>
                                                <p className="text-[13px] font-medium text-text-primary m-0">{d.nome}</p>
                                                <p className="text-[11px] text-text-tertiary m-0 mt-1">Data: {d.data || 'sem data'}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[14px] font-bold text-text-primary">{formatCurrency(d.valor)}</span>
                                                <BtnConfirmar id={`var-${d.id}`} onClick={() => confirmarDespesaVariavel(d.id)} text="Pago" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
