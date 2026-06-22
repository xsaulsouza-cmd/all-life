'use client'

import { useState } from 'react'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { formatCurrency, mesAtualStr } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import { showToast } from '@/app/lib/toast'

export default function GastosPrevistosPage() {
    const { gastosPrevistos, centrosCusto, categorias, loading, erro, refetch } = useFinancas()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({})
    const [salvando, setSalvando] = useState(false)
    const [convertendoId, setConvertendoId] = useState(null)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    const gastosAtivos = gastosPrevistos.filter(g => !g.convertido)
    const gastosConvertidos = gastosPrevistos.filter(g => g.convertido)

    async function handleSalvar() {
        setSalvando(true)
        try {
            await financeService.criarGastoPrevisto({
                nome: form.nome,
                valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
                categoria_relacionada: form.categoria_relacionada || null,
                convertido: false
            })
            await refetch()
            setShowForm(false); setForm({})
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setSalvando(false)
    }

    async function handleConverter(gasto) {
        // Para converter, criamos uma despesa variável e marcamos o gasto como convertido
        setConvertendoId(gasto.id)
        try {
            // Cria despesa variável baseada no gasto
            const agora = new Date()
            const mesStr = mesAtualStr() // ou poderia ser a data de hoje formatada
            
            await financeService.criarDespesaVariavel({
                nome: gasto.nome,
                valor: gasto.valor_estimado || 0,
                data: agora.toISOString().split('T')[0],
                forma_pagamento: 'pix', // padrão, usuário pode editar depois
                status: 'pago', // assume que se converteu, já está pago ou quase
            })

            // Atualiza gasto previsto
            await financeService.converterGastoPrevisto(gasto.id)
            
            await refetch()
        } catch (e) {
            showToast('Erro ao converter: ' + e.message, 'erro')
        }
        setConvertendoId(null)
    }
    
    async function handleExcluir(id) {
        if(!confirm('Deseja realmente excluir este gasto previsto?')) return
        try {
            await financeService.deletarGastoPrevisto(id)
            await refetch()
        } catch(e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1"
    const inp = "w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Gastos Previstos (Sem data)</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">
                        Use esta lista para registrar desejos de compra, consertos ou gastos futuros que você sabe que ocorrerão, mas ainda não têm data ou valor exato.
                    </p>
                </div>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-[12px] font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors text-text-primary whitespace-nowrap ml-4">
                    + Novo Gasto Previsto
                </button>
            </div>

            {showForm && (
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Novo Gasto Previsto</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="col-span-1"><label className={lbl}>Nome / Descrição</label><input className={inp} value={form.nome || ''} onChange={e => setForm(p => ({...p, nome: e.target.value}))} placeholder="Ex: Conserto do Carro" /></div>
                        <div className="col-span-1"><label className={lbl}>Valor Estimado</label><input type="number" step="0.01" className={inp} value={form.valor_estimado || ''} onChange={e => setForm(p => ({...p, valor_estimado: e.target.value}))} placeholder="0.00" /></div>
                        <div className="col-span-1"><label className={lbl}>Categoria Relacionada (texto)</label><input className={inp} value={form.categoria_relacionada || ''} onChange={e => setForm(p => ({...p, categoria_relacionada: e.target.value}))} placeholder="Ex: Veículo" /></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setShowForm(false); setForm({}) }} className="px-3 py-1.5 text-[12px] text-text-secondary bg-transparent border border-border rounded-lg cursor-pointer">Cancelar</button>
                        <button onClick={handleSalvar} disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium text-bg bg-text-primary rounded-lg cursor-pointer border-0 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </div>
            )}

            {/* Ativos */}
            {gastosAtivos.length > 0 ? (
                <div className="space-y-3 mb-8">
                    {gastosAtivos.map(g => (
                        <div key={g.id} className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between group">
                            <div>
                                <h3 className="text-[14px] font-medium text-text-primary m-0">{g.nome}</h3>
                                {g.categoria_relacionada && <p className="text-[11px] text-text-tertiary m-0 mt-1">{g.categoria_relacionada}</p>}
                            </div>
                            <div className="flex items-center gap-6">
                                <span className="text-[15px] font-medium text-text-secondary">
                                    {g.valor_estimado ? formatCurrency(g.valor_estimado) : <span className="text-text-tertiary italic">Valor indefinido</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleConverter(g)} 
                                        disabled={convertendoId === g.id}
                                        className="px-3 py-1.5 text-[11px] font-medium bg-status-done text-bg hover:bg-[#32963f] rounded cursor-pointer border-0 disabled:opacity-50 transition-colors"
                                    >
                                        {convertendoId === g.id ? 'Convertendo...' : 'Converter p/ Despesa'}
                                    </button>
                                    <button onClick={() => handleExcluir(g.id)} className="text-[11px] text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-bg border border-border rounded-xl p-8 text-center text-text-tertiary mb-8">
                    <p className="m-0 text-[13px]">Nenhum gasto previsto pendente.</p>
                </div>
            )}

            {/* Convertidos */}
            {gastosConvertidos.length > 0 && (
                <div>
                    <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Já Convertidos</h3>
                    <div className="space-y-2">
                        {gastosConvertidos.map(g => (
                            <div key={g.id} className="bg-surface/30 border border-border/50 rounded-lg p-3 flex justify-between items-center opacity-70">
                                <div>
                                    <span className="text-[12px] text-text-secondary">{g.nome}</span>
                                    {g.categoria_relacionada && <span className="text-[10px] text-text-tertiary ml-2">({g.categoria_relacionada})</span>}
                                </div>
                                <span className="text-[11px] text-status-done flex items-center gap-1">✓ Convertido</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
