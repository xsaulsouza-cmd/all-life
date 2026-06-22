'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const REFEICOES = [
    { key: 'cafe',       label: 'Café da manhã', icon: '☕' },
    { key: 'almoco',     label: 'Almoço',        icon: '🍽️' },
    { key: 'lanche',     label: 'Lanche',        icon: '🍎' },
    { key: 'jantar',     label: 'Jantar',        icon: '🌙' },
    { key: 'pre_treino', label: 'Pré-treino',    icon: '⚡' },
    { key: 'pos_treino', label: 'Pós-treino',    icon: '💪' },
]

const FORM_VAZIO = { refeicao: 'cafe', descricao: '', calorias: '', proteina: '', carbo: '', gordura: '' }

function MiniBar({ valor, meta, cor = '#8B8BF9' }) {
    const pct = meta ? Math.min(100, Math.round((valor / meta) * 100)) : 0
    return (
        <div className="flex-1">
            <div className="flex justify-between text-[11px] mb-1 text-text-tertiary">
                <span>{valor || 0}<span className="opacity-70">/{meta}</span></span>
                <span className="font-medium" style={{ color: cor }}>{pct}%</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden border border-border">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor }} />
            </div>
        </div>
    )
}

// ── Autocomplete de alimentos ─────────────────────────────────────────────────
function BuscaAlimento({ value, onChange, onSelect, onSalvarCatalogo }) {
    const [sugestoes, setSugestoes] = useState([])
    const [aberto, setAberto]       = useState(false)
    const [buscando, setBuscando]   = useState(false)
    const ref = useRef(null)
    const timer = useRef(null)

    useEffect(() => {
        function click(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
        document.addEventListener('mousedown', click)
        return () => document.removeEventListener('mousedown', click)
    }, [])

    function handleChange(e) {
        const val = e.target.value
        onChange(val)
        clearTimeout(timer.current)
        if (val.length < 2) { setSugestoes([]); setAberto(false); return }
        setBuscando(true)
        timer.current = setTimeout(async () => {
            const { data } = await supabase
                .from('nutricao_alimentos')
                .select('*')
                .ilike('nome', `%${val}%`)
                .limit(8)
            setSugestoes(data || [])
            setAberto(true)
            setBuscando(false)
        }, 250)
    }

    function selecionar(alimento) {
        onSelect(alimento)
        setAberto(false)
        setSugestoes([])
    }

    return (
        <div className="relative" ref={ref}>
            <input
                type="text"
                placeholder="Ex: Frango grelhado, whey protein..."
                value={value}
                onChange={handleChange}
                onFocus={() => sugestoes.length > 0 && setAberto(true)}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary"
                autoFocus
            />
            {buscando && (
                <span className="absolute right-3 top-2.5 text-[11px] text-text-tertiary">buscando...</span>
            )}

            {aberto && sugestoes.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    {sugestoes.map(a => (
                        <button
                            key={a.id}
                            onMouseDown={() => selecionar(a)}
                            className="w-full text-left px-3 py-2.5 hover:bg-bg transition-colors border-b border-border last:border-0 cursor-pointer"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-text-primary">{a.nome}</span>
                                <span className="text-[11px] text-text-tertiary">{a.porcao_desc || (a.porcao_g ? `${a.porcao_g}g` : '')}</span>
                            </div>
                            <div className="flex gap-3 mt-0.5 text-[11px] text-text-tertiary">
                                {a.calorias && <span>🔥 {a.calorias} kcal</span>}
                                {a.proteina && <span>P: {a.proteina}g</span>}
                                {a.carbo    && <span>C: {a.carbo}g</span>}
                                {a.gordura  && <span>G: {a.gordura}g</span>}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Sugerir salvar no catálogo quando não há match exato */}
            {aberto && sugestoes.length === 0 && value.length >= 2 && !buscando && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                        onMouseDown={onSalvarCatalogo}
                        className="w-full text-left px-3 py-2.5 hover:bg-bg cursor-pointer"
                    >
                        <span className="text-[12px] text-accent">+ Salvar "{value}" no catálogo</span>
                        <p className="text-[11px] text-text-tertiary m-0">Preencha os macros e salve para reutilizar depois</p>
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Modal de registro ─────────────────────────────────────────────────────────
function ModalRegistro({ refeicaoInicial, onClose, onSalvo }) {
    const [form, setForm]               = useState({ ...FORM_VAZIO, refeicao: refeicaoInicial || 'cafe' })
    const [salvarCatalogo, setSalvar]   = useState(false)
    const [porcaoDesc, setPorcaoDesc]   = useState('')
    const [saving, setSaving]           = useState(false)

    function preencherAlimento(alimento) {
        setForm(f => ({
            ...f,
            descricao: alimento.nome,
            calorias:  alimento.calorias  || '',
            proteina:  alimento.proteina  || '',
            carbo:     alimento.carbo     || '',
            gordura:   alimento.gordura   || '',
        }))
        setPorcaoDesc(alimento.porcao_desc || '')
    }

    async function salvar() {
        if (!form.descricao.trim()) return
        setSaving(true)
        const hojeIso = new Date().toISOString().split('T')[0]

        // Salva no catálogo se marcado
        if (salvarCatalogo && form.descricao.trim()) {
            await supabase.from('nutricao_alimentos').upsert({
                nome:       form.descricao.trim(),
                porcao_desc: porcaoDesc.trim() || null,
                calorias:   parseFloat(form.calorias) || null,
                proteina:   parseFloat(form.proteina) || null,
                carbo:      parseFloat(form.carbo)    || null,
                gordura:    parseFloat(form.gordura)  || null,
            }, { onConflict: 'nome' })
        }

        const payload = {
            data:      hojeIso,
            refeicao:  form.refeicao,
            descricao: form.descricao.trim(),
            calorias:  parseFloat(form.calorias) || null,
            proteina:  parseFloat(form.proteina) || null,
            carbo:     parseFloat(form.carbo)    || null,
            gordura:   parseFloat(form.gordura)  || null,
        }
        const { data: novo } = await supabase.from('nutricao_registros').insert(payload).select().single()
        onSalvo(novo)
        setSaving(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-[460px] p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-[15px] font-semibold text-text-primary m-0 mb-4">Registrar alimento</h3>

                <div className="space-y-3">
                    <div>
                        <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Refeição</label>
                        <select
                            value={form.refeicao}
                            onChange={e => setForm(f => ({ ...f, refeicao: e.target.value }))}
                            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-surface text-text-primary"
                        >
                            {REFEICOES.map(r => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">
                            Alimento <span className="normal-case text-accent">— busque no catálogo ou escreva novo</span>
                        </label>
                        <BuscaAlimento
                            value={form.descricao}
                            onChange={v => setForm(f => ({ ...f, descricao: v }))}
                            onSelect={preencherAlimento}
                            onSalvarCatalogo={() => setSalvar(true)}
                        />
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Calorias (kcal)</label>
                            <input type="number" value={form.calorias} onChange={e => setForm(f => ({ ...f, calorias: e.target.value }))}
                                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                        </div>
                        <div>
                            <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Proteína (g)</label>
                            <input type="number" value={form.proteina} onChange={e => setForm(f => ({ ...f, proteina: e.target.value }))}
                                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                        </div>
                        <div>
                            <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Carboidratos (g)</label>
                            <input type="number" value={form.carbo} onChange={e => setForm(f => ({ ...f, carbo: e.target.value }))}
                                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                        </div>
                        <div>
                            <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Gordura (g)</label>
                            <input type="number" value={form.gordura} onChange={e => setForm(f => ({ ...f, gordura: e.target.value }))}
                                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                        </div>
                    </div>

                    {/* Salvar no catálogo */}
                    <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-bg cursor-pointer hover:border-accent/40 transition-colors">
                        <input
                            type="checkbox"
                            checked={salvarCatalogo}
                            onChange={e => setSalvar(e.target.checked)}
                            className="accent-accent w-4 h-4"
                        />
                        <div>
                            <span className="text-[13px] text-text-primary">Salvar no catálogo de alimentos</span>
                            <p className="text-[11px] text-text-tertiary m-0">Reutilize com autocomplete nas próximas vezes</p>
                        </div>
                    </label>

                    {salvarCatalogo && (
                        <div>
                            <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Descrição da porção</label>
                            <input
                                type="text"
                                placeholder='Ex: "1 filé médio", "100g", "1 scoop"'
                                value={porcaoDesc}
                                onChange={e => setPorcaoDesc(e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary"
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-2 mt-5">
                    <button onClick={onClose} className="flex-1 border border-border rounded-lg px-4 py-2 text-[13px] text-text-secondary cursor-pointer hover:bg-bg bg-surface">
                        Cancelar
                    </button>
                    <button onClick={salvar} disabled={saving || !form.descricao.trim()} className="flex-1 bg-accent text-white rounded-lg px-4 py-2 text-[13px] cursor-pointer border-0 hover:bg-accent/90 disabled:opacity-50">
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Modal Catálogo ────────────────────────────────────────────────────────────
function ModalCatalogo({ onClose }) {
    const [alimentos, setAlimentos] = useState([])
    const [busca, setBusca]         = useState('')
    const [form, setForm]           = useState({ nome: '', porcao_desc: '', calorias: '', proteina: '', carbo: '', gordura: '' })
    const [showForm, setShowForm]   = useState(false)
    const [saving, setSaving]       = useState(false)

    useEffect(() => { carregarAlimentos() }, [])

    async function carregarAlimentos() {
        const { data } = await supabase.from('nutricao_alimentos').select('*').order('nome')
        setAlimentos(data || [])
    }

    async function salvarAlimento() {
        if (!form.nome.trim()) return
        setSaving(true)
        const { data: novo } = await supabase.from('nutricao_alimentos').insert({
            nome:        form.nome.trim(),
            porcao_desc: form.porcao_desc.trim() || null,
            calorias:    parseFloat(form.calorias) || null,
            proteina:    parseFloat(form.proteina) || null,
            carbo:       parseFloat(form.carbo)    || null,
            gordura:     parseFloat(form.gordura)  || null,
        }).select().single()
        if (novo) setAlimentos(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
        setForm({ nome: '', porcao_desc: '', calorias: '', proteina: '', carbo: '', gordura: '' })
        setShowForm(false)
        setSaving(false)
    }

    async function excluir(id) {
        await supabase.from('nutricao_alimentos').delete().eq('id', id)
        setAlimentos(prev => prev.filter(a => a.id !== id))
    }

    const filtrados = alimentos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase()))

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-[540px] max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <h3 className="text-[15px] font-semibold text-text-primary m-0">📚 Catálogo de alimentos</h3>
                    <button onClick={() => setShowForm(true)} className="text-[12px] px-3 py-1.5 bg-accent text-white rounded-lg cursor-pointer border-0">
                        + Novo
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-border flex-shrink-0">
                    <input
                        type="text"
                        placeholder="Buscar alimento..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary"
                    />
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                    {filtrados.length === 0 && (
                        <p className="text-center text-[13px] text-text-tertiary py-8">
                            {alimentos.length === 0 ? 'Nenhum alimento cadastrado ainda.' : 'Nenhum resultado.'}
                        </p>
                    )}
                    {filtrados.map(a => (
                        <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-bg group">
                            <div>
                                <span className="text-[13px] font-medium text-text-primary">{a.nome}</span>
                                {a.porcao_desc && <span className="text-[11px] text-text-tertiary ml-2">({a.porcao_desc})</span>}
                                <div className="flex gap-2 mt-0.5 text-[11px] text-text-tertiary">
                                    {a.calorias && <span>🔥 {a.calorias} kcal</span>}
                                    {a.proteina && <span>P: {a.proteina}g</span>}
                                    {a.carbo    && <span>C: {a.carbo}g</span>}
                                    {a.gordura  && <span>G: {a.gordura}g</span>}
                                </div>
                            </div>
                            <button onClick={() => excluir(a.id)}
                                className="opacity-0 group-hover:opacity-100 text-[11px] text-[#DC2626] cursor-pointer bg-transparent border-0 p-0 transition-opacity hover:underline">
                                excluir
                            </button>
                        </div>
                    ))}
                </div>

                {showForm && (
                    <div className="border-t border-border px-5 py-4 flex-shrink-0 bg-bg/50">
                        <p className="text-[12px] font-semibold text-text-primary mb-3">Novo alimento</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="col-span-2">
                                <input type="text" placeholder="Nome do alimento *" value={form.nome}
                                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-1.5 text-[13px] bg-surface text-text-primary" autoFocus />
                            </div>
                            <input type="text" placeholder='Porção (ex: "100g", "1 unid")' value={form.porcao_desc}
                                onChange={e => setForm(f => ({ ...f, porcao_desc: e.target.value }))}
                                className="col-span-2 border border-border rounded-lg px-3 py-1.5 text-[13px] bg-surface text-text-primary" />
                            {[['calorias','Kcal'],['proteina','Prot (g)'],['carbo','Carbo (g)'],['gordura','Gord (g)']].map(([k,l]) => (
                                <input key={k} type="number" placeholder={l} value={form[k]}
                                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                                    className="border border-border rounded-lg px-3 py-1.5 text-[13px] bg-surface text-text-primary" />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-lg px-3 py-1.5 text-[12px] text-text-secondary cursor-pointer bg-surface">
                                Cancelar
                            </button>
                            <button onClick={salvarAlimento} disabled={saving || !form.nome.trim()}
                                className="flex-1 bg-accent text-white rounded-lg px-3 py-1.5 text-[12px] cursor-pointer border-0 disabled:opacity-50">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="px-5 py-3 border-t border-border flex-shrink-0">
                    <button onClick={onClose} className="w-full border border-border rounded-lg px-4 py-2 text-[13px] text-text-secondary cursor-pointer hover:bg-bg bg-surface">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function NutricaoPage() {
    const [registros, setRegistros] = useState([])
    const [meta, setMeta]           = useState(null)
    const [loading, setLoading]     = useState(true)
    const [showForm, setShowForm]   = useState(false)
    const [refeicaoModal, setRefeicaoModal] = useState('cafe')
    const [editandoMeta, setEditandoMeta]   = useState(false)
    const [showCatalogo, setShowCatalogo]   = useState(false)
    const [formMeta, setFormMeta]   = useState({ calorias: '', proteina: '', carbo: '', gordura: '' })
    const [dataVis, setDataVis]     = useState(new Date().toISOString().split('T')[0])

    useEffect(() => { carregar() }, [dataVis])

    async function carregar() {
        const [{ data: regs }, { data: metas }] = await Promise.all([
            supabase.from('nutricao_registros').select('*').eq('data', dataVis).order('criada_em'),
            supabase.from('nutricao_metas').select('*').limit(1),
        ])
        setRegistros(regs || [])
        const m = metas?.[0] || null
        setMeta(m)
        if (m) setFormMeta({ calorias: m.calorias || '', proteina: m.proteina || '', carbo: m.carbo || '', gordura: m.gordura || '' })
        setLoading(false)
    }

    function handleSalvo(novo) {
        if (novo) setRegistros(prev => [...prev, novo])
    }

    async function excluir(id) {
        await supabase.from('nutricao_registros').delete().eq('id', id)
        setRegistros(prev => prev.filter(r => r.id !== id))
    }

    async function salvarMeta() {
        const payload = {
            calorias: parseFloat(formMeta.calorias) || null,
            proteina: parseFloat(formMeta.proteina) || null,
            carbo:    parseFloat(formMeta.carbo)    || null,
            gordura:  parseFloat(formMeta.gordura)  || null,
        }
        if (meta?.id) {
            await supabase.from('nutricao_metas').update(payload).eq('id', meta.id)
            setMeta({ ...meta, ...payload })
        } else {
            const { data: novo } = await supabase.from('nutricao_metas').insert(payload).select().single()
            setMeta(novo)
        }
        setEditandoMeta(false)
    }

    const totais = useMemo(() => registros.reduce((acc, r) => ({
        calorias: acc.calorias + (r.calorias || 0),
        proteina: acc.proteina + (r.proteina || 0),
        carbo:    acc.carbo    + (r.carbo    || 0),
        gordura:  acc.gordura  + (r.gordura  || 0),
    }), { calorias: 0, proteina: 0, carbo: 0, gordura: 0 }), [registros])

    const regPorRefeicao = useMemo(() => {
        const map = {}
        REFEICOES.forEach(r => { map[r.key] = [] })
        registros.forEach(r => { if (map[r.refeicao]) map[r.refeicao].push(r) })
        return map
    }, [registros])

    if (loading) return (
        <div className="p-8 space-y-3">
            {Array(6).fill(0).map((_, i) => <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />)}
        </div>
    )

    return (
        <div className="p-8 max-w-[900px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <input
                        type="date" value={dataVis}
                        onChange={e => setDataVis(e.target.value)}
                        className="text-[13px] border border-border rounded-lg px-3 py-1.5 bg-surface text-text-primary cursor-pointer"
                    />
                    <button onClick={() => setDataVis(new Date().toISOString().split('T')[0])}
                        className="text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer bg-transparent border-0">
                        Hoje
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowCatalogo(true)}
                        className="text-[13px] px-3 py-1.5 border border-border rounded-lg text-text-secondary hover:bg-surface cursor-pointer bg-surface-secondary">
                        📚 Catálogo
                    </button>
                    <button onClick={() => setEditandoMeta(true)}
                        className="text-[13px] px-3 py-1.5 border border-border rounded-lg text-text-secondary hover:bg-surface cursor-pointer bg-surface-secondary">
                        ⚙️ Metas
                    </button>
                    <button onClick={() => { setRefeicaoModal('cafe'); setShowForm(true) }}
                        className="text-[13px] px-4 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 cursor-pointer border-0">
                        + Registrar
                    </button>
                </div>
            </div>

            {/* Macros do dia */}
            <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                <h2 className="text-[13px] font-semibold text-text-primary m-0 mb-4">Macros do dia</h2>
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Calorias',     valor: Math.round(totais.calorias), meta: meta?.calorias || 2000, unit: 'kcal', cor: '#8B8BF9' },
                        { label: 'Proteína',     valor: Math.round(totais.proteina), meta: meta?.proteina || 150,  unit: 'g',    cor: '#22C55E' },
                        { label: 'Carboidratos', valor: Math.round(totais.carbo),    meta: meta?.carbo    || 250,  unit: 'g',    cor: '#EAB308' },
                        { label: 'Gordura',      valor: Math.round(totais.gordura),  meta: meta?.gordura  || 65,   unit: 'g',    cor: '#D97706' },
                    ].map(m => (
                        <div key={m.label} className="space-y-1.5">
                            <p className="text-[11px] text-text-tertiary uppercase tracking-wider m-0">{m.label}</p>
                            <p className="text-[20px] font-bold text-text-primary m-0 leading-tight">
                                {m.valor}<span className="text-[11px] font-normal ml-0.5">{m.unit}</span>
                            </p>
                            <MiniBar valor={m.valor} meta={m.meta} cor={m.cor} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Refeições */}
            <div className="space-y-3">
                {REFEICOES.map(ref => {
                    const items = regPorRefeicao[ref.key] || []
                    const calRef = items.reduce((a, r) => a + (r.calorias || 0), 0)
                    return (
                        <div key={ref.key} className="bg-surface border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg/50">
                                <div className="flex items-center gap-2">
                                    <span className="text-[16px]">{ref.icon}</span>
                                    <span className="text-[13px] font-medium text-text-primary">{ref.label}</span>
                                    {items.length > 0 && <span className="text-[11px] text-text-tertiary">· {Math.round(calRef)} kcal</span>}
                                </div>
                                <button
                                    onClick={() => { setRefeicaoModal(ref.key); setShowForm(true) }}
                                    className="text-[11px] text-accent hover:underline cursor-pointer bg-transparent border-0 p-0">
                                    + Adicionar
                                </button>
                            </div>
                            {items.length > 0 && (
                                <div className="divide-y divide-border">
                                    {items.map(reg => (
                                        <div key={reg.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-bg/50 group">
                                            <div>
                                                <span className="text-[13px] text-text-primary">{reg.descricao}</span>
                                                <div className="flex gap-2 mt-0.5">
                                                    {reg.calorias && <span className="text-[11px] text-text-tertiary">{reg.calorias} kcal</span>}
                                                    {reg.proteina && <span className="text-[11px] text-text-tertiary">P: {reg.proteina}g</span>}
                                                    {reg.carbo    && <span className="text-[11px] text-text-tertiary">C: {reg.carbo}g</span>}
                                                    {reg.gordura  && <span className="text-[11px] text-text-tertiary">G: {reg.gordura}g</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => excluir(reg.id)}
                                                className="opacity-0 group-hover:opacity-100 text-[11px] text-[#DC2626] hover:underline cursor-pointer bg-transparent border-0 p-0 transition-opacity">
                                                remover
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {items.length === 0 && (
                                <div className="px-4 py-3 text-[12px] text-text-tertiary">Nenhum registro.</div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Modal Registrar */}
            {showForm && (
                <ModalRegistro
                    refeicaoInicial={refeicaoModal}
                    onClose={() => setShowForm(false)}
                    onSalvo={handleSalvo}
                />
            )}

            {/* Modal Metas */}
            {editandoMeta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditandoMeta(false)} />
                    <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-[380px] p-6">
                        <h3 className="text-[15px] font-semibold text-text-primary m-0 mb-4">Metas nutricionais diárias</h3>
                        <div className="space-y-3">
                            {[
                                { key: 'calorias', label: 'Calorias (kcal)' },
                                { key: 'proteina', label: 'Proteína (g)' },
                                { key: 'carbo',    label: 'Carboidratos (g)' },
                                { key: 'gordura',  label: 'Gordura (g)' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">{f.label}</label>
                                    <input type="number" value={formMeta[f.key]}
                                        onChange={e => setFormMeta(m => ({ ...m, [f.key]: e.target.value }))}
                                        className="w-full border border-border rounded-lg px-3 py-2 text-[13px] bg-bg text-text-primary" />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setEditandoMeta(false)} className="flex-1 border border-border rounded-lg px-4 py-2 text-[13px] text-text-secondary cursor-pointer hover:bg-bg bg-surface">
                                Cancelar
                            </button>
                            <button onClick={salvarMeta} className="flex-1 bg-accent text-white rounded-lg px-4 py-2 text-[13px] cursor-pointer border-0 hover:bg-accent/90">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Catálogo */}
            {showCatalogo && <ModalCatalogo onClose={() => setShowCatalogo(false)} />}
        </div>
    )
}
