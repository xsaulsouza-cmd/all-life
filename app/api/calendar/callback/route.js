import { saveTokens } from '@/lib/googleAuth'

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const code  = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
        return Response.redirect(new URL('/?calendar=error', request.url))
    }

    if (!code) {
        return Response.json({ error: 'Code ausente' }, { status: 400 })
    }

    try {
        await saveTokens(code)
        // Redireciona para home com flag de sucesso — o Sidebar detecta e exibe confirmação
        return Response.redirect(new URL('/?calendar=connected', request.url))
    } catch (err) {
        console.error('[calendar/callback] Erro:', err.message)
        return Response.redirect(new URL('/?calendar=error', request.url))
    }
}
