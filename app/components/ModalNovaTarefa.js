'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AREA_GROUPS, PRIORIDADE_OPTIONS, FREQUENCIA_OPTIONS, DIA_SEMANA_OPTIONS } from '@/app/lib/tarefas'

const INITIAL = {
    nome: '', area: '', projeto: '', portfolio: '',
    prioridade: 'Média', frequencia: 'Projeto',
    dia_semana: '', tempo_estimado: '', prazo: '', notas: '',
}

const TEMPLATES = [
    { label: 'Relatório SPF/PGE', area: 'Relatórios SPF & PGE', projeto: 'Relatórios SPF & PGE', prioridade: 'Alta', frequencia: 'Projeto', tempo_estimado: '3h' },
    { label: 'Prospecção Pública', area: 'Prospecção Pública', projeto: 'Prospecção Pública', prioridade: 'Alta', frequencia: 'Projeto', tempo_estimado: '2h' },
    { label: 'Treino', area: 'Saúde & Bem-estar', projeto: 'Saúde & Bem-estar', prioridade: 'Média', frequencia: 'Semanal', tempo_estimado: '1h30min' },
    { label: 'Estudo OAB', area: 'OAB — Preparação', projeto: 'OAB — Preparação', prioridade: 'Alta', frequencia: 'Diária', tempo_estimado: '2h' },
    { label: 'SETDIG / CRC', area: 'SETDIG / CRC', projeto: 'SETDIG / CRC', prioridade: 'Média', frequencia: 'Projeto', tempo_estimado: '1h' },
    { label: 'Petra', area: 'Petra', projeto: 'Petra', prioridade: 'Alta', frequencia: 'Projeto', tempo_estimado: '2h' },
]

function prazoShortcut(dias) {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    return d.toISOString().slice(0, 10)
}

const lbl = 'block text-[11px] text-text-tertiary uppercase tracking-wide mb-1'
const inp = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-surface text-text-primary outline-none focus:border-text-tertiary transition-colors [color-scheme:dark]'

export default function ModalNovaTarefa({ onClose, onSalvar, defaultValues }) {
    const [form, setForm]     = useState(defaultValues ? { ...INITIAL, ...defaultValues } : INITIAL)
    const [salvando, setSalvando] = useState(false)
    const [erros, setErros]   = useState({})

    function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

    const [sucesso, setSucesso] = useState(false)
    const [sincronizarCalendario, setSincronizarCalendario] = useState(false)
    const [calendarConnected, setCalendarConnected] = useState(false)

    useEffect(() => {
        fetch('/api/calendar/status')
            .then(r => r.json())
            .then(d => {
                setCalendarConnected(d.connected)
                if (d.connected) setSincronizarCalendario(true)
            })
            .catch(() => {})
    }, [])

    async function handleSalvar(e) {
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

        console.log('Salvando tarefa:', payload)

        const { data, error } = await supabase.from('tarefas').insert([payload]).select()
        console.log('Resultado:', data, error)

        if (error) { 
            setErros({ global: error.message })
            setSalvando(false)
            return 
        }

        // Google Calendar — cria evento se conectado e tem prazo
        if (sincronizarCalendario && payload.prazo && calendarConnected) {
            try {
                await fetch('/api/calendar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tarefaId: data[0].id,
                        tarefa: { ...payload, id: data[0].id },
                    }),
                })
            } catch (err) { console.error('[calendar] Erro:', err) }
        }

        setSucesso(true)
        setSalvando(false)

        setTimeout(() => {
            onSalvar(data[0])
            onClose()
        }, 1200)
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-sidebar border border-border rounded-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                    <h2 className="text-[14px] font-semibold text-text-primary m-0">Nova Tarefa</h2>
                    <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSalvar} className="px-5 py-4 space-y-3">
                    {/* Templates rápidos */}
                    <div>
                        <label className={lbl}>Template rápido</label>
                        <div className="flex flex-wrap gap-1.5">
                            {TEMPLATES.map(t => (
                                <button
                                    key={t.label}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, ...t, nome: prev.nome }))}
                                    className="px-2.5 py-1 text-[11px] border border-border rounded-full text-text-tertiary hover:text-text-primary hover:border-text-tertiary bg-transparent cursor-pointer transition-colors"
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={lbl}>Portfólio</label>
                        <input value={form.portfolio} onChange={e => set('portfolio', e.target.value)} className={inp} placeholder="ex: Planejamento, Operacional" autoFocus />
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
                                if (e.target.value.trim()) {
                                    setErros(p => {
                                        const c = { ...p }
                                        delete c.nome
                                        return c
                                    })
                                }
                            }} 
                            className={inp} 
                            placeholder="Descreva a tarefa..." 
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
                                {[['Hoje', 0], ['Amanhã', 1], ['+7 dias', 7]].map(([l, d]) => {
                                    const val = prazoShortcut(d)
                                    return (
                                        <button key={l} type="button" onClick={() => set('prazo', val)}
                                            className={`px-2.5 py-0.5 text-[11px] border rounded-full cursor-pointer transition-colors ${
                                                form.prazo === val
                                                    ? 'border-accent text-accent bg-accent/10'
                                                    : 'border-border text-text-tertiary hover:text-text-primary bg-transparent'
                                            }`}
                                        >{l}</button>
                                    )
                                })}
                            </div>
                            <input type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)} className={inp} />
                        </div>
                    </div>

                    <div>
                        <label className={lbl}>Notas</label>
                        <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3} className={`${inp} resize-none`} placeholder="Observações..." />
                    </div>

                    {calendarConnected && form.prazo && (
                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={sincronizarCalendario}
                                onChange={e => setSincronizarCalendario(e.target.checked)}
                                className="accent-accent"
                            />
                            <span className="text-[12px] text-text-secondary">
                                📅 Criar evento no Google Calendar
                            </span>
                        </label>
                    )}

                    {erros.global && <div className="text-[12px] text-priority-urgent mt-3 bg-priority-urgent/10 p-2 rounded">{erros.global}</div>}
                    {sucesso && <p className="text-[12px] text-[#16A34A] bg-[#16A34A]/10 p-2 rounded-md">Tarefa criada com sucesso!</p>}

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} disabled={salvando || sucesso} className="px-3 py-1.5 text-[12px] text-text-secondary bg-surface hover:bg-surface-hover border border-border rounded-lg cursor-pointer transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={salvando || sucesso} className="px-4 py-1.5 text-[12px] text-bg bg-text-primary hover:bg-text-secondary disabled:opacity-50 border-0 rounded-lg cursor-pointer font-medium transition-colors">
                            {salvando ? 'Salvando...' : 'Criar tarefa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
