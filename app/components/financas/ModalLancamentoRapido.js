'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { showToast } from '@/app/lib/toast'

export default function ModalLancamentoRapido({ onClose }) {
    const router = useRouter()
    const [tipo, setTipo] = useState('receita')
    const [loading, setLoading] = useState(false)
    
    // Select options states
    const [centrosCusto, setCentrosCusto] = useState([])
    const [categorias, setCategorias] = useState([])
    const [cartoes, setCartoes] = useState([])

    useEffect(() => {
        async function fetchOptions() {
            const [
                { data: ccData },
                { data: catData },
                { data: cartData }
            ] = await Promise.all([
                supabase.from('centros_custo').select('id, nome'),
                supabase.from('categorias').select('id, nome'),
                supabase.from('cartoes_credito').select('id, nome')
            ])
            if (ccData) setCentrosCusto(ccData)
            if (catData) setCategorias(catData)
            if (cartData) setCartoes(cartData)
        }
        fetchOptions()
    }, [])

    // Forms states
    const [formReceita, setFormReceita] = useState({
        origem: '',
        valor: '',
        data_prevista: '',
        tipo: 'salário',
        status: 'recebido'
    })

    const [formDespesa, setFormDespesa] = useState({
        nome: '',
        tipo: 'variável', // ou 'fixa'
        valor: '',
        data: '',
        forma_pagamento: 'pix',
        centro_custo_id: '',
        categoria_id: '',
        status: 'pendente'
    })

    const [formCartao, setFormCartao] = useState({
        nome: '',
        bandeira: '',
        limite_total: '',
        dia_fechamento: 1,
        dia_vencimento: 1
    })

    const [formConta, setFormConta] = useState({
        nome: '',
        banco: '',
        tipo: 'corrente',
        saldo_atual: ''
    })

    const lbl = "block text-[12px] text-text-secondary mb-1 font-medium"
    const inp = "w-full text-[13px] bg-surface hover:bg-surface-hover border border-border rounded-lg px-3 py-2 outline-none focus:border-text-tertiary transition-colors text-text-primary [color-scheme:dark]"

    async function handleSalvar(e) {
        e.preventDefault()
        setLoading(true)

        try {
            if (tipo === 'receita') {
                await supabase.from('receitas').insert({
                    origem: formReceita.origem,
                    valor: parseFloat(formReceita.valor),
                    data_prevista: formReceita.data_prevista,
                    tipo: formReceita.tipo,
                    status: formReceita.status
                })
            } else if (tipo === 'despesa') {
                const isFixa = formDespesa.tipo === 'fixa'
                const payload = {
                    nome: formDespesa.nome,
                    valor: parseFloat(formDespesa.valor),
                    forma_pagamento: formDespesa.forma_pagamento,
                    status: formDespesa.status,
                    centro_custo_id: formDespesa.centro_custo_id || null,
                    categoria_id: formDespesa.categoria_id || null
                }
                
                if (isFixa) {
                    // Despesas fixas usam dia_vencimento
                    payload.dia_vencimento = new Date(formDespesa.data).getDate()
                    await supabase.from('despesas_fixas').insert(payload)
                } else {
                    // Despesas variáveis usam data exata
                    payload.data = formDespesa.data
                    await supabase.from('despesas_variaveis').insert(payload)
                }
            } else if (tipo === 'cartao') {
                const { error } = await supabase.from('cartoes_credito').insert({
                    nome: formCartao.nome,
                    bandeira: formCartao.bandeira,
                    limite_total: parseFloat(formCartao.limite_total),
                    dia_fechamento: parseInt(formCartao.dia_fechamento),
                    dia_vencimento: parseInt(formCartao.dia_vencimento)
                })
                if (error) throw error
            } else if (tipo === 'conta') {
                await supabase.from('contas_bancarias').insert({
                    nome: formConta.nome,
                    banco: formConta.banco,
                    tipo: formConta.tipo,
                    saldo_atual: parseFloat(formConta.saldo_atual)
                })
            }

            // Sucesso genérico
            showToast('Lançamento salvo!')
            router.refresh()
            onClose()

        } catch (error) {
            console.error(error)
            showToast('Erro ao salvar: ' + error.message, 'erro')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface border border-border rounded-xl w-full max-w-[500px]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                    <h2 className="text-[14px] font-semibold text-text-primary m-0">Lançamento Rápido</h2>
                    <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className="px-5 py-4">
                    <div className="flex gap-2 mb-5 p-1 bg-bg rounded-lg border border-border">
                        {[
                            { id: 'receita', label: 'Receita' }, 
                            { id: 'despesa', label: 'Despesa' }, 
                            { id: 'conta', label: 'Conta' },
                            { id: 'cartao', label: 'Cartão' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTipo(t.id)}
                                className={`flex-1 text-[11px] font-medium py-1.5 px-2 rounded-md cursor-pointer border-0 transition-colors ${tipo === t.id ? 'bg-surface text-text-primary shadow-sm' : 'bg-transparent text-text-tertiary hover:text-text-secondary'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSalvar} className="space-y-4">
                        
                        {/* RECEITA */}
                        {tipo === 'receita' && (
                            <>
                                <div>
                                    <label className={lbl}>Origem / Nome</label>
                                    <input type="text" required className={inp} value={formReceita.origem} onChange={e => setFormReceita({...formReceita, origem: e.target.value})} placeholder="Ex: Salário da Empresa" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Tipo</label>
                                        <select className={inp} value={formReceita.tipo} onChange={e => setFormReceita({...formReceita, tipo: e.target.value})}>
                                            <option value="salário">Salário</option>
                                            <option value="extra">Renda Extra</option>
                                            <option value="prestação de serviço">Prestação de Serviço</option>
                                                 </select>
                                    </div>
                                    <div>
                                        <label className={lbl}>Status</label>
                                        <select className={inp} value={formReceita.status} onChange={e => setFormReceita({...formReceita, status: e.target.value})}>
                                            <option value="recebido">Recebido</option>
                                            <option value="previsto">Previsto</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Valor (R$)</label>
                                        <input type="number" step="0.01" required className={inp} value={formReceita.valor} onChange={e => setFormReceita({...formReceita, valor: e.target.value})} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className={lbl}>Data</label>
                                        <input type="date" required className={inp} value={formReceita.data_prevista} onChange={e => setFormReceita({...formReceita, data_prevista: e.target.value})} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* DESPESA */}
                        {tipo === 'despesa' && (
                            <>
                                <div>
                                    <label className={lbl}>Nome da Despesa</label>
                                    <input type="text" required className={inp} value={formDespesa.nome} onChange={e => setFormDespesa({...formDespesa, nome: e.target.value})} placeholder="Ex: Energia Elétrica" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Tipo</label>
                                        <select className={inp} value={formDespesa.tipo} onChange={e => setFormDespesa({...formDespesa, tipo: e.target.value})}>
                                            <option value="variável">Variável</option>
                                            <option value="fixa">Fixa</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={lbl}>Valor (R$)</label>
                                        <input type="number" step="0.01" required className={inp} value={formDespesa.valor} onChange={e => setFormDespesa({...formDespesa, valor: e.target.value})} placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Data / Vencimento</label>
                                        <input type="date" required className={inp} value={formDespesa.data} onChange={e => setFormDespesa({...formDespesa, data: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className={lbl}>Forma de Pagamento</label>
                                        <select className={inp} value={formDespesa.forma_pagamento} onChange={e => setFormDespesa({...formDespesa, forma_pagamento: e.target.value})}>
                                            <option value="pix">PIX</option>
                                            <option value="débito">Débito</option>
                                            <option value="crédito">Crédito</option>
                                            <option value="boleto">Boleto</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Centro de Custo</label>
                                        <select className={inp} value={formDespesa.centro_custo_id} onChange={e => setFormDespesa({...formDespesa, centro_custo_id: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {centrosCusto.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={lbl}>Categoria</label>
                                        <select className={inp} value={formDespesa.categoria_id} onChange={e => setFormDespesa({...formDespesa, categoria_id: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* CARTÃO DE CRÉDITO */}
                        {tipo === 'cartao' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Nome</label>
                                        <input type="text" required className={inp} value={formCartao.nome} onChange={e => setFormCartao({...formCartao, nome: e.target.value})} placeholder="Ex: Cartão BB" />
                                    </div>
                                    <div>
                                        <label className={lbl}>Bandeira</label>
                                        <input type="text" className={inp} value={formCartao.bandeira} onChange={e => setFormCartao({...formCartao, bandeira: e.target.value})} placeholder="Ex: Visa" />
                                    </div>
                                </div>
                                <div>
                                    <label className={lbl}>Limite Total (R$)</label>
                                    <input type="number" step="0.01" required className={inp} value={formCartao.limite_total} onChange={e => setFormCartao({...formCartao, limite_total: e.target.value})} placeholder="0.00" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Dia do Fechamento</label>
                                        <input type="number" min="1" max="31" required className={inp} value={formCartao.dia_fechamento} onChange={e => setFormCartao({...formCartao, dia_fechamento: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className={lbl}>Dia do Vencimento</label>
                                        <input type="number" min="1" max="31" required className={inp} value={formCartao.dia_vencimento} onChange={e => setFormCartao({...formCartao, dia_vencimento: e.target.value})} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* CONTA BANCÁRIA */}
                        {tipo === 'conta' && (
                            <>
                                <div>
                                    <label className={lbl}>Nome da Conta</label>
                                    <input type="text" required className={inp} value={formConta.nome} onChange={e => setFormConta({...formConta, nome: e.target.value})} placeholder="Ex: Itaú Principal" />
                                </div>
                                <div>
                                    <label className={lbl}>Banco</label>
                                    <input type="text" required className={inp} value={formConta.banco} onChange={e => setFormConta({...formConta, banco: e.target.value})} placeholder="Ex: Itaú" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>Tipo</label>
                                        <select className={inp} value={formConta.tipo} onChange={e => setFormConta({...formConta, tipo: e.target.value})}>
                                            <option value="corrente">Corrente</option>
                                            <option value="poupança">Poupança</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={lbl}>Saldo Atual (R$)</label>
                                        <input type="number" step="0.01" required className={inp} value={formConta.saldo_atual} onChange={e => setFormConta({...formConta, saldo_atual: e.target.value})} placeholder="0.00" />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
                            <button type="button" onClick={onClose} disabled={loading} className="px-3 py-1.5 text-[12px] text-text-secondary bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className="px-4 py-1.5 text-[12px] text-bg bg-text-primary hover:bg-text-secondary disabled:opacity-50 border-0 rounded-lg cursor-pointer font-medium transition-colors">
                                {loading ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
