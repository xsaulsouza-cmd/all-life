@AGENTS.md
# Sistema Saul — Briefing Completo do Projeto

## Visão Geral
Sistema pessoal de gestão de tarefas, projetos e rotina do Saul Franco Souza.
Substitui o Notion como ferramenta de gestão diária. A interface deve ser rápida,
visual e responder "o que fazer agora" sem fricção.

## Stack Técnica
- Next.js 16.2.9 (App Router, Turbopack)
- Tailwind CSS (estilização por classes utilitárias)
- Supabase (PostgreSQL) — banco de dados principal
- JavaScript puro (sem TypeScript)
- @supabase/supabase-js para conexão

## Regras de Código
- Todos os componentes são 'use client' com useEffect para buscar dados
- Nunca usar TypeScript ou .tsx
- Sempre Tailwind para estilo, nunca CSS inline ou arquivos .css separados
- Nunca inventar dados — sempre buscar do Supabase
- Importar Supabase sempre de `@/lib/supabase`
- Componentes reutilizáveis ficam em `app/components/`

## Estrutura de Pastas
sistema-saul/

├── app/

│   ├── components/     ← componentes reutilizáveis

│   ├── globals.css     ← apenas @import "tailwindcss"

│   ├── layout.js       ← html + body + sidebar

│   └── page.js         ← página principal

├── lib/

│   └── supabase.js     ← cliente Supabase

└── .env.local          ← variáveis de ambiente (nunca commitar)

## Tabela `tarefas` no Supabase
| Campo | Tipo | Valores possíveis |
|---|---|---|
| id | UUID | gerado automaticamente |
| nome | text | nome da tarefa |
| area | text | Relatórios SPF/PGE, SETDIG / CRC, Prospecção Pública, Petra, Cannalab, Incorporação Familiar, Mounjaro, Pessoal, Direito / OAB |
| projeto | text | nome do projeto |
| portfolio | text | subgrupo do projeto |
| prioridade | text | Urgente, Alta, Média |
| frequencia | text | Diária, Semanal, Mensal, Projeto |
| dia_semana | text | Segunda, Terça, Quarta, Quinta, Sexta, Sábado, Domingo |
| tempo_estimado | text | ex: 30min, 1h, 2h, 3h+ |
| status | text | Não iniciada, Em andamento, Concluído |
| prazo | date | data limite |
| notas | text | observações livres |
| criada_em | timestamptz | automático |
| atualizada_em | timestamptz | automático |

## Áreas e Projetos
- 💼 Trabalho: Relatórios SPF & PGE, SETDIG / CRC, Prospecção Pública, Petra, Cannalab, Incorporação Familiar, Mounjaro
- 🏠 Pessoal: Financeiro Pessoal, Saúde & Bem-estar, Rotina & Organização
- 🎓 Faculdade: UFMS — Direito, OAB — Preparação

## Design System
### Cores
- Fundo geral: #F7F7F8
- Surface (cards): #FFFFFF
- Surface secundária: #F0F0F2
- Borda: #E4E4E7
- Texto principal: #18181B
- Texto secundário: #71717A
- Texto terciário: #A1A1AA
- Acento/ativo: #6366F1 (roxo)
- Urgente: #DC2626 (vermelho), fundo #FEF2F2
- Alta: #D97706 (laranja), fundo #FFFBEB
- Média: #2563EB (azul), fundo #EFF6FF
- Concluído: #16A34A (verde)

### Componentes Padrão
- Cards: bg-white rounded-lg border border-gray-200 p-4
- Badges de prioridade: pill colorido por prioridade
- Badges de status: cinza=Não iniciada, azul=Em andamento, verde=Concluído
- Checkbox circular com borda colorida por prioridade
- Sidebar: 220px, fixa, fundo branco, borda direita

## Views do Sistema
1. **Hoje** — vencidas + recorrentes do dia da semana + urgentes
2. **Semana** — agrupado por dia da semana
3. **Gantt** — linha do tempo por prazo
4. **Por Projeto** — árvore Área → Projeto → Tarefas com % conclusão
5. **Recorrentes** — agrupado por Diária/Semanal/Mensal/Projeto
6. **Trabalho / Pessoal / Faculdade** — KPIs + lista filtrada por área

## Comportamentos Esperados
- Clicar numa tarefa marca como Concluído/Não iniciada (toggle)
- Ao marcar, atualizar no Supabase via: `supabase.from('tarefas').update({status}).eq('id', id)`
- Tarefas concluídas ficam com opacidade reduzida e texto riscado
- Ordenação padrão: Urgente → Alta → Média
- Data de hoje para calcular vencidas e dia da semana atual

## O que NÃO fazer
- Não usar localStorage como banco de dados
- Não hardcodar tarefas no código — sempre vir do Supabase
- Não criar autenticação ainda
- Não usar bibliotecas de UI externas (shadcn, chakra, etc.)
- Não criar arquivos CSS separados
## Integração Google Calendar
- Client ID: disponível em process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
- Client Secret: disponível em process.env.GOOGLE_CLIENT_SECRET
- Biblioteca: googleapis (instalar via npm install googleapis)
- Fluxo: OAuth 2.0 — usuário autoriza uma vez, token salvo no Supabase
- Ao criar tarefa com prazo: criar evento no Google Calendar automaticamente
- Ao marcar tarefa como concluída: atualizar evento no Calendar

## Módulo Desafios & Rotina (a construir)
Tabelas necessárias no Supabase:
- `metas`: id, titulo, descricao, prazo, progresso (0-100), status, area, criada_em
- `habitos`: id, nome, frequencia, categoria, ativo, criada_em  
- `habitos_registro`: id, habito_id, data, concluido
- `treinos`: id, modalidade (musculação/jiu-jitsu/pilates), data, duracao_min, notas
- `desafios`: id, titulo, descricao, data_inicio, data_fim, progresso, status

## Chat com Claude (a construir)
- Botão flutuante no canto inferior direito
- Painel lateral de chat
- Claude responde com base nos dados reais do Supabase
- Pode criar/atualizar tarefas via linguagem natural
- API route em app/api/chat/route.js usando Anthropic SDK