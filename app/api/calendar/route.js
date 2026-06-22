import { getCalendarClient } from '@/lib/googleAuth'
import { createClient } from '@supabase/supabase-js'

const TZ = 'America/Campo_Grande'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
}

// POST /api/calendar — cria evento no Google Calendar e salva event_id na tarefa
export async function POST(request) {
    const { tarefaId, tarefa } = await request.json()

    if (!tarefa?.prazo) {
        return Response.json({ error: 'Tarefa sem prazo — evento não criado' }, { status: 400 })
    }

    const calendar = await getCalendarClient()
    if (!calendar) {
        return Response.json({ error: 'Google Calendar não conectado' }, { status: 401 })
    }

    // Cor por prioridade: 11=vermelho, 5=amarelo, 9=azul
    const colorId = tarefa.prioridade === 'Urgente' ? '11'
        : tarefa.prioridade === 'Alta' ? '5'
        : '9'

    const evento = {
        summary: tarefa.nome,
        description: [
            tarefa.projeto ? `Projeto: ${tarefa.projeto}` : '',
            tarefa.area    ? `Área: ${tarefa.area}`       : '',
            tarefa.prioridade ? `Prioridade: ${tarefa.prioridade}` : '',
            tarefa.notas   ? `\nNotas: ${tarefa.notas}`  : '',
        ].filter(Boolean).join('\n'),
        start: { date: tarefa.prazo, timeZone: TZ },
        end:   { date: tarefa.prazo, timeZone: TZ },
        colorId,
    }

    try {
        const { data: evento_criado } = await calendar.events.insert({
            calendarId: 'primary',
            resource: evento,
        })

        // Salva event_id na tarefa para poder atualizar/deletar depois
        if (tarefaId) {
            const supabase = getSupabase()
            await supabase
                .from('tarefas')
                .update({ calendar_event_id: evento_criado.id })
                .eq('id', tarefaId)
        }

        return Response.json({
            eventId: evento_criado.id,
            link: evento_criado.htmlLink,
        })
    } catch (err) {
        console.error('[calendar] Erro ao criar evento:', err.message)
        return Response.json({ error: err.message }, { status: 500 })
    }
}

// PATCH /api/calendar — atualiza evento (ex: ao marcar concluído)
export async function PATCH(request) {
    const { eventId, updates } = await request.json()
    if (!eventId) return Response.json({ error: 'eventId obrigatório' }, { status: 400 })

    const calendar = await getCalendarClient()
    if (!calendar) return Response.json({ error: 'Não conectado' }, { status: 401 })

    try {
        const { data: atual } = await calendar.events.get({
            calendarId: 'primary',
            eventId,
        })

        await calendar.events.patch({
            calendarId: 'primary',
            eventId,
            resource: {
                ...updates,
                // Se marcar concluído, adiciona ✅ no título
                summary: updates.concluido
                    ? `✅ ${atual.summary.replace(/^✅\s*/, '')}`
                    : atual.summary.replace(/^✅\s*/, ''),
            },
        })

        return Response.json({ ok: true })
    } catch (err) {
        console.error('[calendar] Erro ao atualizar evento:', err.message)
        return Response.json({ error: err.message }, { status: 500 })
    }
}

// DELETE /api/calendar — remove evento do Google Calendar
export async function DELETE(request) {
    const { eventId } = await request.json()
    if (!eventId) return Response.json({ error: 'eventId obrigatório' }, { status: 400 })

    const calendar = await getCalendarClient()
    if (!calendar) return Response.json({ error: 'Não conectado' }, { status: 401 })

    try {
        await calendar.events.delete({ calendarId: 'primary', eventId })
        return Response.json({ ok: true })
    } catch (err) {
        console.error('[calendar] Erro ao deletar evento:', err.message)
        return Response.json({ error: err.message }, { status: 500 })
    }
}
