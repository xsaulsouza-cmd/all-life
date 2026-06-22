'use client'

import { Component } from 'react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
                    <span className="text-[28px] mb-3">⚠️</span>
                    <p className="text-[14px] font-semibold text-text-primary mb-1">
                        {this.props.titulo || 'Algo deu errado'}
                    </p>
                    <p className="text-[12px] text-text-tertiary mb-4 max-w-[320px]">
                        {this.state.error?.message || 'Erro desconhecido'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-1.5 text-[12px] font-medium bg-surface border border-border rounded-lg text-text-primary cursor-pointer hover:bg-surface-hover transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
