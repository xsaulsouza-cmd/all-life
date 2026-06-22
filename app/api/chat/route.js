import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  const { mensagem, contextoBanco } = await request.json()

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sua_chave_aqui') {
    return Response.json({ resposta: 'API key do Anthropic não configurada. Adicione sua chave ANTHROPIC_API_KEY no .env.local.' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `Você é um assistente de gestão pessoal integrado ao sistema All Life.
Você tem acesso ao banco de dados de tarefas e pode criar, editar e consultar tarefas.
Contexto atual do banco: ${JSON.stringify(contextoBanco)}
Quando o usuário pedir para criar uma tarefa, retorne um JSON no formato:
{ "acao": "criar_tarefa", "dados": { "nome": "...", "area": "...", "projeto": "...", "prioridade": "...", "prazo": "..." } }
Quando for só uma resposta de texto, retorne normalmente.`,
        messages: [{ role: 'user', content: mensagem }]
      })
    })

    const data = await response.json()

    if (data.error) {
      console.error('Erro Anthropic:', data.error)
      return Response.json({ resposta: `Erro na API do Claude: ${data.error.message}` })
    }

    return Response.json({ resposta: data.content[0].text })
  } catch (err) {
    console.error('Erro ao comunicar com Anthropic:', err)
    return Response.json({ resposta: 'Ocorreu um erro interno de comunicação.' })
  }
}
