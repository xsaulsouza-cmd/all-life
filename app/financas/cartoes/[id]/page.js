'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useFinancas } from '@/app/hooks/useFinancas'
import { calcularParcelasFuturas, calcularProjecaoFatura, formatCurrency, mesAtualStr, addMeses, mesLabel } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'

export default function CartaoDetalhePage() {
    const { id } = useParams()
    const { cartoes, comprasParceladas, despesasFixas, faturasCartao, loading, erro } = useFinancas()

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    const cartao = cartoes.find(c => c.id === id)
    if (!cartao) return <div className="p-8 text-text-tertiary">Cartão não encontrado</div>

    const mesAtual = mesAtualStr()
    const comprasDoCartao = comprasParceladas.filter(c => c.cartao_id === id)
    const faturasDoCartao = faturasCartao.filter(f => f.cartao_id === id)
    const limite = Number(cartao.limite_total || 0)

    // Projeção 3 meses
    const projecao = [0, 1, 2].map(i => {
        const mes = addMeses(mesAtual, i)
        const valor = calcularProjecaoFatura(comprasParceladas, despesasFixas, cartao, mes)
        return { mes, label: mesLabel(mes), valor }
    })

    const faturaAtual = projecao[0].valor
    const pct = limite ? Math.round((faturaAtual / limite) * 100) : 0

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="mb-1">
                <Link href="/financas/cartoes" className="text-[12px] text-text-tertiary hover:text-text-secondary no-underline">← Voltar para Cartões</Link>
            </div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-[18px] font-semibold text-text-primary m-0">{cartao.nome}</h2>
                    <p className="text-[12px] text-text-tertiary m-0 mt-1">{cartao.bandeira} · Fecha dia {cartao.dia_fechamento} · Vence dia {cartao.dia_vencimento}</p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] text-text-tertiary m-0 uppercase tracking-wide">Limite Total</p>
                    <p className="text-[18px] font-semibold text-text-primary m-0">{formatCurrency(limite)}</p>
                </div>
            </div>

            {/* Fatura Atual */}
            <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-3">Fatura Atual</h3>
                <div className="flex items-end gap-4 mb-3">
                    <span className={`text-[28px] font-bold ${pct >= 80 ? 'text-priority-urgent' : 'text-text-primary'}`}>{formatCurrency(faturaAtual)}</span>
                    <span className="text-[13px] text-text-tertiary mb-1">de {formatCurrency(limite)}</span>
                </div>
                <div className="w-full h-2.5 bg-border rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-priority-urgent' : 'bg-accent'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-text-tertiary">
                    <span>{pct}% utilizado</span>
                    <span>Disponível: {formatCurrency(limite - faturaAtual)}</span>
                </div>
            </div>

            {/* Projeção Próximos Meses */}
            <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Projeção de Fatura</h3>
                <div className="grid grid-cols-3 gap-4">
                    {projecao.map((p, i) => (
                        <div key={p.mes} className={`p-4 rounded-lg border ${i === 0 ? 'bg-surface-hover border-accent/30' : 'bg-bg border-border'}`}>
                            <p className="text-[11px] text-text-tertiary m-0 uppercase tracking-wide mb-1">{p.label}</p>
                            <p className={`text-[18px] font-semibold m-0 ${p.valor > limite ? 'text-priority-urgent' : 'text-text-primary'}`}>{formatCurrency(p.valor)}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Compras Parceladas neste Cartão */}
            <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Compras Parceladas</h3>
                {comprasDoCartao.length === 0 ? (
                    <p className="text-[12px] text-text-tertiary italic m-0">Nenhuma compra parcelada</p>
                ) : (
                    <div className="space-y-2">
                        {comprasDoCartao.map(c => {
                            const parcelas = calcularParcelasFuturas(c, cartao)
                            const parcelaAtual = parcelas.find(p => p.mes === mesAtual)
                            return (
                                <div key={c.id} className="flex justify-between items-center p-3 bg-bg border border-border rounded-lg">
                                    <div>
                                        <span className="text-[13px] text-text-primary">{c.descricao}</span>
                                        <br /><span className="text-[10px] text-text-tertiary">{parcelaAtual ? `${parcelaAtual.numero_parcela}/${parcelaAtual.total_parcelas}` : 'Finalizado'} · Total: {formatCurrency(c.valor_total)}</span>
                                    </div>
                                    <span className="text-[13px] font-medium text-text-primary">{formatCurrency(c.valor_parcela)}/mês</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
