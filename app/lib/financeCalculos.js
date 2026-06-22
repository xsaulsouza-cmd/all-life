/**
 * Cálculos Puros do Módulo Financeiro
 * Funções que não dependem de estado de UI nem de banco de dados, facilitando testes.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

export function mesAtualStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function mesStr(date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function addMeses(mesStr, n) {
    const [y, m] = mesStr.split('-').map(Number)
    const d = new Date(y, m - 1 + n, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function mesLabel(ms) {
    const [y, m] = ms.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ─── §5.1 Cascata de parcelamento ─────────────────────────────────────────────

export function calcularParcelasFuturas(compra, cartao) {
    const { data_compra, numero_parcelas, valor_parcela } = compra
    const { dia_fechamento } = cartao

    const parcelas = []
    const dataCompra = new Date(data_compra)

    let mesPrimeiraParcela = new Date(dataCompra.getFullYear(), dataCompra.getMonth(), 1)

    if (dataCompra.getDate() >= dia_fechamento) {
        mesPrimeiraParcela.setMonth(mesPrimeiraParcela.getMonth() + 2)
    } else {
        mesPrimeiraParcela.setMonth(mesPrimeiraParcela.getMonth() + 1)
    }

    for (let i = 1; i <= numero_parcelas; i++) {
        const mesReferencia = new Date(mesPrimeiraParcela.getFullYear(), mesPrimeiraParcela.getMonth() + (i - 1), 1)
        const ms = `${mesReferencia.getFullYear()}-${String(mesReferencia.getMonth() + 1).padStart(2, '0')}`

        parcelas.push({
            mes: ms,
            valor: valor_parcela,
            numero_parcela: i,
            total_parcelas: numero_parcelas
        })
    }

    return parcelas
}

// ─── §5.2 Saldo Atual vs. Saldo Futuro ───────────────────────────────────────

export function calcularSaldoFuturo(saldoAtual, receitasPrevistasCiclo, despesasPendentesCiclo) {
    const somaReceitas = receitasPrevistasCiclo.reduce((acc, r) => acc + Number(r.valor || 0), 0)
    const somaDespesas = despesasPendentesCiclo.reduce((acc, d) => acc + Number(d.valor || 0), 0)
    return Number(saldoAtual) + somaReceitas - somaDespesas
}

// ─── §5.3 Orçado vs. Realizado por centro de custo ────────────────────────────

export function calcularOrcadoVsRealizado(centrosCusto, despesasFixas, despesasVariaveis, mesAlvo) {
    return centrosCusto.map(cc => {
        const orcado = Number(cc.limite_orcado || 0)

        const gastoFixo = despesasFixas
            .filter(d => d.centro_custo_id === cc.id && d.status === 'pago')
            .reduce((acc, d) => acc + Number(d.valor || 0), 0)

        const gastoVar = despesasVariaveis
            .filter(d => {
                if (d.centro_custo_id !== cc.id || d.status !== 'pago') return false
                if (!d.data) return true
                return mesStr(d.data) === mesAlvo
            })
            .reduce((acc, d) => acc + Number(d.valor || 0), 0)

        const realizado = gastoFixo + gastoVar
        const pct = orcado > 0 ? Math.round((realizado / orcado) * 100) : 0

        let alertLevel = 'ok' // verde
        if (pct >= 100) alertLevel = 'danger' // vermelho
        else if (pct >= 80) alertLevel = 'warning' // âmbar

        return { ...cc, orcado, realizado, pct, alertLevel }
    })
}

// ─── §5.4 Projeção de Fatura ──────────────────────────────────────────────────

export function calcularProjecaoFatura(comprasParceladas, despesasFixasCartao, cartao, mesAlvo) {
    let totalProjetado = 0

    const despesasMes = despesasFixasCartao.filter(d => d.conta_ou_cartao_id === cartao.id && d.forma_pagamento === 'crédito')
    totalProjetado += despesasMes.reduce((acc, d) => acc + Number(d.valor || 0), 0)

    for (const compra of comprasParceladas) {
        if (compra.cartao_id === cartao.id) {
            const parcelas = calcularParcelasFuturas(compra, cartao)
            const parcelaNoMes = parcelas.find(p => p.mes === mesAlvo)
            if (parcelaNoMes) {
                totalProjetado += Number(parcelaNoMes.valor)
            }
        }
    }

    return totalProjetado
}

// ─── §5.5 Calendário de vencimentos consolidado ──────────────────────────────

export function gerarCalendarioVencimentos(despFixas, despVar, dividas, faturas) {
    const items = []
    const hoje = new Date()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    // Despesas fixas: usar dia_vencimento do mês atual
    for (const d of despFixas) {
        if (d.status === 'pago') continue
        const dia = d.dia_vencimento || 1
        items.push({
            id: d.id,
            tipo: 'despesa_fixa',
            nome: d.nome,
            valor: Number(d.valor || 0),
            data: new Date(anoAtual, mesAtual, dia),
            status: d.status
        })
    }

    // Despesas variáveis com data definida
    for (const d of despVar) {
        if (d.status === 'pago' || !d.data) continue
        items.push({
            id: d.id,
            tipo: 'despesa_variavel',
            nome: d.nome,
            valor: Number(d.valor || 0),
            data: new Date(d.data),
            status: d.status
        })
    }

    // Dívidas: parcelas mensais, usar dia_vencimento
    for (const d of dividas) {
        if ((d.parcelas_pagas || 0) >= d.numero_parcelas) continue
        const dia = d.dia_vencimento || 1
        items.push({
            id: d.id,
            tipo: 'divida',
            nome: d.nome_credor,
            valor: Number(d.valor_parcela || 0),
            data: new Date(anoAtual, mesAtual, dia),
            status: 'pendente',
            info: `Parcela ${(d.parcelas_pagas || 0) + 1}/${d.numero_parcelas}`
        })
    }

    // Faturas de cartão
    for (const f of faturas) {
        if (f.status === 'paga') continue
        items.push({
            id: f.id,
            tipo: 'fatura',
            nome: `Fatura cartão`,
            valor: Number(f.valor_fatura || 0),
            data: f.mes_referencia ? new Date(f.mes_referencia) : new Date(),
            status: f.status
        })
    }

    return items.sort((a, b) => a.data - b.data)
}

// ─── §5.7 Alerta de descasamento ──────────────────────────────────────────────

export function verificarDescasamento(receitas, despFixas, despVar, numMeses = 3) {
    const alertas = []
    const mesBase = mesAtualStr()

    for (let i = 0; i < numMeses; i++) {
        const mes = addMeses(mesBase, i)

        const entradasMes = receitas
            .filter(r => r.status === 'previsto' && r.data_prevista && mesStr(r.data_prevista) === mes)
            .reduce((acc, r) => acc + Number(r.valor || 0), 0)

        const saidasFixas = despFixas
            .filter(d => d.status !== 'pago')
            .reduce((acc, d) => acc + Number(d.valor || 0), 0)

        const saidasVar = despVar
            .filter(d => d.status !== 'pago' && d.data && mesStr(d.data) === mes)
            .reduce((acc, d) => acc + Number(d.valor || 0), 0)

        const saidasMes = saidasFixas + saidasVar

        if (saidasMes > entradasMes && entradasMes > 0) {
            alertas.push({ mes, entradas: entradasMes, saidas: saidasMes, deficit: saidasMes - entradasMes })
        }
    }

    return alertas
}

// ─── §5.8 Buffer de segurança ─────────────────────────────────────────────────

export function verificarBufferSeguranca(saldoProjetado, saldoMinimo = 1000) {
    return saldoProjetado < saldoMinimo
        ? { alerta: true, saldoProjetado, saldoMinimo, deficit: saldoMinimo - saldoProjetado }
        : { alerta: false }
}

// ─── §5.9 Limite por centro de custo ──────────────────────────────────────────

export function verificarLimiteCentroCusto(cc, gastoReal) {
    const orcado = Number(cc.limite_orcado || 0)
    if (orcado <= 0) return { status: 'sem_limite' }

    const pct = Math.round((gastoReal / orcado) * 100)
    if (pct >= 100) return { status: 'estourado', pct, excesso: gastoReal - orcado }
    if (pct >= 80) return { status: 'alerta', pct }
    return { status: 'ok', pct }
}

// ─── §5.6 Projeção Multi-Mês ─────────────────────────────────────────────────

export function calcularProjecaoMultiMes(dados, numMeses = 3) {
    const { contas, receitas, despesasFixas, despesasVariaveis, dividas, comprasParceladas, cartoes } = dados
    const mesBase = mesAtualStr()
    let saldoAcumulado = contas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0)

    const meses = []

    for (let i = 0; i < numMeses; i++) {
        const mes = addMeses(mesBase, i)

        // Entradas do mês
        const entradas = receitas
            .filter(r => r.data_prevista && mesStr(r.data_prevista) === mes)
            .reduce((acc, r) => acc + Number(r.valor || 0), 0)

        // Saídas fixas (repetem todo mês)
        const saidasFixas = despesasFixas
            .filter(d => d.status !== 'pago')
            .reduce((acc, d) => acc + Number(d.valor || 0), 0)

        // Saídas variáveis do mês
        const saidasVar = despesasVariaveis
            .filter(d => d.data && mesStr(d.data) === mes && d.status !== 'pago')
            .reduce((acc, d) => acc + Number(d.valor || 0), 0)

        // Parcelas de dívidas
        const saidasDividas = dividas
            .filter(d => (d.parcelas_pagas || 0) < d.numero_parcelas)
            .reduce((acc, d) => acc + Number(d.valor_parcela || 0), 0)

        // Parcelas de compras parceladas
        let saidasParcelas = 0
        for (const compra of comprasParceladas) {
            const cartao = cartoes.find(c => c.id === compra.cartao_id)
            if (!cartao) continue
            const parcelas = calcularParcelasFuturas(compra, cartao)
            const p = parcelas.find(p => p.mes === mes)
            if (p) saidasParcelas += Number(p.valor)
        }

        const totalSaidas = saidasFixas + saidasVar + saidasDividas + saidasParcelas
        saldoAcumulado = saldoAcumulado + entradas - totalSaidas

        meses.push({
            mes,
            label: mesLabel(mes),
            entradas,
            saidas: totalSaidas,
            saldo: saldoAcumulado,
            deficit: saldoAcumulado < 0
        })
    }

    return meses
}

// ─── Cálculos de resumo para dívidas ──────────────────────────────────────────

export function calcularSaldoDevedor(divida) {
    return Number(divida.valor_total || 0) - ((divida.parcelas_pagas || 0) * Number(divida.valor_parcela || 0))
}

export function calcularProgressoQuitacao(divida) {
    if (!divida.numero_parcelas) return 0
    return Math.round(((divida.parcelas_pagas || 0) / divida.numero_parcelas) * 100)
}
