'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { calcularSaldoDevedor, calcularProgressoQuitacao, formatCurrency } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import { showToast } from '@/app/lib/toast'

export default function DividasPage() {
    const router = useRouter()
    const { dividas, loading, erro, refetch } = useFinancas()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({})
    const [salvando, setSalvando] = useState(false)
    const [pagandoId, setPagandoId] = useState(null)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    const totalDevedor = dividas.reduce((acc, d) => acc + calcularSaldoDevedor(d), 0)
    const dividasAtivas = dividas.filter(d => (d.parcelas_pagas || 0) < d.numero_parcelas)
    const dividasQuitadas = dividas.filter(d => (d.parcelas_pagas || 0) >= d.numero_parcelas)

    async function handleSalvar() {
        setSalvando(true)
        try {
            await financeService.criarDivida({
                nome_credor: form.nome_credor,
                valor_total: parseFloat(form.valor_total || 0),
                numero_parcelas: parseInt(form.numero_parcelas || 1),
                valor_parcela: parseFloat(form.valor_parcela || 0),
                dia_vencimento: parseInt(form.dia_vencimento || 1),
                taxa_juros: form.taxa_juros ? parseFloat(form.taxa_juros) : null,
                parcelas_pagas: 0
            })
            await refetch()
            setShowForm(false); setForm({})
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setSalvando(false)
    }

    async function handlePagarParcela(e, divida) {
        e.preventDefault()
        e.stopPropagation()
        if (pagandoId === divida.id) return

        const novaPagas = (divida.parcelas_pagas || 0) + 1
        if (novaPagas > divida.numero_parcelas) return

        setPagandoId(divida.id)
        try {
            const { error } = await supabase
                .from('dividas')
                .update({ parcelas_pagas: novaPagas })
                .eq('id', divida.id)
            if (error) {
                showToast('Erro: ' + error.message, 'erro')
            } else {
                showToast(`Parcela ${novaPagas}/${divida.numero_parcelas} registrada!`)
                await refetch()
            }
        } catch (err) {
            showToast('Erro: ' + err.message, 'erro')
        } finally {
            setPagandoId(null)
        }
    }

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1"
    const inp = "w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Dívidas</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">Saldo devedor total: <strong className="text-priority-urgent">{formatCurrency(totalDevedor)}</strong></p>
                </div>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-[12px] font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors text-text-primary">+ Nova Dívida</button>
            </div>

            {showForm && (
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Nova Dívida</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><label className={lbl}>Credor</label><input className={inp} value={form.nome_credor || ''} onChange={e => setForm(p => ({...p, nome_credor: e.target.value}))} placeholder="Ex: Cartão BB" /></div>
                        <div><label className={lbl}>Valor Total</label><input type="number" step="0.01" className={inp} value={form.valor_total || ''} onChange={e => setForm(p => ({...p, valor_total: e.target.value}))} /></div>
                        <div><label className={lbl}>Nº Parcelas</label><input type="number" min="1" className={inp} value={form.numero_parcelas || ''} onChange={e => setForm(p => ({...p, numero_parcelas: e.target.value}))} /></div>
                        <div><label className={lbl}>Valor Parcela</label><input type="number" step="0.01" className={inp} value={form.valor_parcela || ''} onChange={e => setForm(p => ({...p, valor_parcela: e.target.value}))} /></div>
                        <div><label className={lbl}>Dia Vencimento</label><input type="number" min="1" max="31" className={inp} value={form.dia_vencimento || ''} onChange={e => setForm(p => ({...p, dia_vencimento: e.target.value}))} /></div>
                        <div><label className={lbl}>Taxa Juros (% ao mês)</label><input type="number" step="0.01" className={inp} value={form.taxa_juros || ''} onChange={e => setForm(p => ({...p, taxa_juros: e.target.value}))} /></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setShowForm(false); setForm({}) }} className="px-3 py-1.5 text-[12px] text-text-secondary bg-transparent border border-border rounded-lg cursor-pointer">Cancelar</button>
                        <button onClick={handleSalvar} disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium text-bg bg-text-primary rounded-lg cursor-pointer border-0 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </div>
            )}

            {/* Ativas */}
            {dividasAtivas.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Ativas ({dividasAtivas.length})</h3>
                    <div className="space-y-3">
                        {dividasAtivas.map(d => {
                            const saldo = calcularSaldoDevedor(d)
                            const pct = calcularProgressoQuitacao(d)
                            const pagando = pagandoId === d.id

                            return (
                                <div
                                    key={d.id}
                                    onClick={() => router.push(`/financas/dividas/${d.id}`)}
                                    className="bg-surface border border-border rounded-xl p-5 hover:border-text-tertiary transition-colors cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-[14px] font-medium text-text-primary m-0">{d.nome_credor}</h4>
                                            <p className="text-[11px] text-text-tertiary m-0 mt-1">
                                                {d.parcelas_pagas || 0}/{d.numero_parcelas} parcelas · {formatCurrency(d.valor_parcela)}/mês · Dia {d.dia_vencimento}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] text-text-tertiary m-0">Saldo devedor</p>
                                            <p className="text-[16px] font-semibold text-priority-urgent m-0">{formatCurrency(saldo)}</p>
                                        </div>
                                    </div>

                                    <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-1">
                                        <div className="h-full bg-status-done rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-text-tertiary m-0">{pct}% quitado</p>
                                        <button
                                            onClick={e => handlePagarParcela(e, d)}
                                            disabled={pagando}
                                            className="px-3 py-1 text-[11px] font-medium bg-[#16A34A]/10 hover:bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/30 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                                        >
                                            {pagando ? '...' : '✓ Pagar parcela'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Quitadas */}
            {dividasQuitadas.length > 0 && (
                <div>
                    <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Quitadas ({dividasQuitadas.length})</h3>
                    <div className="space-y-2">
                        {dividasQuitadas.map(d => (
                            <div key={d.id} className="bg-surface/50 border border-border rounded-xl p-4 flex justify-between items-center">
                                <span className="text-[13px] text-text-tertiary line-through">{d.nome_credor}</span>
                                <span className="text-[12px] text-status-done font-medium">✅ Quitada · {formatCurrency(d.valor_total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {dividas.length === 0 && (
                <div className="text-center py-12 text-text-tertiary">
                    <span className="text-[28px] block mb-2">🎉</span>
                    <p className="text-[13px]">Nenhuma dívida registrada</p>
                </div>
            )}
        </div>
    )
}
