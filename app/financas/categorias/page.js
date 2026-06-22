'use client'

import { useState } from 'react'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { formatCurrency, mesAtualStr } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import { showToast } from '@/app/lib/toast'

export default function CategoriasPage() {
    const { categorias, despesasFixas, despesasVariaveis, loading, erro, refetch } = useFinancas()
    const [editando, setEditando] = useState(null)
    const [form, setForm] = useState({})
    const [salvando, setSalvando] = useState(false)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    const mesAtual = mesAtualStr()

    // Agrupar gastos pagos do mês por categoria
    const gastosCategoria = categorias.map(cat => {
        const fixo = despesasFixas
            .filter(d => d.categoria_id === cat.id && d.status === 'pago')
            .reduce((acc, d) => acc + Number(d.valor || 0), 0)
        
        const varPago = despesasVariaveis
            .filter(d => d.categoria_id === cat.id && d.status === 'pago' && d.data && d.data.startsWith(mesAtual))
            .reduce((acc, d) => acc + Number(d.valor || 0), 0)
            
        return { ...cat, totalGasto: fixo + varPago }
    }).sort((a, b) => b.totalGasto - a.totalGasto) // Ordenar do maior pro menor gasto

    const totalGlobal = gastosCategoria.reduce((acc, cat) => acc + cat.totalGasto, 0)
    const topGastos = gastosCategoria.filter(c => c.totalGasto > 0)
    const categoriasVazias = gastosCategoria.filter(c => c.totalGasto === 0)

    async function handleSalvar() {
        setSalvando(true)
        try {
            await financeService.criarCategoria({
                nome: form.nome,
                centro_custo_id: form.centro_custo_id || null
            })
            await refetch()
            setEditando(null)
            setForm({})
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setSalvando(false)
    }

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1"
    const inp = "w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Análise por Categoria</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">Onde seu dinheiro está indo este mês</p>
                </div>
                <button
                    onClick={() => { setEditando('novo'); setForm({}) }}
                    className="px-4 py-2 text-[12px] font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors text-text-primary"
                >
                    + Nova Categoria
                </button>
            </div>

            {/* Form Nova Categoria */}
            {editando && (
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Nova Categoria</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><label className={lbl}>Nome da Categoria</label><input className={inp} value={form.nome || ''} onChange={e => setForm(p => ({...p, nome: e.target.value}))} placeholder="Ex: Supermercado" /></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditando(null); setForm({}) }} className="px-3 py-1.5 text-[12px] text-text-secondary bg-transparent border border-border rounded-lg cursor-pointer">Cancelar</button>
                        <button onClick={handleSalvar} disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium text-bg bg-text-primary rounded-lg cursor-pointer border-0 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-[2fr_1fr] gap-6">
                {/* Ranking */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-6">Maiores Gastos do Mês</h3>
                    
                    {topGastos.length === 0 ? (
                        <p className="text-[12px] text-text-tertiary italic text-center py-8">Nenhum gasto registrado nas categorias este mês.</p>
                    ) : (
                        <div className="space-y-5">
                            {topGastos.map((cat, index) => {
                                const pct = totalGlobal ? Math.round((cat.totalGasto / totalGlobal) * 100) : 0
                                return (
                                    <div key={cat.id} className="relative">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-bold text-text-tertiary w-4">{index + 1}º</span>
                                                <span className="text-[14px] font-medium text-text-primary">{cat.nome}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[14px] font-semibold text-text-secondary">{formatCurrency(cat.totalGasto)}</span>
                                                <span className="text-[11px] text-text-tertiary ml-2 w-8 inline-block">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
                                            <div className="h-full bg-accent rounded-full opacity-80" style={{ width: `${Math.max(pct, 1)}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Resumo & Outras */}
                <div className="space-y-6">
                    <div className="bg-surface border border-border rounded-xl p-6">
                        <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider m-0 mb-4">Total Categorizado</h3>
                        <p className="text-[28px] font-bold text-text-primary m-0">{formatCurrency(totalGlobal)}</p>
                        <p className="text-[12px] text-text-secondary mt-2 m-0">Neste mês corrente</p>
                    </div>

                    <div className="bg-surface border border-border rounded-xl p-6">
                        <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider m-0 mb-4">Sem Gastos ({categoriasVazias.length})</h3>
                        <div className="flex flex-wrap gap-2">
                            {categoriasVazias.map(cat => (
                                <span key={cat.id} className="px-2.5 py-1 rounded bg-bg border border-border/50 text-[11px] text-text-secondary">
                                    {cat.nome}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
