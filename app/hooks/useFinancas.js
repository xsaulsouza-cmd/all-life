import { useState, useEffect } from 'react'
import { financeService } from '@/app/lib/financeService'

export function useFinancas() {
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)

    const [dados, setDados] = useState({
        contas: [],
        cartoes: [],
        centrosCusto: [],
        categorias: [],
        receitas: [],
        despesasFixas: [],
        despesasVariaveis: [],
        gastosPrevistos: [],
        dividas: [],
        comprasParceladas: [],
        faturasCartao: []
    })

    async function loadAll() {
        setLoading(true)
        setErro(null)
        try {
            const [
                contas,
                cartoes,
                centrosCusto,
                categorias,
                receitas,
                despesasFixas,
                despesasVariaveis,
                gastosPrevistos,
                dividas,
                comprasParceladas,
                faturasCartao
            ] = await Promise.all([
                financeService.getContasBancarias(),
                financeService.getCartoesCredito(),
                financeService.getCentrosCusto(),
                financeService.getCategorias(),
                financeService.getReceitas(),
                financeService.getDespesasFixas(),
                financeService.getDespesasVariaveis(),
                financeService.getGastosPrevistos(),
                financeService.getDividas(),
                financeService.getComprasParceladas(),
                financeService.getFaturasCartao()
            ])

            setDados({
                contas,
                cartoes,
                centrosCusto,
                categorias,
                receitas,
                despesasFixas,
                despesasVariaveis,
                gastosPrevistos,
                dividas,
                comprasParceladas,
                faturasCartao
            })
        } catch (err) {
            setErro(err.message || 'Erro ao carregar os dados financeiros.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAll()
    }, [])

    return { ...dados, loading, erro, refetch: loadAll }
}
