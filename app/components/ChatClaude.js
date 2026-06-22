'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const ATALHOS = [
    { label: '📋 Relatório da semana', prompt: 'Gere um relatório completo da minha semana: tarefas concluídas, pendentes, vencidas, progresso por projeto e recomendações de foco para os próximos dias.' },
    { label: '🎯 Foco agora', prompt: 'Qual tarefa devo fazer agora? Leve em conta prioridade, prazo e urgência.' },
    { label: '📊 Status geral', prompt: 'Como está o meu sistema? Me dê um panorama rápido das tarefas por status e área.' },
    { label: '⚠️ Urgentes', prompt: 'Liste todas as tarefas urgentes ou vencidas que precisam de atenção imediata.' },
]

export default function ChatClaude({ onClose }) {
    const [mensagens, setMensagens] = useState([
        { role: 'assistant', texto: 'Olá! Posso criar tarefas, gerar relatórios, analisar seu sistema e organizar sua semana. O que precisa?' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef(null)

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])

    async function enviar(mensagemOverride) {
        const texto = mensagemOverride || input
        if (!texto.trim() || loading) return
        setMensagens(prev => [...prev, { role: 'user', texto }])
        setInput('')
        setLoading(true)

        // Contexto rico do banco
        const hoje = new Date().toISOString().split('T')[0]
        const seteDiasAtras = new Date(); seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
        const seteDiasDepois = new Date(); seteDiasDepois.setDate(seteDiasDepois.getDate() + 7)

        const [{ data: ativas }, { data: concluidas }, { data: vencidas }] = await Promise.all([
            supabase.from('tarefas').select('nome, status, prioridade, prazo, area, projeto, tempo_estimado').in('status', ['Não iniciada', 'Em andamento']).limit(50),
            supabase.from('tarefas').select('nome, area, projeto, atualizada_em').eq('status', 'Concluído').gte('atualizada_em', seteDiasAtras.toISOString()).limit(30),
            supabase.from('tarefas').select('nome, prazo, prioridade, projeto').in('status', ['Não iniciada', 'Em andamento']).lt('prazo', hoje).limit(20),
        ])

        const contexto = {
            hoje,
            tarefasAtivas: ativas || [],
            concluidasSemana: concluidas || [],
            vencidas: vencidas || [],
        }

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensagem: texto, contextoBanco: contexto })
            })
            const resposta = await res.json()

            try {
                const parsed = JSON.parse(resposta.resposta)
                if (parsed.acao === 'criar_tarefa') {
                    await supabase.from('tarefas').insert(parsed.dados)
                    setMensagens(prev => [...prev, { role: 'assistant', texto: `✅ Tarefa "${parsed.dados.nome}" criada!` }])
                    setLoading(false)
                    return
                }
            } catch { /* texto normal */ }

            setMensagens(prev => [...prev, { role: 'assistant', texto: resposta.resposta }])
        } catch {
            setMensagens(prev => [...prev, { role: 'assistant', texto: '⚠️ Falha de comunicação. Verifique se o servidor está rodando.' }])
        }
        setLoading(false)
    }

    return (
        <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-bg border-l border-border h-screen z-[200] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-border flex-shrink-0">
                <div>
                    <span className="text-text-primary font-semibold text-[14px]">🤖 Claude</span>
                    <p className="text-[11px] text-text-tertiary m-0 mt-0.5">Assistente inteligente do sistema</p>
                </div>
                <button onClick={onClose} className="text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer text-[20px] p-1 outline-none leading-none">×</button>
            </div>

            {/* Atalhos rápidos */}
            <div className="px-4 pt-3 pb-2 border-b border-border flex-shrink-0">
                <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-2">Atalhos</p>
                <div className="grid grid-cols-2 gap-1.5">
                    {ATALHOS.map(a => (
                        <button
                            key={a.label}
                            onClick={() => enviar(a.prompt)}
                            disabled={loading}
                            className="text-left text-[11px] px-2.5 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary cursor-pointer disabled:opacity-50 transition-colors border-0 outline-none"
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {mensagens.map((m, i) => (
                    <div
                        key={i}
                        className={`px-4 py-2.5 text-[13px] rounded-xl max-w-[88%] leading-relaxed whitespace-pre-wrap ${
                            m.role === 'user'
                                ? 'self-end bg-accent text-white'
                                : 'self-start bg-surface border border-border text-text-primary'
                        }`}
                    >
                        {m.texto}
                    </div>
                ))}
                {loading && (
                    <div className="self-start text-text-tertiary text-[13px] flex items-center gap-2">
                        <span className="inline-flex gap-1">
                            <span className="animate-bounce delay-0">·</span>
                            <span className="animate-bounce delay-100">·</span>
                            <span className="animate-bounce delay-200">·</span>
                        </span>
                        Pensando...
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
                    placeholder="Mensagem ou comando..."
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-text-tertiary [color-scheme:dark]"
                />
                <button
                    onClick={() => enviar()}
                    disabled={loading || !input.trim()}
                    className="bg-accent text-white rounded-lg px-4 py-2 text-[16px] cursor-pointer disabled:opacity-40 border-0 flex items-center justify-center font-medium transition-opacity"
                >
                    →
                </button>
            </div>
        </div>
    )
}
