'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { calcularProjecaoFatura, formatCurrency, mesAtualStr } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import { showToast } from '@/app/lib/toast'

export default function CartoesPage() {
    const { cartoes, comprasParceladas, despesasFixas, loading, erro, refetch } = useFinancas()
    const [editando, setEditando] = useState(null)
    const [form, setForm] = useState({})
    const [salvando, setSalvando] = useState(false)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    const mesAtual = mesAtualStr()

    async function handleSalvar() {
        setSalvando(true)
        try {
            const payload = {
                nome: form.nome, bandeira: form.bandeira,
                limite_total: parseFloat(form.limite_total || 0),
                dia_fechamento: parseInt(form.dia_fechamento || 1),
                dia_vencimento: parseInt(form.dia_vencimento || 1)
            }
            if (editando === 'novo') {
                await financeService.criarCartao(payload)
            } else {
                await financeService.atualizarCartao(editando, payload)
            }
            await refetch()
            setEditando(null); setForm({})
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setSalvando(false)
    }

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1"
    const inp = "w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary m-0">Cartões de Crédito</h2>
                <button onClick={() => { setEditando('novo'); setForm({}) }} className="px-4 py-2 text-[12px] font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors text-text-primary">+ Novo Cartão</button>
            </div>

            {editando && (
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">{editando === 'novo' ? 'Novo Cartão' : 'Editar Cartão'}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><label className={lbl}>Nome</label><input className={inp} value={form.nome || ''} onChange={e => setForm(p => ({...p, nome: e.target.value}))} placeholder="Ex: Cartão Itaú" /></div>
                        <div><label className={lbl}>Bandeira</label><input className={inp} value={form.bandeira || ''} onChange={e => setForm(p => ({...p, bandeira: e.target.value}))} placeholder="Ex: Visa" /></div>
                        <div><label className={lbl}>Limite Total</label><input type="number" step="0.01" className={inp} value={form.limite_total || ''} onChange={e => setForm(p => ({...p, limite_total: e.target.value}))} /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className={lbl}>Fechamento</label><input type="number" min="1" max="31" className={inp} value={form.dia_fechamento || ''} onChange={e => setForm(p => ({...p, dia_fechamento: e.target.value}))} /></div>
                            <div><label className={lbl}>Vencimento</label><input type="number" min="1" max="31" className={inp} value={form.dia_vencimento || ''} onChange={e => setForm(p => ({...p, dia_vencimento: e.target.value}))} /></div>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditando(null); setForm({}) }} className="px-3 py-1.5 text-[12px] text-text-secondary bg-transparent border border-border rounded-lg cursor-pointer">Cancelar</button>
                        <button onClick={handleSalvar} disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium text-bg bg-text-primary rounded-lg cursor-pointer border-0 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                {cartoes.map(c => {
                    const faturaAtual = calcularProjecaoFatura(comprasParceladas, despesasFixas, c, mesAtual)
                    const limite = Number(c.limite_total || 0)
                    const pct = limite ? Math.round((faturaAtual / limite) * 100) : 0
                    return (
                        <Link key={c.id} href={`/financas/cartoes/${c.id}`} className="block bg-surface border border-border rounded-xl p-5 hover:border-text-tertiary transition-colors no-underline">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-[14px] font-medium text-text-primary m-0">{c.nome}</h3>
                                    <p className="text-[11px] text-text-tertiary m-0 mt-1">{c.bandeira} · Fecha dia {c.dia_fechamento} · Vence dia {c.dia_vencimento}</p>
                                </div>
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditando(c.id); setForm(c) }} 
                                    className="text-[12px] text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1"
                                >
                                    ✏️
                                </button>
                            </div>
                            <div className="flex justify-between text-[12px] mb-1.5">
                                <span className="text-text-tertiary">Fatura atual</span>
                                <span className="text-text-primary font-semibold">{formatCurrency(faturaAtual)}</span>
                            </div>
                            <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-1.5">
                                <div className={`h-full rounded-full ${pct >= 80 ? 'bg-priority-urgent' : 'bg-accent'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-text-tertiary">
                                <span>{pct}% usado</span>
                                <span>Limite: {formatCurrency(limite)}</span>
                            </div>
                        </Link>
                    )
                })}
            </div>
            {cartoes.length === 0 && <div className="text-center py-12 text-text-tertiary"><span className="text-[28px] block mb-2">💳</span><p className="text-[13px]">Nenhum cartão cadastrado</p></div>}
        </div>
    )
}
