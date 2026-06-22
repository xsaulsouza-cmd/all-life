'use client'

import { useFinancas } from '@/app/hooks/useFinancas'
import { calcularSaldoFuturo, calcularOrcadoVsRealizado, calcularSaldoDevedor, calcularProjecaoFatura, formatCurrency, mesAtualStr } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'

export default function FinancasDashboard() {
    const {
        contas, cartoes, centrosCusto, receitas, despesasFixas, despesasVariaveis,
        dividas, comprasParceladas, faturasCartao, loading, erro
    } = useFinancas()

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    // ─── Cálculos ───
    const saldoAtual = contas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0)
    const receitasPrevistas = receitas.filter(r => r.status === 'previsto')
    const despesasPendentes = [
        ...despesasFixas.filter(d => d.status === 'pendente'),
        ...despesasVariaveis.filter(d => d.status === 'pendente')
    ]

    const saldoFuturo = calcularSaldoFuturo(saldoAtual, receitasPrevistas, despesasPendentes)
    const totalEntradas = receitasPrevistas.reduce((acc, r) => acc + Number(r.valor || 0), 0)
    const totalSaidas = despesasPendentes.reduce((acc, d) => acc + Number(d.valor || 0), 0)
    const hasDescasamento = totalSaidas > totalEntradas

    // Receitas recebidas no ciclo
    const receitasRecebidas = receitas.filter(r => r.status === 'recebido').reduce((acc, r) => acc + Number(r.valor || 0), 0)
    const despesasPagas = [
        ...despesasFixas.filter(d => d.status === 'pago'),
        ...despesasVariaveis.filter(d => d.status === 'pago')
    ].reduce((acc, d) => acc + Number(d.valor || 0), 0)

    // Dívidas
    const totalSaldoDevedor = dividas.reduce((acc, d) => acc + calcularSaldoDevedor(d), 0)
    const dividasAtivas = dividas.filter(d => (d.parcelas_pagas || 0) < d.numero_parcelas)

    // Orçamento por centro de custo
    const orcamentoCC = calcularOrcadoVsRealizado(centrosCusto, despesasFixas, despesasVariaveis, mesAtualStr())
    const ccEstourados = orcamentoCC.filter(cc => cc.alertLevel === 'danger')

    // Cartões — limite usado
    const cartaoResumo = cartoes.map(c => {
        const faturaAtual = calcularProjecaoFatura(comprasParceladas, despesasFixas, c, mesAtualStr())
        return { ...c, faturaAtual, limiteDisponivel: Number(c.limite_total || 0) - faturaAtual }
    })

    // Próximos vencimentos
    const proximosVenc = despesasFixas.filter(d => d.status === 'pendente').slice(0, 5)

    return (
        <div className="px-8 py-6 max-w-[1100px] w-full mx-auto">

            {/* Alertas */}
            {hasDescasamento && (
                <div className="mb-5 bg-priority-urgent/10 border border-priority-urgent/20 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-[18px]">⚠️</span>
                    <p className="text-[13px] text-priority-urgent m-0">
                        <strong>Descasamento:</strong> Saídas projetadas ({formatCurrency(totalSaidas)}) ultrapassam entradas previstas ({formatCurrency(totalEntradas)}).
                    </p>
                </div>
            )}
            {ccEstourados.length > 0 && (
                <div className="mb-5 bg-priority-high/10 border border-priority-high/20 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-[18px]">🔶</span>
                    <p className="text-[13px] text-priority-high m-0">
                        <strong>Orçamento estourado:</strong> {ccEstourados.map(c => c.nome).join(', ')}
                    </p>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <KPI label="Saldo Atual" value={formatCurrency(saldoAtual)} />
                <KPI label="Saldo Futuro" value={formatCurrency(saldoFuturo)} color={saldoFuturo < 0 ? 'text-priority-urgent' : 'text-status-done'} accent={saldoFuturo < 0} />
                <KPI label="Entradas (previstas)" value={formatCurrency(totalEntradas)} sub={`Recebido: ${formatCurrency(receitasRecebidas)}`} />
                <KPI label="Saídas (pendentes)" value={formatCurrency(totalSaidas)} sub={`Pagas: ${formatCurrency(despesasPagas)}`} />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Próximos Vencimentos */}
                <div className="bg-surface border border-border rounded-xl p-5 col-span-1">
                    <h2 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Próximos Vencimentos</h2>
                    <div className="space-y-2">
                        {proximosVenc.length === 0 ? (
                            <p className="text-[12px] text-text-tertiary italic m-0">Nenhum vencimento</p>
                        ) : proximosVenc.map(v => (
                            <div key={v.id} className="flex justify-between items-center text-[12px] p-2 hover:bg-surface-hover rounded-md transition-colors">
                                <div><span className="text-text-secondary">{v.nome}</span><br /><span className="text-[10px] text-text-tertiary">Dia {v.dia_vencimento}</span></div>
                                <span className="text-text-primary font-medium">{formatCurrency(v.valor)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contas */}
                <div className="bg-surface border border-border rounded-xl p-5 col-span-1">
                    <h2 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Contas</h2>
                    <div className="space-y-2">
                        {contas.length === 0 ? (
                            <p className="text-[12px] text-text-tertiary italic m-0">Nenhuma conta</p>
                        ) : contas.map(c => (
                            <div key={c.id} className="flex justify-between items-center text-[12px] p-2 hover:bg-surface-hover rounded-md transition-colors">
                                <span className="text-text-secondary">{c.nome}</span>
                                <span className="text-text-primary font-medium">{formatCurrency(c.saldo_atual)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dívidas */}
                <div className="bg-surface border border-border rounded-xl p-5 col-span-1">
                    <h2 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Dívidas Ativas</h2>
                    {dividasAtivas.length === 0 ? (
                        <p className="text-[12px] text-text-tertiary italic m-0">Nenhuma dívida ativa 🎉</p>
                    ) : (
                        <>
                            <p className="text-[20px] font-semibold text-priority-urgent m-0 mb-3">{formatCurrency(totalSaldoDevedor)}</p>
                            <div className="space-y-2">
                                {dividasAtivas.slice(0, 4).map(d => (
                                    <div key={d.id} className="flex justify-between items-center text-[12px] p-2 hover:bg-surface-hover rounded-md transition-colors">
                                        <div>
                                            <span className="text-text-secondary">{d.nome_credor}</span>
                                            <br /><span className="text-[10px] text-text-tertiary">{d.parcelas_pagas || 0}/{d.numero_parcelas} parcelas</span>
                                        </div>
                                        <span className="text-text-primary font-medium">{formatCurrency(d.valor_parcela)}/mês</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Cartões + Orçamento */}
            <div className="grid grid-cols-2 gap-4">
                {/* Cartões */}
                <div className="bg-surface border border-border rounded-xl p-5">
                    <h2 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Cartões de Crédito</h2>
                    {cartaoResumo.length === 0 ? (
                        <p className="text-[12px] text-text-tertiary italic m-0">Nenhum cartão cadastrado</p>
                    ) : (
                        <div className="space-y-3">
                            {cartaoResumo.map(c => {
                                const pctUsado = c.limite_total ? Math.round((c.faturaAtual / Number(c.limite_total)) * 100) : 0
                                return (
                                    <div key={c.id} className="p-3 bg-bg border border-border rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[12px] text-text-secondary font-medium">{c.nome}</span>
                                            <span className="text-[11px] text-text-tertiary">{c.bandeira}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] mb-1">
                                            <span className="text-text-tertiary">Fatura atual</span>
                                            <span className="text-text-primary font-medium">{formatCurrency(c.faturaAtual)}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${pctUsado >= 80 ? 'bg-priority-urgent' : 'bg-accent'}`}
                                                style={{ width: `${Math.min(pctUsado, 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-text-tertiary mt-1">
                                            <span>{pctUsado}% utilizado</span>
                                            <span>Disponível: {formatCurrency(c.limiteDisponivel)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Orçamento por Centro de Custo */}
                <div className="bg-surface border border-border rounded-xl p-5">
                    <h2 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Orçamento por Centro de Custo</h2>
                    {orcamentoCC.length === 0 ? (
                        <p className="text-[12px] text-text-tertiary italic m-0">Nenhum centro de custo</p>
                    ) : (
                        <div className="space-y-3">
                            {orcamentoCC.map(cc => (
                                <div key={cc.id} className="p-3 bg-bg border border-border rounded-lg">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[12px] text-text-secondary font-medium">{cc.nome}</span>
                                        <span className={`text-[11px] font-medium ${cc.alertLevel === 'danger' ? 'text-priority-urgent' : cc.alertLevel === 'warning' ? 'text-priority-high' : 'text-status-done'}`}>
                                            {cc.pct}%
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-1">
                                        <div
                                            className={`h-full rounded-full transition-all ${cc.alertLevel === 'danger' ? 'bg-priority-urgent' : cc.alertLevel === 'warning' ? 'bg-priority-high' : 'bg-status-done'}`}
                                            style={{ width: `${Math.min(cc.pct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-text-tertiary">
                                        <span>Real: {formatCurrency(cc.realizado)}</span>
                                        <span>Orçado: {formatCurrency(cc.orcado)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function KPI({ label, value, color, sub, accent }) {
    return (
        <div className={`bg-surface border border-border rounded-xl p-5 relative overflow-hidden`}>
            <span className="block text-[11px] font-medium text-text-tertiary mb-2 uppercase tracking-wide">{label}</span>
            <span className={`text-[22px] font-semibold ${color || 'text-text-primary'}`}>{value}</span>
            {sub && <span className="block text-[11px] text-text-tertiary mt-1">{sub}</span>}
            {accent && <div className="absolute top-0 right-0 w-1.5 h-full bg-priority-urgent"></div>}
        </div>
    )
}
