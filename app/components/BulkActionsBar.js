'use client'

import { useBulkSelect } from '@/app/contexts/BulkSelectContext'

export default function BulkActionsBar() {
    const { selectedIds, isSelectMode, clearSelect, handleDelete, handleStatusChange } = useBulkSelect()

    if (!isSelectMode) return null

    const count = selectedIds.size

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#18181B] text-white rounded-2xl px-4 py-3 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <span className="text-[13px] font-medium text-white/70 mr-2">
                {count} {count === 1 ? 'selecionada' : 'selecionadas'}
            </span>

            <div className="w-px h-4 bg-white/20 mx-1" />

            <button
                onClick={() => handleStatusChange('Concluído')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#16A34A] hover:bg-[#15803d] rounded-lg cursor-pointer border-0 text-white transition-colors"
            >
                ✓ Concluir
            </button>

            <button
                onClick={() => handleStatusChange('Em andamento')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] rounded-lg cursor-pointer border-0 text-white transition-colors"
            >
                → Em andamento
            </button>

            <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#DC2626] hover:bg-[#b91c1c] rounded-lg cursor-pointer border-0 text-white transition-colors"
            >
                🗑 Excluir
            </button>

            <div className="w-px h-4 bg-white/20 mx-1" />

            <button
                onClick={clearSelect}
                className="text-[12px] text-white/50 hover:text-white bg-transparent border-0 cursor-pointer px-2"
            >
                ✕
            </button>
        </div>
    )
}
