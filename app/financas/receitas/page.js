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
    if (erro) return <div className="p-8 text-priority-urgent">â ï¸ {erro}</div>

    // Filtra por data_prevista OU mes_referencia (ambos usando substring para compatibilidade)
    const receitasDoMes = receitas.filter(r => {
        const mesData = r.data_prevista ? String(r.data_prevista).substring(0, 7) : null
        const mesRef  = r.mes_referencia ? String(r.mes_referencia).substring(0, 7) : null
        return mesData === mesSelecionado || mesRef === mesSelecionado
    }).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista))

    const totalPrevisto = receitasDoMes.reduce((acc, r) => acc + Number(r.valor || 0), 0)
    const totalRecebido = receitasDoMes.filter(r => r.status === 'recebido').reduce((acc, r) => acc + Number(r.valor || 0), 0)

    async function handleSalvar() {
        if (!form.origem) { showToast('Informe a origem da receita', 'erro'); return }
        if (!form.valor || parseFloat(form.valor) <= 0) { showToast('Informe um valor vÃ¡lido', 'erro'); return }

        const dataPrevista = form.data_prevista || (mesSelecionado + '-01')

        setSalvando(true)
        try {
            const payload = {
                valor: parseFloat(form.valor || 0),
                data_prevista: dataPrevista,
                tipo: form.tipo || 'salÃ¡rio',
                status: form.status || 'previsto',
                origem: form.origem || null,
                recorrente: form.recorrente || false,
            }
            if (editando === 'novo') {
                await financeService.criarReceita(payload)
            } else {
                await financeService.atualizarReceita(editando, payload)
            }
            await refetch()
            const mesSalvo = dataPrevista.substring(0, 7)
            if (mesSalvo !== mesSelecionado) setMesSelecionado(mesSalvo)
            showToast(editando === 'novo' ? 'Receita criada!' : 'Receita atualizada!')
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
            showToast('Receita confirmada! â')
        } catch (e) { showToast('Erro ao confirmar: ' + e.message, 'erro') }
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

    function iniciarEdicao(r) {
        setEditando(r.id)
        setForm({
            origem: r.origem || r.nome || '',
            valor: r.valor,
            tipo: r.tipo || 'salÃ¡rio',
            status: r.status || 'previsto',
            data_prevista: r.data_prevista || '',
            recorrente: r.recorrente || false,
        })
    }

    const lbl = "block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1"
    const inp = "w-full text-[13px] bg-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-[16px] font-semibold text-text-primary m-0">Receitas</h2>
                    <p className="text-[13px] text-text-secondary m-0 mt-1">
                        Recebido: <strong className="text-status-done">{formatCurrency(totalRecebido)}</strong>
                        {' '}/ Previsto: <strong>{formatCurrency(totalPrevisto)}</strong>
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
                        onClick={() => { setEditando('novo'); setForm({ status: 'previsto', tipo: 'salÃ¡rio', data_prevista: mesSelecionado + '-01' }) }}
                        className="px-4 py-2 text-[12px] font-medium bg-accent text-bg rounded-lg border-0 cursor-pointer transition-colors"
                    >
                        + Nova Receita
                    </button>
                </div>
            </div>

            {editando && (
                <div className="bg-surface border border-accent/30 rounded-xl p-5 mb-6">
                    <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-4">
                        {editando === 'novo' ? 'Nova Receita' : 'Editar Receita'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={lbl}>Origem *</label>
                            <input
                                className={inp}
                                value={form.origem || ''}
                                onChange={e => setForm(p => ({...p, origem: e.target.value}))}
                                placeholder="Ex: SalÃ¡rio, Freelance, Aluguel..."
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className={lbl}>Tipo</label>
                            <select className={inp} value={form.tipo || 'salÃ¡rio'} onChange={e => setForm(p => ({...p, tipo: e.target.value}))}>
                                <option value="salÃ¡rio">SalÃ¡rio</option>
                                <option value="extra">Renda Extra</option>
                                <option value="prestaÃ§Ã£o de serviÃ§o">PrestaÃ§Ã£o de ServiÃ§o</option>
                                <option value="saldo anterior">Saldo Anterior</option>
                                <option value="investimento">Investimento</option>
                                <option value="outro">Outro</option>
                            </select>
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
                        <div>
                            <label className={lbl}>Data Prevista</label>
                            <input
                                type="date"
                                className={inp}
                                value={form.data_prevista || ''}
                                onChange={e => setForm(p => ({...p, data_prevista: e.target.value}))}
                            />
                        </div>
                        <div>
                            <label className={lbl}>Status</label>
                            <select className={inp} value={form.status || 'previsto'} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                                <option value="previsto">Previsto</option>
                                <option value="recebido">Recebido</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <input
                                    type="checkbox"
                                id="recorrente"
                                checked={form.recorrente || false}
                                onChange={e => setForm(p => ({...p, recorrente: e.target.checked}))}
                            />
                            <label htmlFor="recorrente" className="text-[12px] text-text-primary cursor-pointer">
                                Recorrente (repete todo mÃªs)
                            </label>
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
                            className="px-4 py-1.5 text-[12px] font-medium text-bg bg-accent rounded-lg cursor-pointer border-0 disabled:opacity-50"
                        >
                            {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {receitasDoMes.map(r => (
                    <div key={r.id} className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between hover:border-text-tertiary/40 transition-colors group">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-[14px] font-medium text-text-primary m-0 truncate">
                                    {r.origem || r.nome || 'â'}
                                </h3>
                                {r.recorrente && (
                                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full whitespace-nowrap">âº Recorrente</span>
                                )}
                            </div>
                            <p className="text-[12px] text-text-tertiary m-0 capitalize">
                                {r.tipo}
                                {r.data_prevista && ` Â· Previsto: ${new Date(r.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                                {r.data_recebida && ` Â· Recebido: ${new Date(r.data_recebida + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                            <div className="text-right">
                                <span className={`text-[16px] font-semibold ${r.status === 'recebido' ? 'text-status-done' : 'text-text-primary'}`}>
                                    {formatCurrency(r.valor)}
                                </span>
                                <p className="text-[10px] m-0 mt-0.5 uppercase tracking-wide font-medium"
                                    style={{ color: r.status === 'recebido' ? '#16A34A' : '#71717A' }}>
                                    {r.status}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {r.status === 'previsto' && (
                                    <button
                                        onClick={() => handleConfirmar(r.id)}
                                        className="px-3 py-1.5 text-[11px] font-medium bg-status-done text-bg hover:bg-[#32963f] rounded cursor-pointer border-0 transition-colors whitespace-nowrap"
                                    >
                                        â Recebido
                                    </button>
                                )}
                                <button
                                    onClick={() => iniciarEdicao(r)}
                                    className="p-1.5 text-text-tertiary hover:text-accent bg-transparent border-0 cursor-pointer rounded transition-colors"
                                    title="Editar"
                                >
                                    âï¸
                                </button>
                                <button
                                    onClick={() => setExcluindoId(r.id)}
                                    className="p-1.5 text-text-tertiary hover:text-priority-urgent bg-transparent border-0 cursor-pointer rounded transition-colors"
                                    title="Excluir"
                                >
                                    ðï¸
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {receitasDoMes.length === 0 && (
                    <div className="text-center py-16 text-text-tertiary">
                        <span className="text-[32px] block mb-3">ð°</span>
                        <p className="text-[13px] m-0 font-medium">Nenhuma receita em {mesSelecionado}</p>
                        <p className="text-[12px] m-0 mt-1">Clique em "+ Nova Receita" para adicionar</p>
                    </div>
                )}
            </div>

            {excluindoId && (
                <ModalConfirmacao
                    titulo="Excluir receita?"
                    mensagem="Esta aÃ§Ã£o nÃ£o pode ser desfeita."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setExcluindoId(null)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
