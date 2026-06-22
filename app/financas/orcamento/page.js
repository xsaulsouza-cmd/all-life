'use client'

import { useState } from 'react'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { calcularOrcadoVsRealizado, formatCurrency, mesAtualStr } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import { showToast } from '@/app/lib/toast'

export default function OrcamentoPage() {
    const { centrosCusto, despesasFixas, despesasVariaveis, loading, erro, refetch } = useFinancas()
    const [editando, setEditando] = useState(null)
    const [form, setForm] = useState({})
    const [salvando, setSalvando] = useState(false)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    const orcamentoCC = calcularOrcadoVsRealizado(centrosCusto, despesasFixas, despesasVariaveis, mesAtualStr())
    
    const totalOrcado = orcamentoCC.reduce((acc, cc) => acc + cc.orcado, 0)
    const totalRealizado = orcamentoCC.reduce((acc, cc) => acc + cc.realizado, 0)
    const pctGeral = totalOrcado ? Math.round((totalRealizado / totalOrcado) * 100) : 0

    async function handleSalvar() {
        setSalvando(true)
        try {
            if (editando === 'novo') {
                await financeService.criarCentroCusto({
                    nome: form.nome,
                    limite_orcado: parseFloat(form.limite_orcado || 0),
                    ativo: true
                })
            } else {
                await financeService.atualizarCentroCusto(editando, {
                    nome: form.nome,
                    limite_orcado: parseFloat(form.limite_orcado || 0)
                })
            }
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
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Orçamento por Centro de Custo</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">Controle de limites mensais de gastos</p>
                </div>
                <button
                    onClick={() => { setEditando('novo'); setForm({}) }}
                    className="px-4 py-2 text-[12px] font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors text-text-primary"
                >
                    + Novo Centro de Custo
                </button>
            </div>

            {/* Resumo Global */}
            <div className="bg-surface border border-border rounded-xl p-6 mb-8">
                <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider m-0 mb-4">Visão Global do Mês</h3>
                <div className="flex items-end gap-6 mb-4">
                    <div>
                        <p className="text-[11px] text-text-secondary uppercase tracking-wider m-0 mb-1">Total Realizado</p>
                        <p className={`text-[28px] font-semibold m-0 ${pctGeral >= 100 ? 'text-priority-urgent' : 'text-text-primary'}`}>
                            {formatCurrency(totalRealizado)}
                        </p>
                    </div>
                    <div className="pb-1 text-[16px] text-text-tertiary">/</div>
                    <div className="pb-1">
                        <p className="text-[11px] text-text-tertiary uppercase tracking-wider m-0 mb-1">Teto Orçado</p>
                        <p className="text-[20px] font-medium text-text-secondary m-0">
                            {formatCurrency(totalOrcado)}
                        </p>
                    </div>
                </div>
                <div className="w-full h-3 bg-bg border border-border rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full transition-all ${pctGeral >= 100 ? 'bg-priority-urgent' : pctGeral >= 80 ? 'bg-priority-high' : 'bg-status-done'}`} style={{ width: `${Math.min(pctGeral, 100)}%` }} />
                </div>
                <p className="text-[12px] text-text-tertiary m-0">{pctGeral}% do orçamento global consumido</p>
            </div>

            {/* Formulário Inline */}
            {editando && (
                <div className="bg-surface border border-accent/50 rounded-xl p-5 mb-6 shadow-sm">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">{editando === 'novo' ? 'Novo Centro de Custo' : 'Editar Limite'}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><label className={lbl}>Nome do Centro de Custo</label><input className={inp} value={form.nome || ''} onChange={e => setForm(p => ({...p, nome: e.target.value}))} placeholder="Ex: Moradia" /></div>
                        <div><label className={lbl}>Limite Mensal (Teto)</label><input type="number" step="0.01" className={inp} value={form.limite_orcado || ''} onChange={e => setForm(p => ({...p, limite_orcado: e.target.value}))} /></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditando(null); setForm({}) }} className="px-3 py-1.5 text-[12px] text-text-secondary bg-transparent border border-border rounded-lg cursor-pointer">Cancelar</button>
                        <button onClick={handleSalvar} disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium text-bg bg-text-primary rounded-lg cursor-pointer border-0 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </div>
            )}

            {/* Lista Detalhada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orcamentoCC.sort((a,b) => b.pct - a.pct).map(cc => (
                    <div key={cc.id} className="bg-surface border border-border rounded-xl p-5 group relative">
                        <button 
                            onClick={() => { setEditando(cc.id); setForm(cc) }}
                            className="absolute top-4 right-4 text-[11px] text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            ✏️ Editar Limite
                        </button>
                        
                        <div className="flex justify-between items-start mb-3 pr-6">
                            <div>
                                <h3 className="text-[15px] font-medium text-text-primary m-0">{cc.nome}</h3>
                            </div>
                            <span className={`text-[14px] font-bold ${cc.alertLevel === 'danger' ? 'text-priority-urgent' : cc.alertLevel === 'warning' ? 'text-priority-high' : 'text-status-done'}`}>
                                {cc.pct}%
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[18px] font-semibold text-text-primary">{formatCurrency(cc.realizado)}</span>
                            <span className="text-[12px] text-text-tertiary">de {formatCurrency(cc.orcado)}</span>
                        </div>
                        
                        <div className="w-full h-2 bg-bg border border-border rounded-full overflow-hidden mb-3">
                            <div className={`h-full rounded-full transition-all ${cc.alertLevel === 'danger' ? 'bg-priority-urgent' : cc.alertLevel === 'warning' ? 'bg-priority-high' : 'bg-status-done'}`} style={{ width: `${Math.min(cc.pct, 100)}%` }} />
                        </div>
                        
                        {cc.pct >= 100 && (
                            <p className="text-[11px] text-priority-urgent m-0 font-medium">⚠️ Orçamento estourado em {formatCurrency(cc.realizado - cc.orcado)}</p>
                        )}
                        {cc.pct < 100 && cc.orcado > 0 && (
                            <p className="text-[11px] text-text-tertiary m-0">Disponível: {formatCurrency(cc.orcado - cc.realizado)}</p>
                        )}
                    </div>
                ))}
            </div>
            
            {orcamentoCC.length === 0 && (
                <div className="text-center py-12 text-text-tertiary">
                    <span className="text-[28px] block mb-2">🎯</span>
                    <p className="text-[13px]">Nenhum centro de custo cadastrado</p>
                </div>
            )}
        </div>
    )
}
