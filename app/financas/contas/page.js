'use client'

import { useState } from 'react'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { formatCurrency } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

export default function ContasPage() {
    const { contas, loading, erro, refetch } = useFinancas()
    const [editando, setEditando] = useState(null)
    const [form, setForm] = useState({})
    const [salvando, setSalvando] = useState(false)
    const [excluindoId, setExcluindoId] = useState(null)

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    const totalConsolidado = contas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0)

    async function handleSalvar() {
        setSalvando(true)
        try {
            if (editando === 'novo') {
                await financeService.criarConta({ nome: form.nome, banco: form.banco, tipo: form.tipo || 'corrente', saldo_atual: parseFloat(form.saldo_atual || 0) })
                showToast('Conta criada!')
            } else {
                await financeService.atualizarConta(editando, { nome: form.nome, banco: form.banco, tipo: form.tipo, saldo_atual: parseFloat(form.saldo_atual || 0) })
                showToast('Conta atualizada!')
            }
            await refetch()
            setEditando(null)
            setForm({})
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setSalvando(false)
    }

    async function handleDeletar(id) {
        setExcluindoId(id)
    }

    async function executarExclusao() {
        const id = excluindoId
        setExcluindoId(null)
        try {
            await financeService.deletarConta(id)
            await refetch()
            showToast('Conta removida')
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
    }

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1"
    const inp = "w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Contas Bancárias</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">Saldo consolidado: <strong className="text-text-primary">{formatCurrency(totalConsolidado)}</strong></p>
                </div>
                <button
                    onClick={() => { setEditando('novo'); setForm({ tipo: 'corrente' }) }}
                    className="px-4 py-2 text-[12px] font-medium bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors text-text-primary"
                >
                    + Nova Conta
                </button>
            </div>

            {/* Modal inline de edição */}
            {editando && (
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">{editando === 'novo' ? 'Nova Conta' : 'Editar Conta'}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><label className={lbl}>Nome</label><input className={inp} value={form.nome || ''} onChange={e => setForm(p => ({...p, nome: e.target.value}))} placeholder="Ex: Itaú" /></div>
                        <div><label className={lbl}>Banco</label><input className={inp} value={form.banco || ''} onChange={e => setForm(p => ({...p, banco: e.target.value}))} placeholder="Ex: Itaú" /></div>
                        <div>
                            <label className={lbl}>Tipo</label>
                            <select className={inp} value={form.tipo || 'corrente'} onChange={e => setForm(p => ({...p, tipo: e.target.value}))}>
                                <option value="corrente">Corrente</option>
                                <option value="poupança">Poupança</option>
                            </select>
                        </div>
                        <div><label className={lbl}>Saldo Atual (R$)</label><input type="number" step="0.01" className={inp} value={form.saldo_atual || ''} onChange={e => setForm(p => ({...p, saldo_atual: e.target.value}))} /></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditando(null); setForm({}) }} className="px-3 py-1.5 text-[12px] text-text-secondary bg-transparent border border-border rounded-lg cursor-pointer">Cancelar</button>
                        <button onClick={handleSalvar} disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium text-bg bg-text-primary rounded-lg cursor-pointer border-0 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </div>
            )}

            {/* Lista */}
            <div className="space-y-3">
                {contas.map(c => (
                    <div key={c.id} className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between group">
                        <div>
                            <h3 className="text-[14px] font-medium text-text-primary m-0">{c.nome}</h3>
                            <p className="text-[12px] text-text-tertiary m-0 mt-1">{c.banco} · {c.tipo}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`text-[20px] font-semibold ${Number(c.saldo_atual) < 0 ? 'text-priority-urgent' : 'text-text-primary'}`}>
                                {formatCurrency(c.saldo_atual)}
                            </span>
                            <div className="flex gap-1">
                                <button onClick={() => { setEditando(c.id); setForm(c) }} className="text-[11px] text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">✏️</button>
                                <button onClick={() => handleDeletar(c.id)} className="text-[11px] text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer p-1">🗑️</button>
                            </div>
                        </div>
                    </div>
                ))}
                {contas.length === 0 && (
                    <div className="text-center py-12 text-text-tertiary">
                        <span className="text-[28px] block mb-2">🏦</span>
                        <p className="text-[13px] m-0">Nenhuma conta cadastrada</p>
                    </div>
                )}
            </div>
            {excluindoId && (
                <ModalConfirmacao
                    titulo="Excluir conta?"
                    mensagem="Excluir esta conta? Isso não apaga as transações."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setExcluindoId(null)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
