'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/app/lib/toast'

const MET = {
    'musculação': { leve: 3.5, moderada: 5.0, intensa: 6.0 },
    'jiu-jitsu':  { leve: 5.0, moderada: 8.0, intensa: 10.0 },
    'pilates':    { leve: 2.8, moderada: 3.5, intensa: 4.5 },
    'corrida':    { leve: 7.0, moderada: 9.0, intensa: 11.0 },
    'outro':      { leve: 4.0, moderada: 6.0, intensa: 8.0 },
}

function calcularCalorias(modalidade, intensidade, duracao_min, peso = 78) {
    const met = MET[modalidade]?.[intensidade] || 5
    return Math.round(met * peso * (duracao_min / 60))
}

const hoje = new Date().toISOString().split('T')[0]

// ——— Sub-forms por tipo de vínculo ———

function FormTreino({ vinculo, tarefa, onSalvo }) {
    const modalidadeInferida = (() => {
        const n = (tarefa.nome || '').toLowerCase()
        if (n.includes('musculação') || n.includes('musculacao') || n.includes('academia')) return 'musculação'
        if (n.includes('jiu') || n.includes('jj')) return 'jiu-jitsu'
        if (n.includes('pilates')) return 'pilates'
        if (n.includes('corrida') || n.includes('correr')) return 'corrida'
        return 'musculação'
    })()

    const duracaoInferida = (() => {
        const t = tarefa.tempo_estimado || ''
        const h = t.match(/(\d+)h/); const m = t.match(/(\d+)min/)
        return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0) || 60
    })()

    const [form, setForm] = useState({
        modalidade: modalidadeInferida,
        data: hoje,
        duracao_min: duracaoInferida,
        intensidade: 'moderada',
        notas: tarefa.nome || '',
    })

    const calorias = calcularCalorias(form.modalidade, form.intensidade, form.duracao_min)

    async function salvar() {
        const { error } = await supabase.from('treinos').insert({
            modalidade: form.modalidade,
            data: form.data,
            duracao_min: parseInt(form.duracao_min),
            intensidade: form.intensidade,
            notas: form.notas,
            calorias_gastas: calorias,
        })
        if (error) { showToast(error.message, 'erro'); return }
        showToast('💪 Treino registrado!')
        onSalvo()
    }

    const inp = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-bg text-text-primary outline-none [color-scheme:dark]'

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] text-text-tertiary uppercase mb-1">Modalidade</label>
                    <select value={form.modalidade} onChange={e => setForm(f => ({...f, modalidade: e.target.value}))} className={inp}>
                        {['musculação','jiu-jitsu','pilates','corrida','outro'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] text-text-tertiary uppercase mb-1">Data</label>
                    <input type="date" value={form.data} onChange={e => setForm(f => ({...f, data: e.target.value}))} className={inp} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] text-text-tertiary uppercase mb-1">Duração (min)</label>
                    <input type="number" value={form.duracao_min} onChange={e => setForm(f => ({...f, duracao_min: e.target.value}))} className={inp} />
                </div>
                <div>
                    <label className="block text-[11px] text-text-tertiary uppercase mb-1">Intensidade</label>
                    <select value={form.intensidade} onChange={e => setForm(f => ({...f, intensidade: e.target.value}))} className={inp}>
                        <option value="leve">Leve</option>
                        <option value="moderada">Moderada</option>
                        <option value="intensa">Intensa</option>
                    </select>
                </div>
            </div>
            <p className="text-[11px] text-text-tertiary">🔥 Estimativa: <strong className="text-orange-400">{calorias} kcal</strong></p>
            <button onClick={salvar} className="w-full py-2 text-[13px] font-semibold bg-accent text-bg rounded-lg border-0 cursor-pointer">
                Registrar treino
            </button>
        </div>
    )
}

function FormMeta({ vinculo, onSalvo }) {
    const [progresso, setProgresso] = useState(50)
    const [loading, setLoading] = useState(false)

    async function salvar() {
        setLoading(true)
        const updates = { progresso }
        if (progresso >= 100) updates.status = 'concluída'
        const { error } = await supabase.from('metas').update(updates).eq('id', vinculo.referencia_id)
        setLoading(false)
        if (error) { showToast(error.message, 'erro'); return }
        showToast('🎯 Meta atualizada!')
        onSalvo()
    }

    return (
        <div className="space-y-3">
            <p className="text-[12px] text-text-secondary truncate">{vinculo.referencia_nome}</p>
            <div>
                <label className="block text-[11px] text-text-tertiary uppercase mb-2">Progresso atual: <strong className="text-accent">{progresso}%</strong></label>
                <input type="range" min="0" max="100" value={progresso} onChange={e => setProgresso(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer" />
                <div className="flex justify-between text-[10px] text-text-tertiary mt-1"><span>0%</span><span>100%</span></div>
            </div>
            <button onClick={salvar} disabled={loading} className="w-full py-2 text-[13px] font-semibold bg-accent text-bg rounded-lg border-0 cursor-pointer disabled:opacity-50">
                Atualizar meta
            </button>
        </div>
    )
}

function FormTransacao({ vinculo, tarefa, onSalvo }) {
    const [form, setForm] = useState({
        descricao: tarefa.nome || '',
        valor: '',
        tipo: 'despesa',
        categoria: tarefa.area || '',
        data: hoje,
    })

    async function salvar() {
        if (!form.valor || isNaN(Number(form.valor))) { showToast('Valor inválido', 'erro'); return }
        const { error } = await supabase.from('transacoes').insert({
            descricao: form.descricao,
            valor: Number(form.valor),
            tipo: form.tipo,
            categoria: form.categoria || null,
            data: form.data,
        })
        if (error) { showToast(error.message, 'erro'); return }
        showToast('💰 Transação lançada!')
        onSalvo()
    }

    const inp = 'w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-bg text-text-primary outline-none [color-scheme:dark]'

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                {['receita','despesa'].map(t => (
                    <button key={t} onClick={() => setForm(f => ({...f, tipo: t}))}
                        className={`flex-1 py-1.5 text-[12px] font-medium rounded-lg border cursor-pointer transition-colors ${form.tipo === t
                            ? t === 'receita' ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-priority-urgent text-white border-priority-urgent'
                            : 'bg-transparent text-text-secondary border-border'}`}
                    >{t === 'receita' ? '↑ Receita' : '↓ Despesa'}</button>
                ))}
            </div>
            <div>
                <label className="block text-[11px] text-text-tertiary uppercase mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({...f, valor: e.target.value}))}
                    className={inp} placeholder="0,00" autoFocus />
            </div>
            <div>
                <label className="block text-[11px] text-text-tertiary uppercase mb-1">Descrição</label>
                <input value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] text-text-tertiary uppercase mb-1">Data</label>
                    <input type="date" value={form.data} onChange={e => setForm(f => ({...f, data: e.target.value}))} className={inp} />
                </div>
                <div>
                    <label className="block text-[11px] text-text-tertiary uppercase mb-1">Categoria</label>
                    <input value={form.categoria} onChange={e => setForm(f => ({...f, categoria: e.target.value}))} className={inp} placeholder="ex: Petra" />
                </div>
            </div>
            <button onClick={salvar} className="w-full py-2 text-[13px] font-semibold bg-accent text-bg rounded-lg border-0 cursor-pointer">
                Lançar transação
            </button>
        </div>
    )
}

function FormDesafio({ vinculo, onSalvo }) {
    const [loading, setLoading] = useState(false)

    async function checkin() {
        setLoading(true)
        const { data: exists } = await supabase.from('desafios_checkin')
            .select('id').eq('desafio_id', vinculo.referencia_id).eq('data', hoje).maybeSingle()
        if (exists) { showToast('Check-in já feito hoje!', 'erro'); setLoading(false); return }
        const { error } = await supabase.from('desafios_checkin').insert({
            desafio_id: vinculo.referencia_id, data: hoje, concluido: true
        })
        setLoading(false)
        if (error) { showToast(error.message, 'erro'); return }
        showToast('🏆 Check-in registrado!')
        onSalvo()
    }

    return (
        <div className="space-y-3">
            <p className="text-[12px] text-text-secondary truncate">{vinculo.referencia_nome}</p>
            <button onClick={checkin} disabled={loading} className="w-full py-2 text-[13px] font-semibold bg-accent text-bg rounded-lg border-0 cursor-pointer disabled:opacity-50">
                {loading ? 'Registrando...' : '✓ Check-in de hoje'}
            </button>
        </div>
    )
}

// ——— Modal principal ———

export default function ModalConclusaoVinculo({ tarefa, vinculos, onClose }) {
    const [idx, setIdx] = useState(0)
    const vinculo = vinculos[idx]

    if (!vinculo) return null

    const icone = { treino: '💪', meta: '🎯', transacao: '💰', desafio: '🏆' }[vinculo.tipo] || '🔗'
    const label = { treino: 'Registrar treino', meta: 'Atualizar meta', transacao: 'Lançar transação', desafio: 'Check-in do desafio' }[vinculo.tipo]

    function proximo() {
        if (idx + 1 < vinculos.length) setIdx(idx + 1)
        else onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl w-full max-w-[400px] shadow-2xl">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[18px]">✅</span>
                            <div>
                                <p className="text-[13px] font-semibold text-text-primary m-0">Tarefa concluída!</p>
                                <p className="text-[11px] text-text-tertiary m-0 truncate max-w-[240px]">{tarefa.nome}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-1">✕</button>
                    </div>
                    {vinculos.length > 1 && (
                        <div className="flex gap-1 mt-3">
                            {vinculos.map((_, i) => (
                                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i === idx ? 'bg-accent' : i < idx ? 'bg-accent/40' : 'bg-border'}`} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[14px]">{icone}</span>
                        <p className="text-[12px] font-semibold text-text-secondary m-0">{label}</p>
                    </div>

                    {vinculo.tipo === 'treino'     && <FormTreino vinculo={vinculo} tarefa={tarefa} onSalvo={proximo} />}
                    {vinculo.tipo === 'meta'        && <FormMeta vinculo={vinculo} onSalvo={proximo} />}
                    {vinculo.tipo === 'transacao'   && <FormTransacao vinculo={vinculo} tarefa={tarefa} onSalvo={proximo} />}
                    {vinculo.tipo === 'desafio'     && <FormDesafio vinculo={vinculo} onSalvo={proximo} />}
                </div>

                {/* Footer */}
                <div className="px-5 pb-4 flex justify-between items-center">
                    <button onClick={proximo} className="text-[11px] text-text-tertiary hover:text-text-secondary bg-transparent border-0 cursor-pointer">
                        Pular{vinculos.length > 1 && idx + 1 < vinculos.length ? ' →' : ''}
                    </button>
                    {vinculos.length > 1 && (
                        <span className="text-[11px] text-text-tertiary">{idx + 1} de {vinculos.length}</span>
                    )}
                </div>
            </div>
        </div>
    )
}
