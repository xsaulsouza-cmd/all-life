'use client'

import { createContext, useContext, useState, useCallback } from 'react'

const BulkSelectContext = createContext(null)

export function BulkSelectProvider({ children, onDelete, onStatusChange }) {
    const [selectedIds, setSelectedIds] = useState(new Set())

    const isSelectMode = selectedIds.size > 0

    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const clearSelect = useCallback(() => setSelectedIds(new Set()), [])

    const selectAll = useCallback((ids) => {
        setSelectedIds(new Set(ids))
    }, [])

    const handleDelete = useCallback(async () => {
        if (selectedIds.size === 0) return
        await onDelete?.(Array.from(selectedIds))
        clearSelect()
    }, [selectedIds, onDelete, clearSelect])

    const handleStatusChange = useCallback(async (status) => {
        if (selectedIds.size === 0) return
        await onStatusChange?.(Array.from(selectedIds), status)
        clearSelect()
    }, [selectedIds, onStatusChange, clearSelect])

    return (
        <BulkSelectContext.Provider value={{
            selectedIds,
            isSelectMode,
            toggleSelect,
            clearSelect,
            selectAll,
            handleDelete,
            handleStatusChange,
        }}>
            {children}
        </BulkSelectContext.Provider>
    )
}

export function useBulkSelect() {
    const ctx = useContext(BulkSelectContext)
    if (!ctx) return {
        selectedIds: new Set(),
        isSelectMode: false,
        toggleSelect: () => {},
        clearSelect: () => {},
        selectAll: () => {},
        handleDelete: () => {},
        handleStatusChange: () => {},
    }
    return ctx
}
