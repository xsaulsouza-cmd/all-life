'use client'

import { useState, useEffect } from 'react'
import { hojeLabel } from '@/app/lib/tarefas'
import Notificacoes from './Notificacoes'
import ChatClaude from './ChatClaude'

export default function Header({
    titulo,
    subtitulo,
    icon,
    tarefasAtivas = [],
    totalTarefas = 0,
    onNovaTarefa,
    onOpenPalette,
    onSelect,
    onBusca,
}) {
    const isHome = !subtitulo

    const [chatAberto, setChatAberto] = useState(false)
    const [googleToken, setGoogleToken] = useState(null)
    const [busca, setBusca] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('googleToken')
        if (stored) setGoogleToken(stored)
        const handleMessage = (event) => {
            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
                const token = event.data.tokens.access_token
                localStorage.setItem('googleToken', token)
                setGoogleToken(token)
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    useEffect(() => {
        if (busca.length >= 2) {
            onBusca?.(busca)
        } else {
            onBusca?.('')
        }
    }, [busca, onBusca])

    useEffect(() => {
        function handleKeyDown(e) {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) {
                if (e.target?.id === 'header-search-input') return
                return
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                document.getElementById('header-search-input')?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    function conectarGoogle() {
        const width = 500, height = 600
        const left = (window.screen.width / 2) - (width / 2)
        const top = (window.screen.height / 2) - (height / 2)
        window.open('/api/calendar/auth', 'Google Auth', `width=${width},height=${height},top=${top},left=${left}`)
    }

    return (
        <header className="sticky top-0 z-[9] bg-bg/90 backdrop-blur-md border-b border-border px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
                <h1 className="m-0 text-[18px] font-semibold text-text-primary flex items-center gap-2">
                    {icon && <span className="text-[16px]">{icon}</span>}
                    {titulo}
                </h1>
                {isHome ? (
                    <p className="m-0 text-[13px] text-text-secondary mt-1 capitalize">{hojeLabel()}</p>
                ) : (
                    <div className="flex items-center gap-2 text-[13px] text-text-secondary mt-1">{subtitulo}</div>
                )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                <Notificacoes tarefas={tarefasAtivas} onSelect={onSelect} />
                
                <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-[12px] pointer-events-none select-none">🔍</span>
                    <input
                        id="header-search-input"
                        type="text"
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        placeholder="Buscar tarefas... (⌘K)"
                        className="w-48 focus:w-72 transition-all duration-200 bg-surface border border-border rounded-lg pl-7 pr-7 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent [color-scheme:dark]"
                    />
                    {busca && (
                        <button
                            onClick={() => setBusca('')}
                            className="absolute right-2 text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer p-0.5 text-[10px]"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="h-5 w-px bg-border"></div>
                {busca.length >= 2 ? (
                    <span className="text-[12px] text-text-tertiary font-medium">
                        {totalTarefas} resultado{totalTarefas !== 1 ? 's' : ''}
                    </span>
                ) : (
                    <span className="text-[12px] text-text-tertiary font-medium">
                        {totalTarefas} {totalTarefas === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                )}
                {!googleToken && (
                    <button onClick={conectarGoogle} className="bg-transparent hover:bg-surface-hover text-text-secondary border border-border rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer transition-colors">
                        📅 Google
                    </button>
                )}
                {onOpenPalette && (
                    <button onClick={onOpenPalette} title="Command Palette (⌘K)" className="bg-surface hover:bg-surface-hover text-text-tertiary border border-border rounded-lg px-2.5 py-1.5 text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1">
                        ⌘K
                    </button>
                )}
                <button onClick={onNovaTarefa} className="bg-accent hover:bg-accent/90 text-bg border-0 rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer transition-colors">
                    + Nova
                </button>
                <button onClick={() => setChatAberto(!chatAberto)} title="Assistente Claude" className="bg-transparent border-0 text-[18px] cursor-pointer hover:opacity-80 transition-opacity">
                    🤖
                </button>
            </div>

            {chatAberto && <ChatClaude onClose={() => setChatAberto(false)} tarefasAtivas={tarefasAtivas} />}
        </header>
    )
}
