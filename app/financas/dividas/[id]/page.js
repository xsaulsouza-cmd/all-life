'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSkeleton } from '@/app/components/ui'
import ModalConfirmacao from '@/app/components/ModalConfirmacao'
import { showToast } from '@/app/lib/toast'

function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

export default function DividaDetalhePage() {
    const { id } = useParams()
    const [divida, setDivida] = useState(null)
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [registrando, setRegistrando] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    async function carregar() {
        setLoading(true)
        setErro(null)
        try {
            const { data, error } = await supabase
                .from('dividas')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                setErro('Dívida não encontrada: ' + error.message)
            } else {
                setDivida(data)
            }
        } catch (e) {
            setErro(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id) carregar()
    }, [id])

    async function handleRegistrarPagamento() {
        if (!divida) return
        const pagas = divida.parcelas_pagas || 0
        const total = divida.numero_parcelas || 1
        if (pagas >= total) return

        setRegistrando(true)
        try {
            const novaPagas = pagas + 1
            const { error } = await supabase
                .from('dividas')
                .update({ parcelas_pagas: novaPagas })
                .eq('id', id)

            if (error) {
                showToast('Erro ao registrar pagamento: ' + error.message, 'erro')
            } else {
                setDivida(prev => ({ ...prev, parcelas_pagas: novaPagas }))
                showToast('Parcela registrada!')
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        } finally {
            setRegistrando(false)
        }
    }

    async function handleExcluir() {
        setShowConfirm(true)
    }

    async function executarExclusao() {
        setShowConfirm(false)
        try {
            const { error } = await supabase
                .from('dividas')
                .delete()
                .eq('id', id)

            if (error) {
                showToast('Erro ao excluir: ' + error.message, 'erro')
            } else {
                showToast('Dívida removida')
                window.location.href = '/financas/dividas'
            }
        } catch (e) {
            showToast('Erro: ' + e.message, 'erro')
        }
    }

    if (loading) return <div className="p-8"><LoadingSkeleton /></div>
    if (erro) return <div className="p-8 text-priority-urgent">⚠️ {erro}</div>
    if (!divida) return <div className="p-8 text-text-tertiary">Dívida não encontrada</div>

    const pagas = divida.parcelas_pagas || 0
    const total = divida.numero_parcelas || 1
    const finalizada = pagas >= total
    const valorRestante = Math.max(0, (divida.valor_total || 0) - (pagas * (divida.valor_parcela || 0)))
    const pct = Math.min(100, Math.round((pagas / total) * 100))

    return (
        <div className="px-8 py-6 max-w-[900px] mx-auto text-text-primary">
            <div className="mb-4">
                <Link href="/financas/dividas" className="text-[12px] text-text-tertiary hover:text-text-secondary no-underline">
                    ← Voltar para Dívidas
                </Link>
            </div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-[18px] font-semibold text-text-primary m-0">{divida.nome_credor}</h2>
                        {finalizada && (
                            <span className="bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                Quitada
                            </span>
                        )}
                    </div>
                    <p className="text-[12px] text-text-tertiary m-0 mt-1">
                        Valor original: {formatCurrency(divida.valor_total)} · Vence dia {divida.dia_vencimento}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExcluir} 
                        className="px-3 py-1.5 text-[12px] font-medium text-priority-urgent bg-transparent hover:bg-priority-urgent/10 border border-border hover:border-priority-urgent/20 rounded-lg cursor-pointer transition-colors"
                    >
                        Excluir Dívida
                    </button>
                </div>
            </div>

            {/* Progresso Geral */}
            <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider m-0 mb-1">Saldo Devedor</p>
                        <p className={`text-[28px] font-semibold m-0 ${finalizada ? 'text-[#16A34A]' : 'text-priority-urgent'}`}>
                            {formatCurrency(valorRestante)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider m-0 mb-1">Parcelas Pagas</p>
                        <p className={`text-[24px] font-medium m-0 ${finalizada ? 'text-[#16A34A]' : 'text-text-primary'}`}>
                            {pagas} <span className="text-[16px] text-text-tertiary">/ {total}</span>
                        </p>
                    </div>
                </div>

                <div className="w-full h-3 bg-bg border border-border rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-[#16A34A] transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-[12px] text-text-tertiary m-0">{pct}% quitado</p>
                    {!finalizada && (
                        <button
                            onClick={handleRegistrarPagamento}
                            disabled={registrando}
                            className="px-4 py-2 text-[12px] font-medium text-bg bg-[#16A34A] hover:bg-[#32963f] disabled:opacity-50 rounded-lg cursor-pointer border-0 transition-colors"
                        >
                            {registrando ? 'Registrando...' : '✓ Registrar Parcela Paga'}
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline de Parcelas */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-[13px] font-semibold text-text-primary m-0 mb-5">Timeline de Pagamento</h3>
                <div className="space-y-3">
                    {Array.from({ length: total }).map((_, i) => {
                        const num = i + 1
                        const isPago = num <= pagas
                        const isAtual = num === pagas + 1
                        return (
                            <div key={num} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                                isPago ? 'bg-bg/50 border-border/50 opacity-60' :
                                isAtual ? 'bg-bg border-accent/30 shadow-sm' :
                                'bg-bg border-border'
                            }`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isPago ? 'bg-[#16A34A] text-bg' :
                                    isAtual ? 'bg-accent text-bg' :
                                    'bg-surface border border-border text-text-tertiary'
                                }`}>
                                    {isPago ? '✓' : num}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-[13px] font-medium m-0 ${isPago ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                                        Parcela {num}
                                    </p>
                                    {isAtual && <p className="text-[11px] text-accent m-0 mt-0.5 font-medium">Próximo pagamento (Dia {divida.dia_vencimento})</p>}
                                </div>
                                <div className="text-right">
                                    <p className={`text-[13px] font-medium m-0 ${isPago ? 'text-text-tertiary' : 'text-text-primary'}`}>
                                        {formatCurrency(divida.valor_parcela)}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {showConfirm && (
                <ModalConfirmacao
                    titulo="Excluir dívida?"
                    mensagem="Esta ação não pode ser desfeita e removerá os dados permanentemente."
                    onConfirmar={executarExclusao}
                    onCancelar={() => setShowConfirm(false)}
                    cor="urgente"
                />
            )}
        </div>
    )
}
