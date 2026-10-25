# Banco de dados (Supabase) — como reconstruir

Esta pasta guarda a **estrutura** do backend do app de finanças, para que ele possa ser recriado do zero.
Ela **não contém dados, senhas, chaves nem tokens** — o repositório é público.

## Conteúdo

| Arquivo | O que é |
|---|---|
| `esquema-banco.sql` | Tabelas, chaves, índices, políticas de segurança (RLS), funções e agendamentos — extraído do banco real |
| `functions/resumo-semanal/index.ts` | Edge Function do resumo semanal no Telegram |
| `functions/backup-semanal/index.ts` | Edge Function do backup semanal enviado ao Telegram |
| `functions/alerta-diario/index.ts` | Edge Function do alerta diário (vencimentos, pendências, situação do mês) |

## Reconstrução, na ordem

1. **Criar o projeto** no Supabase e ativar as extensões `pg_cron` e `pg_net` (Database → Extensions).
2. **Rodar `esquema-banco.sql`** no SQL Editor. Antes, substitua as duas ocorrências de `COLE_AQUI_A_ANON_KEY` pela *anon key* do novo projeto, e ajuste a URL do projeto nos agendamentos se ela mudar.
3. **Criar as Edge Functions** `resumo-semanal`, `backup-semanal` e `alerta-diario` (Edge Functions → Deploy a new function → Via Editor), colando o `index.ts` de cada uma.
4. **Cadastrar os segredos** em Edge Functions → Secrets: `TELEGRAM_TOKEN` (BotFather) e `TELEGRAM_CHAT_ID`. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem automaticamente.
5. **Restaurar os dados** a partir do último arquivo `backup-financas-AAAA-MM-DD.json.gz` recebido no Telegram.
6. **Atualizar o `index.html`** com a URL e a anon key do novo projeto.

## Rotinas automáticas

| Agendamento | Quando (Brasília) | O que faz |
|---|---|---|
| `gerar-recorrencias` | dia 1 de cada mês, 03h | Cria os lançamentos das recorrências ativas do mês |
| `resumo-semanal` | domingo, 16h | Envia o resumo da semana ao Telegram |
| `backup-semanal` | domingo, 16h10 | Envia o backup completo ao Telegram |
| alerta diário (GitHub Actions) | todo dia, 12h | Chama `alerta-diario` (o que também mantém o projeto ativo). Se o Supabase não responder após 4 tentativas, o próprio GitHub avisa no Telegram |

O alerta diário fica em `.github/workflows/keep-alive.yml` e usa os secrets do repositório `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID`.

## Manutenção

Sempre que a estrutura do banco mudar (coluna, função, política ou agendamento novos), gere de novo o `esquema-banco.sql` e substitua o arquivo aqui.
