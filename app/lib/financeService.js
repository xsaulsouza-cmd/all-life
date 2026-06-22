import { supabase } from '@/lib/supabase'

export const financeService = {
    // ─── READS ─────────────────────────────────────────────────────────────────

    async getContasBancarias() {
        const { data, error } = await supabase.from('contas_bancarias').select('*').order('nome')
        if (error) throw error
        return data
    },

    async getCartoesCredito() {
        const { data, error } = await supabase.from('cartoes_credito').select('*').order('nome')
        if (error) throw error
        return data
    },

    async getCentrosCusto() {
        const { data, error } = await supabase.from('centros_custo').select('*').order('nome')
        if (error) throw error
        return data
    },

    async getCategorias() {
        const { data, error } = await supabase.from('categorias').select('*').order('nome')
        if (error) throw error
        return data
    },

    async getReceitas() {
        const { data, error } = await supabase.from('receitas').select('*').order('data_prevista')
        if (error) throw error
        return data
    },

    async getDespesasFixas() {
        const { data, error } = await supabase.from('despesas_fixas').select('*').order('dia_vencimento')
        if (error) throw error
        return data
    },

    async getDespesasVariaveis() {
        const { data, error } = await supabase.from('despesas_variaveis').select('*').order('data')
        if (error) throw error
        return data
    },

    async getGastosPrevistos() {
        const { data, error } = await supabase.from('gastos_previstos').select('*').order('criado_em')
        if (error) throw error
        return data
    },

    async getDividas() {
        const { data, error } = await supabase.from('dividas').select('*').order('nome_credor')
        if (error) throw error
        return data
    },

    async getComprasParceladas() {
        const { data, error } = await supabase.from('compras_parceladas').select('*').order('data_compra')
        if (error) throw error
        return data
    },

    async getFaturasCartao() {
        const { data, error } = await supabase.from('faturas_cartao').select('*').order('mes_referencia')
        if (error) throw error
        return data
    },

    // ─── MUTATIONS ─────────────────────────────────────────────────────────────

    // Contas Bancárias
    async criarConta(payload) {
        const { data, error } = await supabase.from('contas_bancarias').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async atualizarConta(id, payload) {
        const { data, error } = await supabase.from('contas_bancarias').update(payload).eq('id', id).select().single()
        if (error) throw error
        return data
    },
    async deletarConta(id) {
        const { error } = await supabase.from('contas_bancarias').delete().eq('id', id)
        if (error) throw error
    },

    // Cartões de Crédito
    async criarCartao(payload) {
        const { data, error } = await supabase.from('cartoes_credito').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async atualizarCartao(id, payload) {
        const { data, error } = await supabase.from('cartoes_credito').update(payload).eq('id', id).select().single()
        if (error) throw error
        return data
    },
    async deletarCartao(id) {
        const { error } = await supabase.from('cartoes_credito').delete().eq('id', id)
        if (error) throw error
    },

    // Receitas
    async criarReceita(payload) {
        const { data, error } = await supabase.from('receitas').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async atualizarReceita(id, payload) {
        const { data, error } = await supabase.from('receitas').update(payload).eq('id', id).select().single()
        if (error) throw error
        return data
    },
    async deletarReceita(id) {
        const { error } = await supabase.from('receitas').delete().eq('id', id)
        if (error) throw error
    },

    // Despesas Fixas
    async criarDespesaFixa(payload) {
        const { data, error } = await supabase.from('despesas_fixas').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async atualizarDespesaFixa(id, payload) {
        const { data, error } = await supabase.from('despesas_fixas').update(payload).eq('id', id).select().single()
        if (error) throw error
        return data
    },
    async deletarDespesaFixa(id) {
        const { error } = await supabase.from('despesas_fixas').delete().eq('id', id)
        if (error) throw error
    },

    // Despesas Variáveis
    async criarDespesaVariavel(payload) {
        const { data, error } = await supabase.from('despesas_variaveis').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async atualizarDespesaVariavel(id, payload) {
        const { data, error } = await supabase.from('despesas_variaveis').update(payload).eq('id', id).select().single()
        if (error) throw error
        return data
    },
    async deletarDespesaVariavel(id) {
        const { error } = await supabase.from('despesas_variaveis').delete().eq('id', id)
        if (error) throw error
    },

    // Dívidas
    async criarDivida(payload) {
        const { data, error } = await supabase.from('dividas').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async atualizarDivida(id, payload) {
        const { data, error } = await supabase.from('dividas').update(payload).eq('id', id).select().single()
        if (error) throw error
        return data
    },
    async deletarDivida(id) {
        const { error } = await supabase.from('dividas').delete().eq('id', id)
        if (error) throw error
    },

    // Compras Parceladas
    async criarCompraParcelada(payload) {
        const { data, error } = await supabase.from('compras_parceladas').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async deletarCompraParcelada(id) {
        const { error } = await supabase.from('compras_parceladas').delete().eq('id', id)
        if (error) throw error
    },

    // Gastos Previstos
    async criarGastoPrevisto(payload) {
        const { data, error } = await supabase.from('gastos_previstos').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async converterGastoPrevisto(id) {
        const { data, error } = await supabase.from('gastos_previstos').update({ convertido: true }).eq('id', id).select().single()
        if (error) throw error
        return data
    },
    async deletarGastoPrevisto(id) {
        const { error } = await supabase.from('gastos_previstos').delete().eq('id', id)
        if (error) throw error
    },

    // Centros de Custo
    async criarCentroCusto(payload) {
        const { data, error } = await supabase.from('centros_custo').insert(payload).select().single()
        if (error) throw error
        return data
    },
    async atualizarCentroCusto(id, payload) {
        const { data, error } = await supabase.from('centros_custo').update(payload).eq('id', id).select().single()
        if (error) throw error
        return data
    },

    // Categorias
    async criarCategoria(payload) {
        const { data, error } = await supabase.from('categorias').insert(payload).select().single()
        if (error) throw error
        return data
    },

    // Faturas
    async atualizarFatura(id, payload) {
        const { data, error } = await supabase.from('faturas_cartao').update(payload).eq('id', id).select().single()
        if (error) throw error
        return data
    }
}
