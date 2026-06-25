'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AREA_GROUPS, PRIORIDADE_OPTIONS, FREQUENCIA_OPTIONS, DIA_SEMANA_OPTIONS } from '@/app/lib/tarefas'

const INITIAL_TAREFA = {
    nome: '', area: '', projeto: '', portfolio: '',
    prioridade: 'Média', frequencia: 'Projeto',
    dia_semana: '', tempo_estimado: '', prazo: '', notas: '',
}

const INITIAL_PORTFOLIO = {
    nome: '', area: '', descricao: '', cor: '#6366F1',
}

const TEMPLATES = [
    { label: 'Relatório SPF/PGE', area: 'Relatórios SPF & PGE', projeto: 'Relatórios SPF & PGE', prioridade: 'Alta', frequencia: 'Projeto', tempo_estimado: '3h' },
    { label: 'Prospecção Pública', area: 'Prospecção Pública', projeto: 'Prospecção Pública', prioridade: 'Alta', frequencia: 'Projeto', tempo_estimado: '2h' },
    { label: 'Treino', area: 'Saúde & Bem-estar', projeto: 'Saúde & Bem-estar', prioridade: 'Média', frequencia: 'Semanal', tempo_estimado: '1h30min' },
    { label: 'Estudo OAB', area: 'OAB — Preparação', projeto: 'OAB — Preparação', prioridade: 'Alta', frequencia: 'Diária', tempo_estimado: '2h' },
    { label: 'SETDIG / CRC', area: 'SETDIG / CRC', projeto: 'SETDIG / CRC', prioridade: 'Média', frequencia: 'Projeto', tempo_estimado: '1h' },
    { label: 'Petra', area: 'Petra', projeto: 'Petra', prioridade: 'Alta', frequencia: 'Projeto', tempo_estimado: '2h' },
]

const CORES_PORTFOLIO = ['#6366F1','#8B5CF6','#EC4899','#EF4444','#F97316','#EAB308','#22C55E','#14B8A6','#0EA5E9','#64748B']

function prazoShortcut(dias) {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    return d.toISOString().slice(0, 10)
}

const lbl = 'block text-[11px] text-text-tertiary uppercase tracking-wide mb-1'
const inp = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-surface text-text-primary outline-none focus:border-text-tertiary transition-colors [color-scheme:dark]'

export default function ModalNovaTarefa({ onClose, onSalvar, defaultValues }) {
    const [tipo, setTipo] = useState('tarefa') // 'tarefa' | 'portfolio'
    const [form, setForm] = useState(defaultValues ? { ...INITIAL_TAREFA, ...defaultValues } : INITIAL_TAREFA)
    const [formPortfolio, setFormPortfolio] = useState(INITIAL_PORTFOLIO)
    const [portfolios, setPortfolios] = useState([])
    const [salvando, setSalvando] = useState(false)
    const [erros, setErros] = useState({})
    const [sucesso, setSucesso] = useState(false)
    const [sincronizarCalendario, setSincronizarCalendario] = useState(false)
    const [calendarConnected, setCalendarConnected] = useState(false)

    function set(f, v) { setForm(p => ({ ...p, [f]: v })) }
    function setP(f, v) { setFormPortfolio(p => ({ ...p, [f]: v })) }

    useEffect(() => {
        // Load portfolios for dropdown
        supabase.from('portfolios').select('*').order('nome')
            .then(({ data }) => setPortfolios(data || []))
            .catch(() => {})

        // Check calendar connection
        fetch('/api/calendar/status')
            .then(r => r.json())
            .then(d => {
                setCalendarConnected(d.connected)
                if (d.connected) setSincronizarCalendario(true)
            })
            .catch(() => {})
    }, [])

    async function handleSalvarTarefa(e) {
        e.preventDefault()
        if (!form.nome.trim()) { setErros({ nome: 'Nome é obrigatório' }); return }
        setSalvando(true); setErros({})

        const payload = {
            nome: form.nome.trim(),
            area: form.area || null,
            projeto: form.projeto.trim() || null,
            portfolio: form.portfolio.trim() || null,
            prioridade: form.prioridade || null,
            frequencia: form.frequencia || null,
            dia_semana: form.frequencia === 'Semanal' ? (form.dia_semana || null) : null,
            tempo_estimado: form.tempo_estimado.trim() || null,
            prazo: form.prazo || null,
            notas: form.notas.trim() || null,
            status: 'Não iniciada',
        }

        const { data, error } = await supabase.from('tarefas').insert([payload]).select()
        if (error) { setErros({ global: error.message }); setSalvando(false); return }

        if (sincronizarCalendario && payload.prazo && calendarConnected) {
            try {
                await fetch('/api/calendar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tarefaId: data[0].id, tarefa: { ...payload, id: data[0].id } }),
                })
            } catch {}
        }

        setSucesso(true)
        setSalvando(false)
        setTimeout(() => { onSalvar(data[0]); onClose() }, 1200)
    }

    async function handleSalvarPortfolio(e) {
        e.preventDefault()
        if (!formPortfolio.nome.trim()) { setErros({ nome: 'Nome é obrigatório' }); return }
        setSalvando(true); setErros({})

        const payload = {
            nome: formPortfolio.nome.trim(),
            area: formPortfolio.area || null,
            descricao: formPortfolio.descricao.trim() || null,
            cor: formPortfolio.cor || '#6366F1',
        }

        const { data, error } = await supabase.from('portfolios').insert([payload]).select()
        if (error) { setErros({ global: error.message }); setSalvando(false); return }

        setSucesso(true)
        setSalvando(false)
        setTimeout(() => { onSalvar?.({ _type: 'portfolio', ...data[0] }); onClose() }, 1200)
    }

    // Flatten all areas for dropdown
    const todasAreas = AREA_GROUPS.flatMap(g => g.options)

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-sidebar border border-border rounded-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                    <div className="flex gap-1 bg-bg border border-border rounded-lg p-0.5">
                        {[{v:'tarefa',l:'📋 Tarefa'},{v:'portfolio',l:'📁 Portfólio'}].map(({v,l}) => (
                            <button key={v} type="button" onClick={() => { setTipo(v); setErros({}) }}
                                className={`px-3 py-1 text-[12px] font-medium rounded cursor-pointer border-0 transition-colors ${tipo === v ? 'bg-accent text-bg' : 'bg-transparent text-text-secondary hover:text-text-primary'}`}
                            >{l}</button>
                        ))}
                    </div>
                    <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ——— FORM TAREFA ——— */}
                {tipo === 'tarefa' && (
                    <form onSubmit={handleSalvarTarefa} className="px-5 py-4 space-y-3">
                        {/* Templates rápidos */}
                        <div>
                            <label className={lbl}>Template rápido</label>
                            <div className="flex flex-wrap gap-1.5">
                                {TEMPLATES.map(t => (
                                    <button key={t.label} type="button"
                                        onClick={() => setForm(prev => ({ ...prev, ...t, nome: prev.nome }))}
                                        className="px-2.5 py-1 text-[11px] border border-border rounded-full text-text-tertiary hover:text-text-primary hover:border-text-tertiary bg-transparent cursor-pointer transition-colors"
                                    >{t.label}</button>
                                ))}
                            </div>
                        </div>

                        {/* Portfólio — dropdown se existirem portfolios, senão texto */}
                        <div>
                            <label className={lbl}>Portfólio</label>
                            {portfolios.length > 0 ? (
                                <select value={form.portfolio} onChange={e => set('portfolio', e.target.value)} className={inp}>
                                    <option value="">Nenhum</option>
                                    {portfolios.map(p => (
                                        <option key={p.id} value={p.nome}>{p.nome}{p.area ? ` · ${p.area}` : ''}</option>
                                    ))}
                                </select>
                            ) : (
                                <input value={form.portfolio} onChange={e => set('portfolio', e.target.value)} className={inp} placeholder="ex: Planejamento, Operacional" />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Área</label>
                                <select value={form.area} onChange={e => set('area', e.target.value)} className={inp}>
                                    <option value="">Selecionar...</option>
                                    {AREA_GROUPS.map(g => (
                                        <optgroup key={g.grupo} label={g.grupo}>
                                            {g.options.map(a => <option key={a} value={a}>{a}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>Projeto</label>
                                <input value={form.projeto} onChange={e => set('projeto', e.target.value)} className={inp} placeholder="Nome do projeto" />
                            </div>
                        </div>

                        <div>
                            <label className={lbl}>Nome da Tarefa *</label>
                            <input
                                value={form.nome}
                                onChange={e => {
                                    set('nome', e.target.value)
                                    if (e.target.value.trim()) setErros(p => { const c = {...p}; delete c.nome; return c })
                                }}
                                className={inp}
                                placeholder="Descreva a tarefa..."
                                autoFocus
                            />
                            {erros.nome && <p className="text-[11px] text-priority-urgent mt-1">{erros.nome}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Prioridade</label>
                                <select value={form.prioridade} onChange={e => set('prioridade', e.target.value)} className={inp}>
                                    {PRIORIDADE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={lbl}>Frequência</label>
                                <select value={form.frequencia} onChange={e => set('frequencia', e.target.value)} className={inp}>
                                    {FREQUENCIA_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>

                        {form.frequencia === 'Semanal' && (
                            <div>
                                <label className={lbl}>Dia da semana</label>
                                <select value={form.dia_semana} onChange={e => set('dia_semana', e.target.value)} className={inp}>
                                    <option value="">Selecionar...</option>
                                    {DIA_SEMANA_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Tempo estimado</label>
                                <input value={form.tempo_estimado} onChange={e => set('tempo_estimado', e.target.value)} className={inp} placeholder="ex: 30min, 1h" />
                            </div>
                            <div>
                                <label className={lbl}>Prazo</label>
                                <div className="flex gap-1 mb-1.5">
                                    {[['Hoje', 0], ['Amanhã', 1], ['+7d', 7]].map(([l, d]) => {
                                        const val = prazoShortcut(d)
                                        return (
                                            <button key={l} type="button" onClick={() => set('prazo', val)}
                                                className={`px-2.5 py-0.5 text-[11px] border rounded-full cursor-pointer transition-colors ${form.prazo === val ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-tertiary hover:text-text-primary bg-transparent'}`}
                                            >{l}</button>
                                        )
                                    })}
                                </div>
                                <input type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)} className={inp} />
                            </div>
                        </div>

                        <div>
                            <label className={lbl}>Notas</label>
                            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Observações..." />
                        </div>

                        {calendarConnected && form.prazo && (
                            <label className="flex items-center gap-2 mt-1 cursor-pointer">
                                <input type="checkbox" checked={sincronizarCalendario} onChange={e => setSincronizarCalendario(e.target.checked)} className="accent-accent" />
                                <span className="text-[12px] text-text-secondary">📅 Criar evento no Google Calendar</span>
                            </label>
                        )}

                        {erros.global && <div className="text-[12px] text-priority-urgent mt-3 bg-priority-urgent/10 p-2 rounded">{erros.global}</div>}
                        {sucesso && <p className="text-[12px] text-[#16A34A] bg-[#16A34A]/10 p-2 rounded-md">Tarefa criada!</p>}

                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={onClose} disabled={salvando || sucesso} className="px-3 py-1.5 text-[12px] text-text-secondary bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="submit" disabled={salvando || sucesso} className="px-4 py-1.5 text-[12px] text-bg bg-text-primary hover:bg-text-secondary disabled:opacity-50 border-0 rounded-lg cursor-pointer font-medium transition-colors">
                                {salvando ? 'Salvando...' : 'Criar Tarefa'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ——— FORM PORTFÓLIO ——— */}
                {tipo === 'portfolio' && (
                    <form onSubmit={handleSalvarPortfolio} className="px-5 py-4 space-y-4">
                        <div>
                            <label className={lbl}>Nome do Portfólio *</label>
                            <input
                                value={formPortfolio.nome}
                                onChange={e => setP('nome', e.target.value)}
                                className={inp}
                                placeholder="ex: Contratos, Planejamento Q3"
                                autoFocus
                            />
                            {erros.nome && <p className="text-[11px] text-priority-urgent mt-1">{erros.nome}</p>}
                        </div>

                        <div>
                            <label className={lbl}>Área</label>
                            <select value={formPortfolio.area} onChange={e => setP('area', e.target.value)} className={inp}>
                                <option value="">Sem área</option>
                                {AREA_GROUPS.map(g => (
                                    <optgroup key={g.grupo} label={g.grupo}>
                                        {g.options.map(a => <option key={a} value={a}>{a}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={lbl}>Descrição</label>
                            <textarea
                                value={formPortfolio.descricao}
                                onChange={e => setP('descricao', e.target.value)}
                                rows={2}
                                className={`${inp} resize-none`}
                                placeholder="O que esse portfólio agrupa?"
                            />
                        </div>

                        <div>
                            <label className={lbl}>Cor</label>
                            <div className="flex gap-2 flex-wrap">
                                {CORES_PORTFOLIO.map(c => (
                                    <button key={c} type="button" onClick={() => setP('cor', c)}
                                        className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-all ${formPortfolio.cor === c ? 'border-text-primary scale-110' : 'border-transparent'}`}
                                        style={{backgroundColor: c}}
                                    />
                                ))}
                            </div>
                        </div>

                        {erros.global && <div className="text-[12px] text-priority-urgent bg-priority-urgent/10 p-2 rounded">{erros.global}</div>}
                        {sucesso && <p className="text-[12px] text-[#16A34A] bg-[#16A34A]/10 p-2 rounded-md">Portfólio criado!</p>}

                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={onClose} disabled={salvando || sucesso} className="px-3 py-1.5 text-[12px] text-text-secondary bg-surface border border-border rounded-lg cursor-pointer disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="submit" disabled={salvando || sucesso} className="px-4 py-1.5 text-[12px] text-bg bg-accent border-0 rounded-lg cursor-pointer font-medium disabled:opacity-50">
                                {salvando ? 'Criando...' : 'Criar Portfólio'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
