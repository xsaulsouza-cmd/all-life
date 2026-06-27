'use client'

import { useState } from 'react'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { formatCurrency, mesAtualStr } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

export default function ReceitasPage() {
    const { receitas, loading, erro, refetch } = useFinancas()
    const [editando, setEditando] = useState(null)
    const [form, setForm] = useState({})
    const [salvando, setSalvando] = useState(false)
    const [mesSelecionado, setMesSelecionado] = useState(mesAtualStr())
    const [excluindoId, setExcluindoId] = useState(null)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    // Filtra as receitas do mês selecionado por mes_referencia
    const receitasDoMes = receitas.filter(r => {
        return r.mes_referencia === mesSelecionado || (r.data_prevista && r.data_prevista.startsWith(mesSelecionado))
    }).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista))

    const totalPrevisto = receitasDoMes.reduce((acc, r) => acc + Number(r.valor || 0), 0)
    const totalRecebido = receitasDoMes.filter(r => r.status === 'recebido').reduce((acc, r) => acc + Number(r.valor || 0), 0)

    async function handleSalvar() {
        if (!form.origem && !form.nome) { showToast('Informe a origem da receita', 'erro'); return }
        if (!form.valor || parseFloat(form.valor) <= 0) { showToast('Informe um valor válido', 'erro'); return }
        setSalvando(true)
        try {
            const dataPrevista = form.data_prevista || null
            const mesRef = form.mes_referencia || (dataPrevista ? dataPrevista.substring(0, 7) : mesSelecionado)
            const payload = {
                valor: parseFloat(form.valor || 0),
                data_prevista: dataPrevista,
                tipo: form.tipo || 'salário',
                status: form.status || 'previsto',
                origem: form.origem || null,
                recorrente: form.recorrente || false,
                mes_referencia: mesRef
            }
            if (editando === 'novo') {
                await financeService.criarReceita(payload)
            } else {
                await financeService.atualizarReceita(editando, payload)
            }
            await refetch()
            showToast('Receita salva!')
            setEditando(null)
            setForm({})
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setSalvando(false)
    }

    async function handleConfirmar(id) {
        try {
            await financeService.atualizarReceita(id, { 
                status: 'recebido',
                data_recebida: new Date().toISOString().split('T')[0]
            })
            await refetch()
            showToast('Receita confirmada!')
        } catch (e) { showToast('Erro ao confirmar: ' + e.message, 'erro') }
    }

    async function handleDeletar(id) {
        setExcluindoId(id)
    }

    async function executarExclusao() {
        const id = excluindoId
        setExcluindoId(null)
        try {
            await financeService.deletarReceita(id)
            await refetch()
            showToast('Receita removida')
        } catch(e) { showToast('Erro: ' + e.message, 'erro') }
    }

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1"
    const inp = "w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Receitas</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">Total recebido: <strong className="text-status-done">{formatCurrency(totalRecebido)}</strong> de {formatCurrency(totalPrevisto)}</p>
                </div>
                <div className="flex items-center gap-4">
                    <input 
                        type="month" 
                        value={mesSelecionado}
                        onChange={e => setMesSelecionado(e.target.value)}
                        className="bg-surface border border-border text-text-primary text-[13px] rounded-lg px-3 py-1.5 outline-none [color-scheme:dark]"
                    />
                    <button
                        onClick={() => { setEditando('novo'); setForm({ status: 'previsto', tipo: 'salário' }) }}
                        className="px-4 py-2 text-[12px] font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors text-text-primary"
                    >
                        + Nova Receita
                    </button>
                </div>
            </div>

            {editando && (
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">{editando === 'novo' ? 'Nova Receita' : 'Editar Receita'}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><label className={lbl}>Origem</label><input className={inp} value={form.origem || ''} onChange={e => setForm(p => ({...p, origem: e.target.value}))} placeholder="Ex: Salário da Empresa" /></div>
                        <div>
                            <label className={lbl}>Tipo</label>
                            <select className={inp} value={form.tipo || 'salário'} onChange={e => setForm(p => ({...p, tipo: e.target.value}))}>
                                <option value="salário">Salário</option>
                                <option value="extra">Renda Extra</option>
                                <option value="prestação de serviço">Prestação de Serviço</option>
                                <option value="saldo anterior">Saldo Anterior</option>
                            </select>
                        </div>
                        <div><label className={lbl}>Valor (R$)</label><input type="number" step="0.01" className={inp} value={form.valor || ''} onChange={e => setForm(p => ({...p, valor: e.target.value}))} /></div>
                        <div><label className={lbl}>Data Prevista</label><input type="date" className={inp} value={form.data_prevista || ''} onChange={e => setForm(p => ({...p, data_prevista: e.target.value}))} /></div>
                        <div>
                            <label className={lbl}>Status</label>
                            <select className={inp} value={form.status || 'previsto'} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                                <option value="previsto">Previsto</option>
                                <option value="recebido">Recebido</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <input type="checkbox" id="recorrente" checked={form.recorrente || false} onChange={e => setForm(p => ({...p, recorrente: e.target.checked}))} />
                        <label htmlFor="recorrente" className="text-[12px] text-text-primary cursor-pointer">Recorrente (repetir todo mês)</label>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditando(null); setForm({}) }} className="px-3 py-1.5 text-[12px] text-text-secondary bg-transparent border border-border rounded-lg cursor-pointer">Cancelar</button>
                        <button onClick={handleSalvar} disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium text-bg bg-text-primary rounded-lg cursor-pointer border-0 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {receitasDoMes.map(r => (
                    <div key={r.id} className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between group">
                        <div className="flex-1">
                            <h3 className="text-[14px] font-medium text-text-primary m-0">{r.origem || r.nome} {r.recorrente && <span className="text-[10px] bg-surface-hover px-1.5 py-0.5 rounded ml-2 text-text-secondary">Recorrente</span>}</h3>
                            <p className="text-[12px] text-text-tertiary m-0 mt-1 capitalize">{r.tipo} · Previsto para: {r.data_prevista}</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className={`text-[16px] font-semibold ${r.status === 'recebido' ? 'text-status-done' : 'text-text-primary'}`}>
                                    {formatCurrency(r.valor)}
                                </span>
                                <p className="text-[10px] text-text-tertiary m-0 mt-0.5 uppercase tracking-wide">
                                    {r.status}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {r.status === 'previsto' && (
                                    <button 
                                        onClick={() => handleConfirmar(r.id)}
                                        className="px-3 py-1.5 text-[11px] font-medium bg-status-done text-bg hover:bg-[#32963f] rounded cursor-pointer border-0 transition-colors"
                                    >
                                        ✓ Recebido
                                    </button>
                                )}
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditando(r.id); setForm(r) }} className="text-[11px] text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">✏️</button>
                                    <button onClick={() => handleDeletar(r.id)} className="text-[11px] text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-1">🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {receitasDoMes.length === 0 && (
                    <div className="text-center py-12 text-text-tertiary">
                        <span className="text-[28px] block mb-2">💰</span>
                        <p className="text-[13px] m-0">Nenhuma receita encontrada neste mês.</p>
                    </div>
                )}
            </div>
            {excluindoId && (
                <ModalConfirmacao
                    titulo="Excluir receita?"
                    mensagem="Esta ação não pode ser desfeita."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setExcluindoId(null)}
                    cor="urgente"
                />
            )}
        </div>
    )
        }
