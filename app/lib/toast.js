/**
 * showToast — notificação visual leve, sem dependência externa.
 * @param {string} msg - Texto a exibir
 * @param {'sucesso'|'erro'|'info'} tipo
 */
export function showToast(msg, tipo = 'sucesso') {
    if (typeof document === 'undefined') return
    const cores = { sucesso: '#16A34A', erro: '#DC2626', info: '#2563EB' }
    const cor = cores[tipo] || cores.sucesso

    const el = document.createElement('div')
    el.style.cssText = [
        'position:fixed', 'bottom:24px', 'right:24px',
        `background:${cor}`, 'color:#fff',
        'padding:10px 18px', 'border-radius:8px',
        'font-size:13px', 'font-weight:500',
        'z-index:99999', 'opacity:1',
        'transition:opacity 0.3s', 'pointer-events:none',
        'max-width:320px', 'line-height:1.4',
        'box-shadow:0 4px 12px rgba(0,0,0,0.4)'
    ].join(';')
    el.innerText = msg
    document.body.appendChild(el)
    setTimeout(() => {
        el.style.opacity = '0'
        setTimeout(() => el.remove(), 300)
    }, 2500)
}
