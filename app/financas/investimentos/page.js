'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ── Cores por pilar (dourado=FII, verde=SmallCap, azul=RF, terracota=Ações) ──
const COR_PILAR = {
    'FIIs':              { bg: '#FFFBEB', border: '#D97706', text: '#D97706', hex: '#D97706' },
    'Small Caps':        { bg: '#F0FDF4', border: '#16A34A', text: '#16A34A', hex: '#16A34A' },
    'Renda Fixa':        { bg: '#EFF6FF', border: '#2563EB', text: '#2563EB', hex: '#2563EB' },
    'Ações Div+Val':     { bg: '#FFF7ED', border: '#EA580C', text: '#EA580C', hex: '#EA580C' },
}
function getCor(nome) {
    return COR_PILAR[nome] || { bg: '#F4F4F5', border: '#71717A', text: '#71717A', hex: '#71717A' }
}

// ── Motor de sinalização ─────────────────────────────────────────────────────
function calcularSinal(ativo, precoAtual) {
    if (!ativo || !precoAtual) return null
    const preco = parseFloat(precoAtual)
    const pilar = ativo.pilar_nome

    if (pilar === 'FIIs') {
        if (!ativo.pvp_ref || !ativo.vpa_ref) return { sinal: 'Neutro', cor: '#D97706', razao: 'P/VP de referência não cadastrado.' }
        const pvpAtual = preco / parseFloat(ativo.vpa_ref)
        const pvpRef   = parseFloat(ativo.pvp_ref)
        const ratio    = pvpAtual / pvpRef
        if (pvpRef > 1.0) return { sinal: 'Apenas Renda', cor: '#2563EB', razao: `P/VP de referência acima de 1,0 (${pvpRef.toFixed(2)}) — sem expectativa de valorização patrimonial.` }
        if (pvpRef < 0.30 && (ativo.dy_ref || 0) > 16) return { sinal: '⚠️ Risco', cor: '#DC2626', razao: `P/VP muito baixo (${pvpRef.toFixed(2)}) com DY alto — possível distress. Revisar fundamentos.` }
        if (ratio < 0.97) return { sinal: 'Comprar', cor: '#16A34A', razao: `P/VP atual (${pvpAtual.toFixed(2)}) está ${((1 - ratio) * 100).toFixed(1)}% abaixo da referência (${pvpRef.toFixed(2)}). Desconto relevante.` }
        if (ratio <= 1.03) return { sinal: 'Neutro — Aguardar', cor: '#D97706', razao: `P/VP atual (${pvpAtual.toFixed(2)}) dentro da banda neutra (±3% da referência ${pvpRef.toFixed(2)}).` }
        return { sinal: 'Evitar', cor: '#DC2626', razao: `P/VP atual (${pvpAtual.toFixed(2)}) acima da referência (${pvpRef.toFixed(2)}) em ${((ratio - 1) * 100).toFixed(1)}%. Aguardar recuo.` }
    }

    if (pilar === 'Small Caps') {
        return { sinal: 'DCA Recomendado', cor: '#16A34A', razao: 'Small Caps: aporte fracionado em parcelas (DCA). Não há timing único — entre gradualmente com parcelas regulares.' }
    }

    if (pilar === 'Renda Fixa') {
        return { sinal: 'Verificar Taxa', cor: '#2563EB', razao: 'Renda Fixa: compare a taxa oferecida com o CDI/Selic atual e seu limiar mínimo. Se taxa >= mínimo, alocar.' }
    }

    if (pilar === 'Ações Div+Val') {
        return { sinal: 'Análise Manual', cor: '#EA580C', razao: 'Ações: avalie dividendos, crescimento e contexto macro. Verifique se a tese original ainda é válida antes de aportar.' }
    }

    return { sinal: 'Neutro', cor: '#71717A', razao: 'Sem regra automática para este pilar.' }
}

// ── Formatos ─────────────────────────────────────────────────────────────────
function fmtBRL(v) { return v == null ? '—' : parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtPct(v) { return v == null ? '—' : `${parseFloat(v).toFixed(1)}%` }

// ── Badge Pilar ───────────────────────────────────────────────────────────────
function PilarBadge({ nome }) {
    const cor = getCor(nome)
    return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cor.bg, color: cor.text, border: `1px solid ${cor.border}` }}>
            {nome}
        </span>
    )
}

// ── Resumo fixo no topo ───────────────────────────────────────────────────────
function ResumoTopo({ operacoes, pilares, ativos }) {
    const { totalInvestido, nOps, maiorDesvio } = useMemo(() => {
        const compras = operacoes.filter(o => o.tipo === 'compra')
        const total = compras.reduce((a, o) => a + (o.total || 0), 0)

        // Posição por pilar
        const porPilar = {}
        pilares.forEach(p => { porPilar[p.id] = { nome: p.nome, peso_alvo: p.peso_alvo, valor: 0 } })
        operacoes.forEach(o => {
            const ativo = ativos.find(a => a.id === o.ativo_id)
            if (!ativo || !porPilar[ativo.pilar_id]) return
            if (o.tipo === 'compra') porPilar[ativo.pilar_id].valor += (o.total || 0)
            if (o.tipo === 'venda')  porPilar[ativo.pilar_id].valor -= (o.total || 0)
        })
        let maiorDesvio = null
        let maiorDelta = 0
        Object.values(porPilar).forEach(p => {
            const pctReal = total > 0 ? (p.valor / total * 100) : 0
            const delta   = Math.abs(pctReal - (p.peso_alvo || 0))
            if (delta > maiorDelta) { maiorDelta = delta; maiorDesvio = { nome: p.nome, delta } }
        })
        return { totalInvestido: total, nOps: compras.length, maiorDesvio }
    }, [operacoes, pilares, ativos])

    return (
        <div className="flex items-center gap-6 px-8 py-3 border-b border-border bg-surface/60 text-[12px]">
            <div><span className="text-text-tertiary">Total investido</span> <span className="font-semibold text-text-primary ml-1">{fmtBRL(totalInvestido)}</span></div>
            <div className="w-px h-4 bg-border" />
            <div><span className="text-text-tertiary">Operações</span> <span className="font-semibold text-text-primary ml-1">{nOps}</span></div>
            <div className="w-px h-4 bg-border" />
            {maiorDesvio && (
                <div>
                    <span className="text-text-tertiary">Maior desvio</span>
                    <span className={`font-semibold ml-1 ${maiorDesvio.delta > 5 ? 'text-[#DC2626]' : 'text-text-primary'}`}>
                        {maiorDesvio.nome} ({fmtPct(maiorDesvio.delta)} off)
                    </span>
                </div>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — CARTEIRA (Consolidação)
// ════════════════════════════════════════════════════════════════════════════
function TabCarteira({ operacoes, pilares, ativos, onEditAtivo }) {
    const { totalCarteira, porPilar, posicoes, alertas } = useMemo(() => {
        // Posição por ativo
        const map = {}
        operacoes.forEach(o => {
            if (!map[o.ativo_id]) map[o.ativo_id] = { qtd: 0, totalPago: 0, totalVendido: 0 }
            if (o.tipo === 'compra') { map[o.ativo_id].qtd += o.quantidade; map[o.ativo_id].totalPago += (o.total || 0) }
            if (o.tipo === 'venda')  { map[o.ativo_id].qtd -= o.quantidade; map[o.ativo_id].totalVendido += (o.total || 0) }
        })
        const posicoes = ativos.map(a => {
            const pos = map[a.id] || { qtd: 0, totalPago: 0 }
            const precoMedio = pos.qtd > 0 ? pos.totalPago / pos.qtd : 0
            return { ...a, qtd: pos.qtd, totalPago: pos.totalPago, precoMedio, valorAtual: pos.qtd * precoMedio }
        }).filter(p => p.qtd > 0)

        const totalCarteira = posicoes.reduce((a, p) => a + p.valorAtual, 0)

        // Por pilar
        const porPilar = pilares.map(pilar => {
            const ativosP = posicoes.filter(p => p.pilar_id === pilar.id)
            const valorReal = ativosP.reduce((a, p) => a + p.valorAtual, 0)
            const pctReal   = totalCarteira > 0 ? (valorReal / totalCarteira * 100) : 0
            const desvio    = pctReal - (pilar.peso_alvo || 0)
            return { ...pilar, valorReal, pctReal, desvio, ativos: ativosP }
        })

        // Alertas
        const alertas = []
        porPilar.forEach(p => {
            if (Math.abs(p.desvio) > 5) alertas.push({ tipo: 'desvio', msg: `${p.nome}: peso real ${fmtPct(p.pctReal)} vs alvo ${fmtPct(p.peso_alvo)} (${p.desvio > 0 ? '+' : ''}${fmtPct(p.desvio)})` })
        })
        posicoes.forEach(p => {
            const pct = totalCarteira > 0 ? p.valorAtual / totalCarteira * 100 : 0
            if (pct > 10) alertas.push({ tipo: 'concentracao', msg: `${p.ticker}: ${fmtPct(pct)} da carteira (limite: 10%)` })
            if (p.status === 'Observação') alertas.push({ tipo: 'tese', msg: `${p.ticker}: tese em observação — revisar` })
        })

        return { totalCarteira, porPilar, posicoes, alertas }
    }, [operacoes, pilares, ativos])

    return (
        <div className="p-8 max-w-[1000px] mx-auto space-y-6">
            {/* Alertas */}
            {alertas.length > 0 && (
                <div className="bg-[#FEF2F2] border border-[#DC2626]/30 rounded-xl p-4 space-y-1.5">
                    <p className="text-[12px] font-semibold text-[#DC2626] m-0 mb-2">⚠️ {alertas.length} alerta{alertas.length > 1 ? 's' : ''}</p>
                    {alertas.map((a, i) => (
                        <p key={i} className="text-[12px] text-[#DC2626] m-0">· {a.msg}</p>
                    ))}
                </div>
            )}

            {/* Pilares */}
            <div className="grid grid-cols-2 gap-4">
                {porPilar.map(pilar => {
                    const cor = getCor(pilar.nome)
                    const desvioAbs = Math.abs(pilar.desvio)
                    return (
                        <div key={pilar.id} className="bg-surface border rounded-xl overflow-hidden" style={{ borderColor: cor.border }}>
                            <div className="flex items-center justify-between px-4 py-3" style={{ background: cor.bg }}>
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold" style={{ color: cor.text }}>{pilar.nome}</span>
                                    {desvioAbs > 5 && <span className="text-[10px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-1.5 py-0.5 rounded">off {fmtPct(desvioAbs)}</span>}
                                </div>
                                <div className="text-right">
                                    <span className="text-[14px] font-bold text-text-primary">{fmtPct(pilar.pctReal)}</span>
                                    <span className="text-[11px] text-text-tertiary ml-1">/ alvo {fmtPct(pilar.peso_alvo)}</span>
                                </div>
                            </div>
                            {/* Barra */}
                            <div className="px-4 py-2">
                                <div className="relative h-2 bg-bg rounded-full overflow-hidden border border-border">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pilar.pctReal)}%`, background: cor.hex }} />
                                    {/* Marker alvo */}
                                    <div className="absolute top-0 bottom-0 w-px bg-text-tertiary/50" style={{ left: `${pilar.peso_alvo}%` }} />
                                </div>
                            </div>
                            {/* Ativos do pilar */}
                            {pilar.ativos.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {pilar.ativos.map(a => (
                                        <div key={a.id} className="flex items-center justify-between px-4 py-2 hover:bg-bg/50 group">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] font-semibold text-text-primary w-16">{a.ticker}</span>
                                                <span className="text-[11px] text-text-tertiary truncate max-w-[120px]">{a.nome}</span>
                                                {a.status === 'Observação' && <span className="text-[10px] text-[#D97706] bg-[#FFFBEB] border border-[#D97706]/30 px-1.5 rounded">👁 Observação</span>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[12px] font-medium text-text-primary m-0">{fmtBRL(a.valorAtual)}</p>
                                                <p className="text-[10px] text-text-tertiary m-0">{a.qtd} cotas · PM {fmtBRL(a.precoMedio)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[12px] text-text-tertiary px-4 py-3 m-0">0% — nenhuma operação registrada neste pilar.</p>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — ANALISAR MOMENTO
// ════════════════════════════════════════════════════════════════════════════
function TabAnalisar({ ativos, pilares }) {
    const [ticker, setTicker] = useState('')
    const [preco, setPreco]   = useState('')
    const [capital, setCapital] = useState('')
    const [resultado, setResultado] = useState(null)
    const [sugestoes, setSugestoes] = useState([])

    function buscarSugestoes(val) {
        setTicker(val)
        setResultado(null)
        if (val.length < 1) { setSugestoes([]); return }
        setSugestoes(ativos.filter(a => a.ticker.toUpperCase().includes(val.toUpperCase()) || a.nome?.toLowerCase().includes(val.toLowerCase())).slice(0, 6))
    }

    function analisar() {
        if (!ticker || !preco) return
        const ativo = ativos.find(a => a.ticker.toUpperCase() === ticker.toUpperCase())
        const foraDaEstrategia = !ativo
        const sinal = ativo ? calcularSinal({ ...ativo, pilar_nome: pilares.find(p => p.id === ativo.pilar_id)?.nome }, preco) : null
        const precoN = parseFloat(preco)
        const capitalN = parseFloat(capital) || 0
        const qtdCompravel = precoN > 0 && capitalN > 0 ? Math.floor(capitalN / precoN) : null
        const residual = qtdCompravel != null ? capitalN - (qtdCompravel * precoN) : null

        setResultado({ ativo, sinal, foraDaEstrategia, qtdCompravel, residual, precoN, capitalN })
        setSugestoes([])
    }

    return (
        <div className="p-8 max-w-[600px] mx-auto space-y-5">
            <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
                <h2 className="text-[14px] font-semibold text-text-primary m-0">Análise de Momento de Entrada</h2>

                {/* Ticker */}
                <div className="relative">
                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Ticker</label>
                    <input
                        type="text"
                        value={ticker}
                        onChange={e => buscarSugestoes(e.target.value)}
                        placeholder="Ex: HSML11, SMFT3..."
                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary uppercase"
                    />
                    {sugestoes.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl z-10 overflow-hidden">
                            {sugestoes.map(a => (
                                <button key={a.id} onMouseDown={() => { setTicker(a.ticker); setSugestoes([]) }}
                                    className="w-full text-left px-3 py-2 hover:bg-bg border-b border-border last:border-0 cursor-pointer">
                                    <span className="text-[12px] font-semibold text-text-primary">{a.ticker}</span>
                                    <span className="text-[11px] text-text-tertiary ml-2">{a.nome}</span>
                                    <PilarBadge nome={pilares.find(p => p.id === a.pilar_id)?.nome} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Preço atual (R$)</label>
                        <input type="number" value={preco} onChange={e => setPreco(e.target.value)}
                            placeholder="Ex: 87.50"
                            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                    </div>
                    <div>
                        <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Capital disponível (R$)</label>
                        <input type="number" value={capital} onChange={e => setCapital(e.target.value)}
                            placeholder="Ex: 300.00"
                            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                    </div>
                </div>

                <button onClick={analisar} disabled={!ticker || !preco}
                    className="w-full bg-accent text-white rounded-lg px-4 py-2.5 text-[13px] font-medium cursor-pointer border-0 hover:bg-accent/90 disabled:opacity-40">
                    Analisar →
                </button>
            </div>

            {/* Resultado */}
            {resultado && (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    {/* Alerta fora da estratégia */}
                    {resultado.foraDaEstrategia && (
                        <div className="bg-[#FFFBEB] border-b border-[#D97706]/30 px-4 py-2.5">
                            <p className="text-[12px] text-[#D97706] font-medium m-0">⚠️ Ticker não encontrado na lista de elegíveis da estratégia. Verifique antes de prosseguir.</p>
                        </div>
                    )}

                    {/* Sinal */}
                    {resultado.sinal && (
                        <div className="px-5 py-4 border-b border-border">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[22px] font-bold" style={{ color: resultado.sinal.cor }}>{resultado.sinal.sinal}</span>
                                {resultado.ativo && <PilarBadge nome={pilares.find(p => p.id === resultado.ativo.pilar_id)?.nome} />}
                            </div>
                            <p className="text-[13px] text-text-secondary m-0 leading-relaxed">{resultado.sinal.razao}</p>
                        </div>
                    )}

                    {/* Contexto do ativo */}
                    {resultado.ativo?.contexto_tese && (
                        <div className="px-5 py-3 border-b border-border bg-bg/50">
                            <p className="text-[11px] text-text-tertiary uppercase tracking-wider m-0 mb-1">Tese cadastrada</p>
                            <p className="text-[12px] text-text-secondary m-0 leading-relaxed">{resultado.ativo.contexto_tese}</p>
                        </div>
                    )}

                    {/* Simulação de compra */}
                    {resultado.qtdCompravel != null && (
                        <div className="px-5 py-4 grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-[11px] text-text-tertiary m-0">Cotas compráveis</p>
                                <p className="text-[20px] font-bold text-text-primary m-0">{resultado.qtdCompravel}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-text-tertiary m-0">Total operação</p>
                                <p className="text-[16px] font-semibold text-text-primary m-0">{fmtBRL(resultado.qtdCompravel * resultado.precoN)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-text-tertiary m-0">Residual</p>
                                <p className="text-[16px] font-semibold text-text-secondary m-0">{fmtBRL(resultado.residual)}</p>
                            </div>
                        </div>
                    )}

                    {/* Métricas FII */}
                    {resultado.ativo?.pvp_ref && resultado.ativo?.vpa_ref && (
                        <div className="px-5 py-3 border-t border-border bg-bg/30 flex gap-6 text-[12px]">
                            <div><span className="text-text-tertiary">P/VP atual:</span> <span className="font-medium">{(resultado.precoN / parseFloat(resultado.ativo.vpa_ref)).toFixed(2)}</span></div>
                            <div><span className="text-text-tertiary">P/VP ref:</span> <span className="font-medium">{resultado.ativo.pvp_ref}</span></div>
                            <div><span className="text-text-tertiary">VPA ref:</span> <span className="font-medium">{fmtBRL(resultado.ativo.vpa_ref)}</span></div>
                            {resultado.ativo.dy_ref && <div><span className="text-text-tertiary">DY ref:</span> <span className="font-medium">{resultado.ativo.dy_ref}%</span></div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — REGISTRAR OPERAÇÃO
// ════════════════════════════════════════════════════════════════════════════
const FORM_OP_VAZIO = { ativo_id: '', tipo: 'compra', data: new Date().toISOString().split('T')[0], preco_unit: '', quantidade: '', origem_capital: 'aporte novo', observacao: '' }

function TabRegistrar({ ativos, pilares, onSalvo }) {
    const [form, setForm]   = useState(FORM_OP_VAZIO)
    const [saving, setSaving] = useState(false)

    const total = parseFloat(form.preco_unit || 0) * parseFloat(form.quantidade || 0)

    async function salvar() {
        if (!form.ativo_id || !form.preco_unit || !form.quantidade) return
        setSaving(true)
        const payload = {
            ativo_id:      form.ativo_id,
            tipo:          form.tipo,
            data:          form.data,
            preco_unit:    parseFloat(form.preco_unit),
            quantidade:    parseFloat(form.quantidade),
            // total é GENERATED ALWAYS AS no banco — não enviar no INSERT
            origem_capital: form.origem_capital || null,
            observacao:    form.observacao.trim() || null,
        }
        const { data: nova } = await supabase.from('inv_operacoes').insert(payload).select().single()
        onSalvo(nova)
        setForm(FORM_OP_VAZIO)
        setSaving(false)
    }

    return (
        <div className="p-8 max-w-[560px] mx-auto">
            <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
                <h2 className="text-[14px] font-semibold text-text-primary m-0">Registrar Operação</h2>

                {/* Tipo */}
                <div className="flex gap-2">
                    {['compra','venda'].map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                            className={`flex-1 py-2 rounded-lg border text-[13px] font-medium cursor-pointer transition-colors ${form.tipo === t
                                ? t === 'compra' ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-[#DC2626] text-white border-[#DC2626]'
                                : 'border-border text-text-secondary bg-bg hover:bg-surface'}`}>
                            {t === 'compra' ? '↓ Compra' : '↑ Venda'}
                        </button>
                    ))}
                </div>

                {/* Ativo */}
                <div>
                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Ativo</label>
                    <select value={form.ativo_id} onChange={e => setForm(f => ({ ...f, ativo_id: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary">
                        <option value="">Selecionar ativo...</option>
                        {pilares.map(pilar => (
                            <optgroup key={pilar.id} label={pilar.nome}>
                                {ativos.filter(a => a.pilar_id === pilar.id).map(a => (
                                    <option key={a.id} value={a.id}>{a.ticker} — {a.nome}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Data</label>
                        <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                    </div>
                    <div>
                        <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Origem do capital</label>
                        <select value={form.origem_capital} onChange={e => setForm(f => ({ ...f, origem_capital: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary">
                            <option value="aporte novo">Aporte novo</option>
                            <option value="venda de ativo">Capital de venda</option>
                            <option value="dividendos reinvestidos">Dividendos reinvestidos</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Preço unitário (R$)</label>
                        <input type="number" step="0.01" value={form.preco_unit} onChange={e => setForm(f => ({ ...f, preco_unit: e.target.value }))}
                            placeholder="0.00"
                            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                    </div>
                    <div>
                        <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Quantidade</label>
                        <input type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                            placeholder="0"
                            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                    </div>
                </div>

                {/* Total calculado */}
                {total > 0 && (
                    <div className="bg-bg border border-border rounded-lg px-4 py-2.5 flex justify-between items-center">
                        <span className="text-[12px] text-text-tertiary">Total da operação</span>
                        <span className="text-[16px] font-bold text-text-primary">{fmtBRL(total)}</span>
                    </div>
                )}

                {/* Observação */}
                <div>
                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">
                        Observação <span className="normal-case text-text-tertiary font-normal">— racional da decisão</span>
                    </label>
                    <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                        placeholder='Ex: "Compra por P/VP abaixo de 0.90", "Saída por quebra de tese — diluição anunciada"'
                        rows={2}
                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary resize-none" />
                </div>

                <button onClick={salvar} disabled={saving || !form.ativo_id || !form.preco_unit || !form.quantidade}
                    className="w-full bg-accent text-white rounded-lg px-4 py-2.5 text-[13px] font-medium cursor-pointer border-0 hover:bg-accent/90 disabled:opacity-40">
                    {saving ? 'Registrando...' : 'Registrar operação'}
                </button>
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — HISTÓRICO
// ════════════════════════════════════════════════════════════════════════════
function TabHistorico({ operacoes, ativos, pilares }) {
    const [filtroTicker, setFiltroTicker] = useState('')

    const ops = useMemo(() => {
        return [...operacoes]
            .sort((a, b) => new Date(b.data) - new Date(a.data))
            .filter(o => {
                if (!filtroTicker) return true
                const ativo = ativos.find(a => a.id === o.ativo_id)
                return ativo?.ticker?.toUpperCase().includes(filtroTicker.toUpperCase())
            })
            .map(o => ({
                ...o,
                ativo: ativos.find(a => a.id === o.ativo_id),
            }))
    }, [operacoes, ativos, filtroTicker])

    return (
        <div className="p-8 max-w-[900px] mx-auto">
            <div className="flex items-center gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Filtrar por ticker..."
                    value={filtroTicker}
                    onChange={e => setFiltroTicker(e.target.value)}
                    className="border border-border rounded-lg px-3 py-1.5 text-[13px] bg-surface text-text-primary w-44"
                />
                <span className="text-[12px] text-text-tertiary">{ops.length} operaç{ops.length === 1 ? 'ão' : 'ões'}</span>
            </div>

            {ops.length === 0 ? (
                <div className="text-center py-16 text-text-tertiary">
                    <p className="text-[28px] mb-2">📋</p>
                    <p className="text-[13px]">Nenhuma operação registrada ainda.</p>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="border-b border-border">
                                {['Data','Tipo','Ticker','Pilar','Qtd','Preço','Total','Origem','Obs.'].map(h => (
                                    <th key={h} className="text-left px-3 py-2.5 text-text-tertiary font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ops.map(o => (
                                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                                    <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">
                                        {new Date(o.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${o.tipo === 'compra' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
                                            {o.tipo === 'compra' ? '↓ compra' : '↑ venda'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold text-text-primary">{o.ativo?.ticker || '—'}</td>
                                    <td className="px-3 py-2.5">
                                        {o.ativo && <PilarBadge nome={pilares.find(p => p.id === o.ativo.pilar_id)?.nome} />}
                                    </td>
                                    <td className="px-3 py-2.5 text-text-secondary">{o.quantidade}</td>
                                    <td className="px-3 py-2.5 text-text-secondary">{fmtBRL(o.preco_unit)}</td>
                                    <td className="px-3 py-2.5 font-medium text-text-primary">{fmtBRL(o.total)}</td>
                                    <td className="px-3 py-2.5 text-text-tertiary text-[11px]">{o.origem_capital || '—'}</td>
                                    <td className="px-3 py-2.5 text-text-tertiary max-w-[160px] truncate" title={o.observacao}>{o.observacao || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 5 — ESTRATÉGIA (Cadastro de ativos e pilares)
// ════════════════════════════════════════════════════════════════════════════
const FORM_ATIVO_VAZIO = { pilar_id: '', ticker: '', nome: '', segmento: '', pvp_ref: '', vpa_ref: '', dy_ref: '', peso_alvo_pilar: '', contexto_tese: '', status: 'Ativo' }

function TabEstrategia({ pilares, ativos, onReload }) {
    const [showForm, setShowForm] = useState(false)
    const [form, setForm]         = useState(FORM_ATIVO_VAZIO)
    const [saving, setSaving]     = useState(false)
    const [editando, setEditando] = useState(null)

    async function salvarAtivo() {
        if (!form.pilar_id || !form.ticker) return
        setSaving(true)
        const payload = {
            pilar_id:         form.pilar_id,
            ticker:           form.ticker.toUpperCase().trim(),
            nome:             form.nome.trim() || null,
            segmento:         form.segmento.trim() || null,
            pvp_ref:          parseFloat(form.pvp_ref) || null,
            vpa_ref:          parseFloat(form.vpa_ref) || null,
            dy_ref:           parseFloat(form.dy_ref) || null,
            peso_alvo_pilar:  parseFloat(form.peso_alvo_pilar) || null,
            contexto_tese:    form.contexto_tese.trim() || null,
            status:           form.status,
        }
        if (editando) {
            await supabase.from('inv_ativos').update(payload).eq('id', editando.id)
        } else {
            await supabase.from('inv_ativos').insert(payload)
        }
        setForm(FORM_ATIVO_VAZIO)
        setShowForm(false)
        setEditando(null)
        setSaving(false)
        onReload()
    }

    async function toggleStatus(ativo) {
        const novoStatus = ativo.status === 'Ativo' ? 'Observação' : 'Ativo'
        await supabase.from('inv_ativos').update({ status: novoStatus }).eq('id', ativo.id)
        onReload()
    }

    function iniciarEdicao(ativo) {
        setForm({ ...FORM_ATIVO_VAZIO, ...ativo, pvp_ref: ativo.pvp_ref || '', vpa_ref: ativo.vpa_ref || '', dy_ref: ativo.dy_ref || '', peso_alvo_pilar: ativo.peso_alvo_pilar || '' })
        setEditando(ativo)
        setShowForm(true)
    }

    return (
        <div className="p-8 max-w-[900px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-[15px] font-semibold text-text-primary m-0">Estratégia e Ativos Elegíveis</h2>
                    <p className="text-[12px] text-text-tertiary m-0 mt-0.5">Cadastre os ativos que fazem parte da sua estratégia de alocação.</p>
                </div>
                <button onClick={() => { setForm(FORM_ATIVO_VAZIO); setEditando(null); setShowForm(true) }}
                    className="text-[13px] px-4 py-2 bg-accent text-white rounded-lg cursor-pointer border-0">
                    + Novo ativo
                </button>
            </div>

            {/* Resumo dos pilares */}
            <div className="grid grid-cols-4 gap-3">
                {pilares.map(p => {
                    const cor = getCor(p.nome)
                    const count = ativos.filter(a => a.pilar_id === p.id && a.status === 'Ativo').length
                    return (
                        <div key={p.id} className="p-3 rounded-xl border" style={{ background: cor.bg, borderColor: cor.border }}>
                            <p className="text-[11px] font-semibold m-0" style={{ color: cor.text }}>{p.nome}</p>
                            <p className="text-[20px] font-bold text-text-primary m-0">{p.peso_alvo}%</p>
                            <p className="text-[11px] text-text-tertiary m-0">{count} ativo{count !== 1 ? 's' : ''}</p>
                        </div>
                    )
                })}
            </div>

            {/* Lista de ativos por pilar */}
            {pilares.map(pilar => {
                const ativosP = ativos.filter(a => a.pilar_id === pilar.id)
                return (
                    <div key={pilar.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-border flex items-center gap-2" style={{ background: getCor(pilar.nome).bg }}>
                            <span className="text-[13px] font-semibold" style={{ color: getCor(pilar.nome).text }}>{pilar.nome}</span>
                            <span className="text-[11px] text-text-tertiary">· alvo {pilar.peso_alvo}%</span>
                        </div>
                        {ativosP.length === 0 ? (
                            <p className="text-[12px] text-text-tertiary px-4 py-3 m-0">Nenhum ativo cadastrado neste pilar.</p>
                        ) : (
                            <div className="divide-y divide-border">
                                {ativosP.map(a => (
                                    <div key={a.id} className="flex items-start justify-between px-4 py-3 hover:bg-bg/50 group">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[13px] font-semibold text-text-primary">{a.ticker}</span>
                                                {a.nome && <span className="text-[11px] text-text-tertiary">{a.nome}</span>}
                                                {a.status === 'Observação' && <span className="text-[10px] text-[#D97706] bg-[#FFFBEB] border border-[#D97706]/30 px-1.5 rounded">👁 Observação</span>}
                                                {a.status === 'Descontinuado' && <span className="text-[10px] text-text-tertiary bg-bg border border-border px-1.5 rounded">Descontinuado</span>}
                                            </div>
                                            <div className="flex gap-3 text-[11px] text-text-tertiary">
                                                {a.pvp_ref && <span>P/VP ref: {a.pvp_ref}</span>}
                                                {a.dy_ref  && <span>DY ref: {a.dy_ref}%</span>}
                                                {a.peso_alvo_pilar && <span>Peso no pilar: {a.peso_alvo_pilar}%</span>}
                                                {a.segmento && <span>{a.segmento}</span>}
                                            </div>
                                            {a.contexto_tese && (
                                                <p className="text-[11px] text-text-tertiary m-0 mt-1 italic leading-snug line-clamp-2">{a.contexto_tese}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-3">
                                            <button onClick={() => iniciarEdicao(a)}
                                                className="text-[11px] text-text-tertiary hover:text-text-primary cursor-pointer bg-transparent border-0 px-2 py-1 rounded hover:bg-bg">
                                                editar
                                            </button>
                                            <button onClick={() => toggleStatus(a)}
                                                className="text-[11px] text-[#D97706] hover:underline cursor-pointer bg-transparent border-0 px-2 py-1">
                                                {a.status === 'Observação' ? 'ativar' : 'observação'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Modal novo/editar ativo */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto p-6">
                        <h3 className="text-[15px] font-semibold text-text-primary m-0 mb-4">
                            {editando ? `Editar ${editando.ticker}` : 'Cadastrar ativo elegível'}
                        </h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Pilar *</label>
                                    <select value={form.pilar_id} onChange={e => setForm(f => ({ ...f, pilar_id: e.target.value }))}
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary">
                                        <option value="">Selecionar...</option>
                                        {pilares.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Ticker *</label>
                                    <input type="text" value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                                        placeholder="Ex: HSML11"
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary uppercase" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Nome</label>
                                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    placeholder="Ex: HSI Malls"
                                    className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Segmento</label>
                                    <input type="text" value={form.segmento} onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))}
                                        placeholder="Ex: Shoppings"
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Peso-alvo no pilar (%)</label>
                                    <input type="number" value={form.peso_alvo_pilar} onChange={e => setForm(f => ({ ...f, peso_alvo_pilar: e.target.value }))}
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">P/VP referência</label>
                                    <input type="number" step="0.01" value={form.pvp_ref} onChange={e => setForm(f => ({ ...f, pvp_ref: e.target.value }))}
                                        placeholder="Ex: 0.87"
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">VPA referência (R$)</label>
                                    <input type="number" step="0.01" value={form.vpa_ref} onChange={e => setForm(f => ({ ...f, vpa_ref: e.target.value }))}
                                        placeholder="Ex: 103.65"
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">DY referência (%)</label>
                                    <input type="number" step="0.1" value={form.dy_ref} onChange={e => setForm(f => ({ ...f, dy_ref: e.target.value }))}
                                        placeholder="Ex: 11.0"
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                                </div>
                                <div>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Status</label>
                                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary">
                                        <option value="Ativo">Ativo</option>
                                        <option value="Observação">Observação</option>
                                        <option value="Descontinuado">Descontinuado</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Contexto / Tese</label>
                                <textarea value={form.contexto_tese} onChange={e => setForm(f => ({ ...f, contexto_tese: e.target.value }))}
                                    placeholder="Por que este ativo está na carteira? Qual a tese de investimento?"
                                    rows={3}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-lg px-4 py-2 text-[13px] cursor-pointer bg-surface text-text-secondary">Cancelar</button>
                            <button onClick={salvarAtivo} disabled={saving || !form.pilar_id || !form.ticker}
                                className="flex-1 bg-accent text-white rounded-lg px-4 py-2 text-[13px] cursor-pointer border-0 disabled:opacity-50">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
    { id: 'carteira',  label: '📊 Carteira' },
    { id: 'analisar',  label: '🔍 Analisar' },
    { id: 'registrar', label: '✏️ Registrar' },
    { id: 'historico', label: '📋 Histórico' },
    { id: 'estrategia',label: '⚙️ Estratégia' },
]

export default function InvestimentosPage() {
    const [tab, setTab]           = useState('carteira')
    const [loading, setLoading]   = useState(true)
    const [pilares, setPilares]   = useState([])
    const [ativos, setAtivos]     = useState([])
    const [operacoes, setOperacoes] = useState([])

    useEffect(() => { carregar() }, [])

    async function carregar() {
        const [{ data: pil }, { data: ati }, { data: ops }] = await Promise.all([
            supabase.from('inv_pilares').select('*').order('ordem'),
            supabase.from('inv_ativos').select('*').order('ticker'),
            supabase.from('inv_operacoes').select('*').order('data', { ascending: false }),
        ])
        setPilares(pil || [])
        setAtivos(ati || [])
        setOperacoes(ops || [])
        setLoading(false)
    }

    function handleNovaOp(op) {
        if (op) setOperacoes(prev => [op, ...prev])
    }

    if (loading) return (
        <div className="p-8 grid grid-cols-2 gap-4 max-w-[900px] mx-auto">
            {Array(4).fill(0).map((_, i) => <div key={i} className="h-40 bg-surface border border-border rounded-xl animate-pulse" />)}
        </div>
    )

    return (
        <div className="flex flex-col min-h-0">
            {/* Resumo fixo */}
            <ResumoTopo operacoes={operacoes} pilares={pilares} ativos={ativos} />

            {/* Tabs */}
            <div className="border-b border-border px-8 bg-bg/50">
                <div className="flex gap-0.5 -mb-px">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={[
                                'text-[12px] font-medium px-3 py-2 border-b-2 cursor-pointer bg-transparent transition-colors whitespace-nowrap',
                                tab === t.id
                                    ? 'text-text-primary border-accent'
                                    : 'text-text-tertiary border-transparent hover:text-text-secondary',
                            ].join(' ')}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conteúdo */}
            {tab === 'carteira'   && <TabCarteira   operacoes={operacoes} pilares={pilares} ativos={ativos} />}
            {tab === 'analisar'   && <TabAnalisar   ativos={ativos} pilares={pilares} />}
            {tab === 'registrar'  && <TabRegistrar  ativos={ativos} pilares={pilares} onSalvo={handleNovaOp} />}
            {tab === 'historico'  && <TabHistorico  operacoes={operacoes} ativos={ativos} pilares={pilares} />}
            {tab === 'estrategia' && <TabEstrategia pilares={pilares} ativos={ativos} onReload={carregar} />}
        </div>
    )
}
