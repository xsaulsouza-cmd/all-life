// ─── Normalização ─────────────────────────────────────────────────────────────

export function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export function toSlug(str) {
    return (str || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ─── Prioridade ───────────────────────────────────────────────────────────────

export function getPrioridadeConfig(prioridade) {
    const p = norm(prioridade)
    const cfg = {
        urgente: { label: 'Urgente', dot: 'bg-priority-urgent', text: 'text-priority-urgent', bar: '#E5534B', borderColor: '#DC2626', icon: '🔴' },
        alta:    { label: 'Alta',    dot: 'bg-priority-high',   text: 'text-priority-high',   bar: '#D29922', borderColor: '#D97706', icon: '🟡' },
        media:   { label: 'Média',   dot: 'bg-priority-medium', text: 'text-priority-medium', bar: '#539BF5', borderColor: '#2563EB', icon: '🔵' },
    }
    const none = { label: 'Sem', dot: 'bg-priority-none', text: 'text-text-tertiary', bar: '#374151', borderColor: '#374151', icon: '' }
    return cfg[p] || none
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function getStatusConfig(status) {
    const map = {
        'Não iniciada': { label: 'Não iniciada', dot: 'bg-status-todo',     text: 'text-text-tertiary' },
        'Em andamento':  { label: 'Em andamento', dot: 'bg-status-progress', text: 'text-status-progress' },
        'Concluído':     { label: 'Concluído',    dot: 'bg-status-done',     text: 'text-status-done' },
    }
    return map[status] || map['Não iniciada']
}

// ─── Mapeamento de grupos de área ─────────────────────────────────────────────

export const GRUPOS_AREA = {
    'trabalho': [
        'Relatórios SPF & PGE', 'Relatórios SPF/PGE', 'Relatorio', 'Relatório',
        'SPF', 'PGE', 'SETDIG / CRC', 'SETDIG', 'CRC',
        'Prospecção Pública', 'Prospeccao Publica',
        'Petra', 'Cannalab', 'Incorporação Familiar', 'Mounjaro',
        'Trabalho'
    ],
    'pessoal': [
        'Pessoal', 'Financeiro Pessoal', 'Saúde & Bem-estar',
        'Rotina & Organização', 'Saude', 'Bem-estar'
    ],
    'faculdade': [
        'Faculdade', 'Direito / OAB', 'UFMS — Direito',
        'OAB — Preparação', 'Direito', 'OAB', 'UFMS'
    ]
}

// Versão com chave capitalizada para uso no Dashboard (a.nome = "Trabalho")
export const GRUPOS_AREA_BY_NOME = {
    'Trabalho': GRUPOS_AREA['trabalho'],
    'Pessoal':  GRUPOS_AREA['pessoal'],
    'Faculdade': GRUPOS_AREA['faculdade'],
}

export function getAreaNome(tarefaArea) {
    for (const [nome, valores] of Object.entries(GRUPOS_AREA_BY_NOME)) {
        if (valores.includes(tarefaArea)) return nome
    }
    return null
}

export function getAreaIcon(area) {
    const map = {
        'Trabalho': '💼', 'Pessoal': '🏠', 'Faculdade': '🎓',
        'trabalho': '💼', 'pessoal': '🏠', 'faculdade': '🎓',
    }
    return map[area] || '📁'
}

// ─── Navegação (apenas views fixas — áreas vêm do Supabase) ──────────────────

export const NAV_VIEWS = [
    { id: 'dashboard',   icon: '◈', label: 'Dashboard' },
    { id: 'hoje',        icon: '☀️', label: 'Hoje' },
    { id: 'semana',      icon: '▦', label: 'Semana' },
    { id: 'mes',         icon: '📆', label: 'Mês' },
    { id: 'gantt',       icon: '◫', label: 'Gantt & Projetos' },
    { id: 'recorrentes', icon: '↻', label: 'Recorrentes' },
    { id: 'projetos',    icon: '⊞', label: 'Por Projeto' },
]

// ─── Opções de formulário ─────────────────────────────────────────────────────

export const AREA_GROUPS = [
    {
        grupo: '💼 Trabalho',
        options: ['Relatórios SPF & PGE', 'SETDIG / CRC', 'Prospecção Pública', 'Petra', 'Cannalab', 'Incorporação Familiar', 'Mounjaro'],
    },
    {
        grupo: '🏠 Pessoal',
        options: ['Pessoal', 'Financeiro Pessoal', 'Saúde & Bem-estar', 'Rotina & Organização'],
    },
    {
        grupo: '🎓 Faculdade',
        options: ['UFMS — Direito', 'OAB — Preparação', 'Direito / OAB'],
    },
]
// Flat list para backward-compat (filtros, etc.)
export const AREA_OPTIONS = AREA_GROUPS.flatMap(g => g.options)
export const PRIORIDADE_OPTIONS = ['Urgente', 'Alta', 'Média']
export const FREQUENCIA_OPTIONS  = ['Diária', 'Semanal', 'Mensal', 'Projeto']
export const DIA_SEMANA_OPTIONS  = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
export const STATUS_OPTIONS      = ['Não iniciada', 'Em andamento', 'Concluído']

export const DIAS_SEMANA_DISPLAY = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
export const JS_TO_DIA_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// ─── Lógica ───────────────────────────────────────────────────────────────────

export function isVencida(t) {
    if (!t.prazo) return false
    const p = new Date(t.prazo + 'T23:59:59'); const h = new Date(); h.setHours(0,0,0,0)
    return p < h && t.status !== 'Concluído'
}

export function prazoProximo(t) {
    if (!t.prazo || t.status === 'Concluído') return false
    const p = new Date(t.prazo + 'T23:59:59')
    const h = new Date(); h.setHours(0,0,0,0)
    const diff = (p - h) / 864e5
    return diff >= 0 && diff <= 2
}

export function getPrazoColor(t) {
    if (!t.prazo) return 'text-text-tertiary'
    if (isVencida(t)) return 'text-priority-urgent'
    if (prazoProximo(t)) return 'text-priority-high'
    return 'text-text-tertiary'
}

export function isRecorrenteHoje(t) {
    const f = norm(t.frequencia)
    if (f === 'diaria') return true
    if (f === 'semanal') return norm(t.dia_semana) === norm(JS_TO_DIA_PT[new Date().getDay()])
    return false
}

export function isRecorrenteNoDia(t, dia) {
    const f = norm(t.frequencia)
    if (f === 'diaria') return true
    if (f === 'semanal') return norm(t.dia_semana) === norm(dia)
    return false
}

export function isUrgente(t) {
    return norm(t.prioridade) === 'urgente' && t.status !== 'Concluído'
}

export function formatarData(d) {
    if (!d) return null
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function hojeLabel() {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function calcularProgresso(ts) {
    if (!ts.length) return 0
    return Math.round(ts.filter(t => t.status === 'Concluído').length / ts.length * 100)
}

export function ordenarPorPrioridade(ts) {
    const o = { urgente: 0, alta: 1, media: 2 }
    return [...ts].sort((a, b) => (o[norm(a.prioridade)] ?? 3) - (o[norm(b.prioridade)] ?? 3))
}

export function agruparPorChave(list, key, def = 'Sem definição') {
    return list.reduce((acc, i) => { const k = i[key] || def; (acc[k] = acc[k] || []).push(i); return acc }, {})
}



