'use client'

import { useState } from 'react'
import { useFinancas } from '@/app/hooks/useFinancas'
import { financeService } from '@/app/lib/financeService'
import { formatCurrency, mesAtualStr } from '@/app/lib/financeCalculos'
import { LoadingSkeleton } from '@/app/components/ui'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

const FORMAS = ['pix', 'débito', 'crédito', 'boleto', 'dinheiro', 'ted/doc']

export default function DespesasPage() {
    const { despesasFixas, despesasVariaveis, centrosCusto, categorias, loading, erro, refetch } = useFinancas()
    const [aba, setAba] = useState('variaveis') // 'fixas' | 'variaveis'
    const [editando, setEditando] = useState(null)
    const [form, setForm] = useState({})
    const [salvando, setSalvando] = useState(false)
    const [mesSelecionado, setMesSelecionado] = useState(mesAtualStr())
    const [excluindo, setExcluindo] = useState(null) // { id, tipo }

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>

    // Filtra variáveis pelo mês
    const variaveisDoMes = despesasVariaveis.filter(d => {
        if (!d.data) return false
        return String(d.data).substring(0, 7) === mesSelecionado
    }).sort((a, b) => new Date(a.data) - new Date(b.data))

    const totalVarPrev = variaveisDoMes.reduce((a, d) => a + Number(d.valor || 0), 0)
    const totalVarPago = variaveisDoMes.filter(d => d.status === 'pago').reduce((a, d) => a + Number(d.valor || 0), 0)

    const totalFixPrev = despesasFixas.reduce((a, d) => a + Number(d.valor || 0), 0)
    const totalFixPago = despesasFixas.filter(d => d.status === 'pago').reduce((a, d) => a + Number(d.valor || 0), 0)

    // ─── HANDLERS ───────────────────────────────────────────────────────────────

    async function handleSalvar() {
        if (!form.nome) { showToast('Informe o nome da despesa', 'erro'); return }
        if (!form.valor || parseFloat(form.valor) <= 0) { showToast('Informe um valor válido', 'erro'); return }

        setSalvando(true)
        try {
            if (aba === 'fixas') {
                const payload = {
                    nome: form.nome,
                    valor: parseFloat(form.valor),
                    dia_vencimento: parseInt(form.dia_vencimento) || 1,
                    forma_pagamento: form.forma_pagamento || 'pix',
                    status: form.status || 'pendente',
                    centro_custo_id: form.centro_custo_id || null,
                    categoria_id: form.categoria_id || null,
                    recorrente: true,
                }
                if (editando === 'novo') {
                    await financeService.criarDespesaFixa(payload)
                } else {
                    await financeService.atualizarDespesaFixa(editando, payload)
                }
            } else {
                if (!form.data) { showToast('Informe a data da despesa', 'erro'); setSalvando(false); return }
                const payload = {
                    nome: form.nome,
                    valor: parseFloat(form.valor),
                    data: form.data,
                    forma_pagamento: form.forma_pagamento || 'pix',
                    status: form.status || 'pendente',
                    centro_custo_id: form.centro_custo_id || null,
                    categoria_id: form.categoria_id || null,
                }
                if (editando === 'novo') {
                    await financeService.criarDespesaVariavel(payload)
                } else {
                    await financeService.atualizarDespesaVariavel(editando, payload)
                }
            }
            await refetch()
            showToast(editando === 'novo' ? 'Despesa criada!' : 'Despesa atualizada!')
            setEditando(null)
            setForm({})
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
        setSalvando(false)
    }

    async function handlePagar(id, tipo) {
        try {
            if (tipo === 'fixa') {
                await financeService.atualizarDespesaFixa(id, { status: 'pago' })
            } else {
                await financeService.atualizarDespesaVariavel(id, { status: 'pago' })
            }
            await refetch()
            showToast('Despesa marcada como paga ✓')
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
    }

    async function executarExclusao() {
        const { id, tipo } = excluindo
        setExcluindo(null)
        try {
            if (tipo === 'fixa') {
                await financeService.deletarDespesaFixa(id)
            } else {
                await financeService.deletarDespesaVariavel(id)
            }
            await refetch()
            showToast('Despesa removida')
        } catch (e) { showToast('Erro: ' + e.message, 'erro') }
    }

    function iniciarEdicao(d, tipo) {
        setAba(tipo === 'fixa' ? 'fixas' : 'variaveis')
        setEditando(d.id)
        setForm({
            nome: d.nome || '',
            valor: d.valor,
            dia_vencimento: d.dia_vencimento || '',
            data: d.data || '',
            forma_pagamento: d.forma_pagamento || 'pix',
            status: d.status || 'pendente',
            centro_custo_id: d.centro_custo_id || '',
            categoria_id: d.categoria_id || '',
        })
    }

    function novaFixa() {
        setAba('fixas')
        setEditando('novo')
        setForm({ status: 'pendente', forma_pagamento: 'pix', dia_vencimento: 10 })
    }
    function novaVariavel() {
        setAba('variaveis')
        setEditando('novo')
        setForm({ status: 'pendente', forma_pagamento: 'pix', data: mesSelecionado + '-01' })
    }

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1"
    const inp = "w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"
    const statusBadge = (s) => s === 'pago' ? 'text-status-done' : s === 'pendente' ? 'text-priority-high' : 'text-text-tertiary'

    return (
        <div className="px-8 py-6 max-w-[940px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Despesas</h2>
                    <p className="text-[12px] text-text-secondary m-0 mt-1">
                        Fixas: <strong>{formatCurrency(totalFixPago)}</strong> pagas de {formatCurrency(totalFixPrev)} ·{' '}
                        Variáveis ({mesSelecionado}): <strong>{formatCurrency(totalVarPago)}</strong> pagas de {formatCurrency(totalVarPrev)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={mesSelecionado}
                        onChange={e => setMesSelecionado(e.target.value)}
                        className="bg-surface border border-border text-text-primary text-[13px] rounded-lg px-3 py-1.5 outline-none [color-scheme:dark]"
                    />
                    <button
                        onClick={novaVariavel}
                        className="px-3 py-2 text-[12px] font-medium bg-surface border border-border text-text-primary rounded-lg cursor-pointer hover:bg-surface-hover transition-colors"
                    >
                        + Variável
                    </button>
                    <button
                        onClick={novaFixa}
                        className="px-3 py-2 text-[12px] font-medium bg-accent text-bg rounded-lg border-0 cursor-pointer transition-colors"
                    >
                        + Fixa
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-bg border border-border rounded-lg w-fit">
                {[
                    { id: 'variaveis', label: `Variáveis (${variaveisDoMes.length})` },
                    { id: 'fixas', label: `Fixas Recorrentes (${despesasFixas.length})` },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setAba(t.id); setEditando(null); setForm({}) }}
                        className={`px-4 py-1.5 text-[12px] font-medium rounded-md cursor-pointer border-0 transition-colors ${aba === t.id ? 'bg-surface text-text-primary shadow-sm' : 'bg-transparent text-text-tertiary hover:text-text-secondary'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Formulário inline */}
            {editando && (
                <div className="bg-surface border border-accent/30 rounded-xl p-5 mb-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">
                        {editando === 'novo' ? `Nova Despesa ${aba === 'fixas' ? 'Fixa' : 'Variável'}` : 'Editar Despesa'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={lbl}>Nome *</label>
                            <input
                                className={inp}
                                value={form.nome || ''}
                                onChange={e => setForm(p => ({...p, nome: e.target.value}))}
                                placeholder="Ex: Energia Elétrica"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className={lbl}>Valor (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                className={inp}
                                value={form.valor || ''}
                                onChange={e => setForm(p => ({...p, valor: e.target.value}))}
                                placeholder="0,00"
                            />
                        </div>

                        {aba === 'fixas' ? (
                            <div>
                                <label className={lbl}>Dia de Vencimento</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    className={inp}
                                    value={form.dia_vencimento || ''}
                                    onChange={e => setForm(p => ({...p, dia_vencimento: e.target.value}))}
                                    placeholder="Ex: 10"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className={lbl}>Data *</label>
                                <input
                                    type="date"
                                    className={inp}
                                    value={form.data || ''}
                                    onChange={e => setForm(p => ({...p, data: e.target.value}))}
                                />
                            </div>
                        )}

                        <div>
                            <label className={lbl}>Forma de Pagamento</label>
                            <select className={inp} value={form.forma_pagamento || 'pix'} onChange={e => setForm(p => ({...p, forma_pagamento: e.target.value}))}>
                                {FORMAS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={lbl}>Status</label>
                            <select className={inp} value={form.status || 'pendente'} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                                <option value="pendente">Pendente</option>
                                <option value="pago">Pago</option>
                            </select>
                        </div>

                        <div>
                            <label className={lbl}>Centro de Custo</label>
                            <select className={inp} value={form.centro_custo_id || ''} onChange={e => setForm(p => ({...p, centro_custo_id: e.target.value}))}>
                                <option value="">Sem centro de custo</option>
                                {centrosCusto.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={lbl}>Categoria</label>
                            <select className={inp} value={form.categoria_id || ''} onChange={e => setForm(p => ({...p, categoria_id: e.target.value}))}>
                                <option value="">Sem categoria</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => { setEditando(null); setForm({}) }}
                            className="px-3 py-1.5 text-[12px] text-text-secondary bg-transparent border border-border rounded-lg cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSalvar}
                            disabled={salvando}
                            className="px-4 py-1.5 text-[12px] font-medium text-bg bg-accent rounded-lg border-0 cursor-pointer disabled:opacity-50"
                        >
                            {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lista Variáveis */}
            {aba === 'variaveis' && (
                <div className="space-y-2">
                    {variaveisDoMes.map(d => (
                        <div key={d.id} className={`bg-surface border rounded-xl px-5 py-4 flex items-center justify-between hover:border-text-tertiary/40 transition-colors ${d.status === 'pago' ? 'opacity-60 border-border' : 'border-border'}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-medium text-text-primary truncate">{d.nome}</span>
                                    {d.forma_pagamento && (
                                        <span className="text-[10px] bg-bg border border-border px-1.5 py-0.5 rounded text-text-tertiary capitalize">{d.forma_pagamento}</span>
                                    )}
                                </div>
                                <p className="text-[12px] text-text-tertiary m-0 mt-0.5">
                                    {d.data && new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                    <span className="text-[15px] font-semibold text-text-primary">{formatCurrency(d.valor)}</span>
                                    <p className={`text-[10px] m-0 mt-0.5 font-medium uppercase tracking-wide ${statusBadge(d.status)}`}>{d.status}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {d.status !== 'pago' && (
                                        <button
                                            onClick={() => handlePagar(d.id, 'variavel')}
                                            className="px-2.5 py-1.5 text-[11px] font-medium bg-status-done text-bg hover:bg-[#32963f] rounded cursor-pointer border-0 transition-colors whitespace-nowrap"
                                        >
                                            ✓ Pago
                                        </button>
                                    )}
                                    <button
                                        onClick={() => iniciarEdicao(d, 'variavel')}
                                        className="p-1.5 text-text-tertiary hover:text-accent bg-transparent border-0 cursor-pointer rounded"
                                        title="Editar"
                                    >✏️</button>
                                    <button
                                        onClick={() => setExcluindo({ id: d.id, tipo: 'variavel' })}
                                        className="p-1.5 text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer rounded"
                                        title="Excluir"
                                    >🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {variaveisDoMes.length === 0 && (
                        <div className="text-center py-16 text-text-tertiary">
                            <span className="text-[32px] block mb-3">📋</span>
                            <p className="text-[13px] m-0 font-medium">Nenhuma despesa variável em {mesSelecionado}</p>
                            <p className="text-[12px] m-0 mt-1">Clique em "+ Variável" para adicionar</p>
                        </div>
                    )}
                </div>
            )}

            {/* Lista Fixas */}
            {aba === 'fixas' && (
                <div className="space-y-2">
                    {despesasFixas.length === 0 && (
                        <div className="text-center py-16 text-text-tertiary">
                            <span className="text-[32px] block mb-3">🔄</span>
                            <p className="text-[13px] m-0 font-medium">Nenhuma despesa fixa cadastrada</p>
                            <p className="text-[12px] m-0 mt-1">Adicione contas recorrentes como aluguel, streaming, etc.</p>
                        </div>
                    )}
                    {despesasFixas.map(d => (
                        <div key={d.id} className={`bg-surface border rounded-xl px-5 py-4 flex items-center justify-between hover:border-text-tertiary/40 transition-colors ${d.status === 'pago' ? 'opacity-60 border-border' : 'border-border'}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-medium text-text-primary truncate">{d.nome}</span>
                                    {d.forma_pagamento && (
                                        <span className="text-[10px] bg-bg border border-border px-1.5 py-0.5 rounded text-text-tertiary capitalize">{d.forma_pagamento}</span>
                                    )}
                                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">↺ Fixa</span>
                                </div>
                                <p className="text-[12px] text-text-tertiary m-0 mt-0.5">
                                    Vence todo dia {d.dia_vencimento}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                    <span className="text-[15px] font-semibold text-text-primary">{formatCurrency(d.valor)}</span>
                                    <p className={`text-[10px] m-0 mt-0.5 font-medium uppercase tracking-wide ${statusBadge(d.status)}`}>{d.status}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {d.status !== 'pago' && (
                                        <button
                                            onClick={() => handlePagar(d.id, 'fixa')}
                                            className="px-2.5 py-1.5 text-[11px] font-medium bg-status-done text-bg hover:bg-[#32963f] rounded cursor-pointer border-0 transition-colors whitespace-nowrap"
                                        >
                                            ✓ Pago
                                        </button>
                                    )}
                                    <button
                                        onClick={() => iniciarEdicao(d, 'fixa')}
                                        className="p-1.5 text-text-tertiary hover:text-accent bg-transparent border-0 cursor-pointer rounded"
                                        title="Editar"
                                    >✏️</button>
                                    <button
                                        onClick={() => setExcluindo({ id: d.id, tipo: 'fixa' })}
                                        className="p-1.5 text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer rounded"
                                        title="Excluir"
                                    >🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {excluindo && (
                <ModalConfirmacao
                    titulo="Excluir despesa?"
                    mensagem="Esta ação não pode ser desfeita."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setExcluindo(null)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
