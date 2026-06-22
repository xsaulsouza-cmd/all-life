/**
 * googleAuth.js — helper server-side para Google Calendar OAuth
 * Tokens ficam na tabela `google_tokens` do Supabase (single-user).
 * Nunca expõe tokens para o cliente.
 */
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL + '/api/calendar/callback'
    : 'http://localhost:3000/api/calendar/callback'

function makeOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    )
}

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
}

/** Retorna URL de autorização Google */
export function getAuthUrl() {
    const auth = makeOAuth2Client()
    return auth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // garante refresh_token sempre
        scope: ['https://www.googleapis.com/auth/calendar.events'],
    })
}

/** Troca code OAuth por tokens e salva no Supabase */
export async function saveTokens(code) {
    const auth = makeOAuth2Client()
    const { tokens } = await auth.getToken(code)
    const supabase = getSupabase()

    const { data: existing } = await supabase
        .from('google_tokens')
        .select('id, refresh_token')
        .single()

    const payload = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || existing?.refresh_token || null,
        expiry_date: tokens.expiry_date || null,
        atualizado_em: new Date().toISOString(),
    }

    if (existing?.id) {
        await supabase.from('google_tokens').update(payload).eq('id', existing.id)
    } else {
        await supabase.from('google_tokens').insert(payload)
    }

    return tokens
}

/** Verifica se o usuário conectou o Calendar */
export async function isConnected() {
    const supabase = getSupabase()
    const { data } = await supabase.from('google_tokens').select('refresh_token').single()
    return !!(data?.refresh_token)
}

/**
 * Retorna um cliente `google.calendar` autenticado.
 * Auto-refresha o access_token se expirado.
 * Retorna null se não há tokens salvos.
 */
export async function getCalendarClient() {
    const supabase = getSupabase()
    const { data } = await supabase.from('google_tokens').select('*').single()

    if (!data?.refresh_token) return null

    const auth = makeOAuth2Client()
    auth.setCredentials({
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        expiry_date: data.expiry_date,
    })

    // Refresh se expirado ou faltam menos de 2 minutos
    const expirado = data.expiry_date && Date.now() > data.expiry_date - 120000
    if (expirado) {
        try {
            const { credentials } = await auth.refreshAccessToken()
            auth.setCredentials(credentials)
            await supabase.from('google_tokens').update({
                access_token: credentials.access_token,
                expiry_date: credentials.expiry_date,
                atualizado_em: new Date().toISOString(),
            }).eq('id', data.id)
        } catch (err) {
            console.error('[googleAuth] Falha ao renovar token:', err.message)
            return null
        }
    }

    return google.calendar({ version: 'v3', auth })
}
