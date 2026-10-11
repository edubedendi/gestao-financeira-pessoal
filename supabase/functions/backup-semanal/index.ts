// Backup semanal do banco -> arquivo .json.gz enviado ao Telegram
// Edge Function do Supabase, agendada por pg_cron (domingo, logo apos o resumo semanal).

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TG_TOKEN = Deno.env.get("TELEGRAM_TOKEN")!;
const TG_CHAT = Deno.env.get("TELEGRAM_CHAT_ID")!;

const TABELAS = [
  "perfis", "contas", "cartoes", "categorias", "favorecidos", "grupos",
  "recorrencias", "regras_categorizacao", "lancamentos", "orcamento",
  "metas_poupanca", "aportes_poupanca", "config_poupanca_mensal",
  "holerites", "holerite_itens"
];

// Le uma tabela inteira, em paginas de 1000 linhas
async function exportarTabela(tabela: string) {
  const linhas: unknown[] = [];
  const passo = 1000;
  let inicio = 0;
  while (true) {
    const r = await fetch(SB_URL + "/rest/v1/" + tabela + "?select=*&order=id", {
      headers: {
        apikey: SB_KEY,
        Authorization: "Bearer " + SB_KEY,
        "Range-Unit": "items",
        Range: inicio + "-" + (inicio + passo - 1)
      }
    });
    if (!r.ok) throw new Error(tabela + ": HTTP " + r.status + " " + (await r.text()));
    const lote = await r.json();
    linhas.push(...lote);
    if (lote.length < passo) break;
    inicio += passo;
  }
  return linhas;
}

async function gzip(texto: string): Promise<Blob> {
  const fluxo = new Blob([texto]).stream().pipeThrough(new CompressionStream("gzip"));
  return await new Response(fluxo).blob();
}

Deno.serve(async () => {
  try {
    const agora = new Date();
    const dataBR = new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const tabelas: Record<string, unknown[]> = {};
    const contagens: Record<string, number> = {};
    for (const t of TABELAS) {
      tabelas[t] = await exportarTabela(t);
      contagens[t] = tabelas[t].length;
    }

    const conteudo = JSON.stringify({
      formato: "backup-financas-v1",
      gerado_em: agora.toISOString(),
      contagens,
      tabelas
    });
    const arquivo = await gzip(conteudo);
    const nome = "backup-financas-" + dataBR + ".json.gz";

    const total = Object.values(contagens).reduce((a, b) => a + b, 0);
    const legenda = "Backup semanal - " + dataBR + "\n" +
      total + " registros em " + TABELAS.length + " tabelas\n" +
      "Lancamentos: " + contagens["lancamentos"] + " | Categorias: " + contagens["categorias"] +
      " | Recorrencias: " + contagens["recorrencias"];

    const form = new FormData();
    form.append("chat_id", TG_CHAT);
    form.append("caption", legenda);
    form.append("document", arquivo, nome);

    const envio = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendDocument", {
      method: "POST",
      body: form
    });
    const resposta = await envio.text();
    if (!envio.ok) throw new Error("Telegram " + envio.status + ": " + resposta);

    return new Response(JSON.stringify({ ok: true, arquivo: nome, registros: total, contagens }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, erro: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
