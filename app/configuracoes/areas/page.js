'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AREA_GROUPS } from '@/app/lib/tarefas'

const GRUPOS = ['Trabalho', 'Pessoal', 'Faculdade']

const ICONES = ['💼','🏠','🎓','📊','⚖️','💰','🏥','💻','📁','🎯','🔧','📋','🌐','🏢','💡']

function showToast(msg, tipo = 'ok') {
    const t = document.createElement('div')
    t.textContent = msg
    t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;color:white;background:${tipo === 'erro' ? '#DC2626' : '#16A34A'};box-shadow:0 4px 12px rgba(0,0,0,.3);animation:fadeIn .2s ease`
    document.body.appendChild(t)
    setTimeout(() => t.remove(), 3000)
}

export default function AreasPage() {
    // Hardcoded areas from tarefas.js
    const hardcoded = AREA_GROUPS.flatMap(g => g.options.map(nome => ({ nome, grupo: g.grupo, hardcoded: true })))

    const [customAreas, setCustomAreas] = useState([])
    const [portfolios, setPortfolios] = useState([])
    const [loading, setLoading] = useState(true)

    // Form states
    const [showFormArea, setShowFormArea] = useState(false)
    const [formArea, setFormArea] = useState({ nome: '', grupo: 'Trabalho', icone: '📁' })
    const [editArea, setEditArea] = useState(null) // {id, nome, grupo, icone}

    const [showFormPortfolio, setShowFormPortfolio] = useState(false)
    const [formPortfolio, setFormPortfolio] = useState({ nome: '', area: '', descricao: '', cor: '#6366F1' })
    const [editPortfolio, setEditPortfolio] = useState(null)

    const [salvando, setSalvando] = useState(false)

    useEffect(() => {
        carregar()
    }, [])

    async function carregar() {
        setLoading(true)
        const [{ data: areas }, { data: ports }] = await Promise.all([
            supabase.from('areas').select('*').order('grupo').order('nome'),
            supabase.from('portfolios').select('*').order('area').order('nome'),
        ])
        setCustomAreas(areas || [])
        setPortfolios(ports || [])
        setLoading(false)
    }

    // ——— AREAS ———
    async function salvarArea(e) {
        e.preventDefault()
        if (!formArea.nome.trim()) return showToast('Nome obrigatório', 'erro')
        setSalvando(true)
        if (editArea) {
            const { error } = await supabase.from('areas').update({
                nome: formArea.nome.trim(),
                grupo: formArea.grupo,
                icone: formArea.icone,
            }).eq('id', editArea.id)
            if (error) { showToast(error.message, 'erro'); setSalvando(false); return }
            showToast('Área atualizada!')
        } else {
            const { error } = await supabase.from('areas').insert({
                nome: formArea.nome.trim(),
                grupo: formArea.grupo,
                icone: formArea.icone,
            })
            if (error) { showToast(error.message, 'erro'); setSalvando(false); return }
            showToast('Área criada!')
        }
        setSalvando(false)
        setShowFormArea(false)
        setEditArea(null)
        setFormArea({ nome: '', grupo: 'Trabalho', icone: '📁' })
        carregar()
    }

    async function deletarArea(id) {
        if (!confirm('Deletar área? As tarefas vinculadas não serão apagadas.')) return
        const { error } = await supabase.from('areas').delete().eq('id', id)
        if (error) { showToast(error.message, 'erro'); return }
        showToast('Área removida!')
        carregar()
    }

    function iniciarEditArea(area) {
        setEditArea(area)
        setFormArea({ nome: area.nome, grupo: area.grupo, icone: area.icone || '📁' })
        setShowFormArea(true)
    }

    // ——— PORTFOLIOS ———
    async function salvarPortfolio(e) {
        e.preventDefault()
        if (!formPortfolio.nome.trim()) return showToast('Nome obrigatório', 'erro')
        setSalvando(true)
        if (editPortfolio) {
            const { error } = await supabase.from('portfolios').update({
                nome: formPortfolio.nome.trim(),
                area: formPortfolio.area || null,
                descricao: formPortfolio.descricao.trim() || null,
                cor: formPortfolio.cor,
            }).eq('id', editPortfolio.id)
            if (error) { showToast(error.message, 'erro'); setSalvando(false); return }
            showToast('Portfólio atualizado!')
        } else {
            const { error } = await supabase.from('portfolios').insert({
                nome: formPortfolio.nome.trim(),
                area: formPortfolio.area || null,
                descricao: formPortfolio.descricao.trim() || null,
                cor: formPortfolio.cor,
            })
            if (error) { showToast(error.message, 'erro'); setSalvando(false); return }
            showToast('Portfólio criado!')
        }
        setSalvando(false)
        setShowFormPortfolio(false)
        setEditPortfolio(null)
        setFormPortfolio({ nome: '', area: '', descricao: '', cor: '#6366F1' })
        carregar()
    }

    async function deletarPortfolio(id) {
        if (!confirm('Deletar portfólio?')) return
        const { error } = await supabase.from('portfolios').delete().eq('id', id)
        if (error) { showToast(error.message, 'erro'); return }
        showToast('Portfólio removido!')
        carregar()
    }

    function iniciarEditPortfolio(p) {
        setEditPortfolio(p)
        setFormPortfolio({ nome: p.nome, area: p.area || '', descricao: p.descricao || '', cor: p.cor || '#6366F1' })
        setShowFormPortfolio(true)
    }

    const todasAreas = AREA_GROUPS.flatMap(g => g.options)
    const CORES = ['#6366F1','#8B5CF6','#EC4899','#EF4444','#F97316','#EAB308','#22C55E','#14B8A6','#0EA5E9','#64748B']

    const lbl = 'block text-[11px] text-text-tertiary uppercase tracking-wide mb-1'
    const inp = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-surface text-text-primary outline-none focus:border-text-tertiary transition-colors [color-scheme:dark]'

    // Group custom areas by grupo
    const areasPorGrupo = GRUPOS.reduce((acc, g) => {
        acc[g] = customAreas.filter(a => a.grupo === g)
        return acc
    }, {})

    return (
        <div className="p-8 max-w-[860px] mx-auto text-text-primary">
            <h2 className="text-[16px] font-semibold text-text-primary mb-1">Configurações</h2>
            <p className="text-[12px] text-text-tertiary mb-8">Gerencie áreas e portfólios do sistema.</p>

            {/* ——— SEÇÃO ÁREAS ——— */}
            <section className="mb-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-[14px] font-semibold m-0">Áreas</h3>
                        <p className="text-[11px] text-text-tertiary mt-0.5">Áreas padrão são fixas. Você pode adicionar áreas personalizadas.</p>
                    </div>
                    <button
                        onClick={() => { setEditArea(null); setFormArea({ nome: '', grupo: 'Trabalho', icone: '📁' }); setShowFormArea(true) }}
                        className="px-3 py-1.5 text-[12px] font-medium bg-accent text-bg rounded-lg border-0 cursor-pointer"
                    >
                        + Nova Área
                    </button>
                </div>

                {/* Formulário de área */}
                {showFormArea && (
                    <form onSubmit={salvarArea} className="bg-surface border border-accent/30 rounded-xl p-4 mb-4 space-y-3">
                        <p className="text-[12px] font-medium text-text-primary m-0">{editArea ? 'Editar Área' : 'Nova Área'}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Nome *</label>
                                <input value={formArea.nome} onChange={e => setFormArea(f => ({...f, nome: e.target.value}))} className={inp} placeholder="Nome da área" autoFocus />
                            </div>
                            <div>
                                <label className={lbl}>Grupo</label>
                                <select value={formArea.grupo} onChange={e => setFormArea(f => ({...f, grupo: e.target.value}))} className={inp}>
                                    {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={lbl}>Ícone</label>
                            <div className="flex flex-wrap gap-1.5">
                                {ICONES.map(ic => (
                                    <button key={ic} type="button" onClick={() => setFormArea(f => ({...f, icone: ic}))}
                                        className={`w-8 h-8 text-[16px] rounded cursor-pointer border transition-colors ${formArea.icone === ic ? 'border-accent bg-accent/15' : 'border-border bg-transparent'}`}
                                    >{ic}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                            <button type="button" onClick={() => { setShowFormArea(false); setEditArea(null) }} className="px-3 py-1.5 text-[12px] text-text-secondary border border-border rounded-lg cursor-pointer bg-transparent">Cancelar</button>
                            <button type="submit" disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium bg-accent text-bg rounded-lg border-0 cursor-pointer disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                    </form>
                )}

                {/* Áreas hardcoded (somente leitura) */}
                <div className="mb-4">
                    <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Áreas padrão (fixas)</p>
                    <div className="grid grid-cols-1 gap-2">
                        {AREA_GROUPS.map(g => (
                            <div key={g.grupo}>
                                <p className="text-[10px] text-text-tertiary font-medium mb-1.5">{g.grupo}</p>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {g.options.map(a => (
                                        <span key={a} className="px-2.5 py-1 text-[11px] bg-bg border border-border rounded-full text-text-secondary">{a}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Áreas customizadas */}
                {customAreas.length > 0 && (
                    <div>
                        <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Áreas personalizadas</p>
                        <div className="space-y-2">
                            {GRUPOS.map(g => areasPorGrupo[g].length > 0 && (
                                <div key={g}>
                                    <p className="text-[10px] text-text-tertiary font-medium mb-1.5">{g}</p>
                                    {areasPorGrupo[g].map(a => (
                                        <div key={a.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2 mb-1.5">
                                            <span className="text-[13px] text-text-primary">{a.icone} {a.nome}</span>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => iniciarEditArea(a)} className="text-[11px] text-text-tertiary hover:text-accent border border-border px-2 py-0.5 rounded cursor-pointer bg-transparent transition-colors">Editar</button>
                                                <button onClick={() => deletarArea(a.id)} className="text-[11px] text-text-tertiary hover:text-priority-urgent border border-border px-2 py-0.5 rounded cursor-pointer bg-transparent transition-colors">Excluir</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {customAreas.length === 0 && !loading && (
                    <p className="text-[12px] text-text-tertiary italic">Nenhuma área personalizada ainda.</p>
                )}
            </section>

            {/* ——— SEÇÃO PORTFÓLIOS ——— */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-[14px] font-semibold m-0">Portfólios</h3>
                        <p className="text-[11px] text-text-tertiary mt-0.5">Agrupamentos de tarefas por projeto ou tema.</p>
                    </div>
                    <button
                        onClick={() => { setEditPortfolio(null); setFormPortfolio({ nome: '', area: '', descricao: '', cor: '#6366F1' }); setShowFormPortfolio(true) }}
                        className="px-3 py-1.5 text-[12px] font-medium bg-accent text-bg rounded-lg border-0 cursor-pointer"
                    >
                        + Novo Portfólio
                    </button>
                </div>

                {showFormPortfolio && (
                    <form onSubmit={salvarPortfolio} className="bg-surface border border-accent/30 rounded-xl p-4 mb-4 space-y-3">
                        <p className="text-[12px] font-medium text-text-primary m-0">{editPortfolio ? 'Editar Portfólio' : 'Novo Portfólio'}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Nome *</label>
                                <input value={formPortfolio.nome} onChange={e => setFormPortfolio(f => ({...f, nome: e.target.value}))} className={inp} placeholder="Nome do portfólio" autoFocus />
                            </div>
                            <div>
                                <label className={lbl}>Área</label>
                                <select value={formPortfolio.area} onChange={e => setFormPortfolio(f => ({...f, area: e.target.value}))} className={inp}>
                                    <option value="">Sem área</option>
                                    {AREA_GROUPS.map(g => (
                                        <optgroup key={g.grupo} label={g.grupo}>
                                            {g.options.map(a => <option key={a} value={a}>{a}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={lbl}>Descrição</label>
                            <input value={formPortfolio.descricao} onChange={e => setFormPortfolio(f => ({...f, descricao: e.target.value}))} className={inp} placeholder="Opcional" />
                        </div>
                        <div>
                            <label className={lbl}>Cor</label>
                            <div className="flex gap-2">
                                {CORES.map(c => (
                                    <button key={c} type="button" onClick={() => setFormPortfolio(f => ({...f, cor: c}))}
                                        className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-all ${formPortfolio.cor === c ? 'border-text-primary scale-110' : 'border-transparent'}`}
                                        style={{backgroundColor: c}}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                            <button type="button" onClick={() => { setShowFormPortfolio(false); setEditPortfolio(null) }} className="px-3 py-1.5 text-[12px] text-text-secondary border border-border rounded-lg cursor-pointer bg-transparent">Cancelar</button>
                            <button type="submit" disabled={salvando} className="px-4 py-1.5 text-[12px] font-medium bg-accent text-bg rounded-lg border-0 cursor-pointer disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                    </form>
                )}

                {loading && <p className="text-[12px] text-text-tertiary">Carregando...</p>}

                {!loading && portfolios.length === 0 && (
                    <p className="text-[12px] text-text-tertiary italic">Nenhum portfólio ainda. Crie o primeiro acima ou pelo modal "Nova".</p>
                )}

                {portfolios.length > 0 && (
                    <div className="space-y-2">
                        {portfolios.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: p.cor || '#6366F1'}} />
                                    <div>
                                        <p className="text-[13px] font-medium text-text-primary m-0">{p.nome}</p>
                                        {(p.area || p.descricao) && (
                                            <p className="text-[11px] text-text-tertiary m-0">{[p.area, p.descricao].filter(Boolean).join(' · ')}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => iniciarEditPortfolio(p)} className="text-[11px] text-text-tertiary hover:text-accent border border-border px-2 py-0.5 rounded cursor-pointer bg-transparent transition-colors">Editar</button>
                                    <button onClick={() => deletarPortfolio(p.id)} className="text-[11px] text-text-tertiary hover:text-priority-urgent border border-border px-2 py-0.5 rounded cursor-pointer bg-transparent transition-colors">Excluir</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
