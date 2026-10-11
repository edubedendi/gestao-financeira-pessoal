// Resumo semanal das finanças → Telegram
// Edge Function do Supabase. Agendada por pg_cron (domingo, 19:00 UTC = 16h de Brasília).

const SB_URL   = Deno.env.get("SUPABASE_URL")!;
const SB_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TG_TOKEN = Deno.env.get("TELEGRAM_TOKEN")!;
const TG_CHAT  = Deno.env.get("TELEGRAM_CHAT_ID")!;

// Data de hoje no fuso de Brasília (UTC-3)
function hojeBR(): Date {
  const agora = new Date();
  return new Date(agora.getTime() - 3 * 60 * 60 * 1000);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function real(v: number): string {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function consultar(path: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return await r.json();
}

Deno.serve(async () => {
  try {
    const hoje = hojeBR();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const mesStr = String(mes).padStart(2, "0");

    const inicioMes = `${ano}-${mesStr}-01`;
    const fimMes = iso(new Date(ano, mes, 0));
    const seteDiasAtras = iso(new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000));

    // Lançamentos do mês (com nome da categoria)
    const lanc = await consultar(
      `lancamentos?data=gte.${inicioMes}&data=lte.${fimMes}` +
      `&select=data,descricao,valor,tipo,categoria_id,conciliado,cartao_id,observacao,categorias(nome)`
    );

    // O detalhamento do holerite é só referência, não entra nos totais
    // Categorias "fora do controle mensal" (dinheiro de terceiros) não entram no resumo
    const cats = await consultar(`categorias?select=id,parent_id,fora_do_controle`);
    const fora = new Set(cats.filter((c: any) => c.fora_do_controle).map((c: any) => c.id));
    for (const c of cats) if (c.parent_id && fora.has(c.parent_id)) fora.add(c.id);
    const reais = lanc.filter((l: any) => l.observacao !== "__hol__" && !fora.has(l.categoria_id));

    const receitas = reais.filter((l: any) => l.tipo === "receita")
      .reduce((s: number, l: any) => s + Number(l.valor), 0);
    const despesas = reais.filter((l: any) => l.tipo === "despesa")
      .reduce((s: number, l: any) => s + Number(l.valor), 0);
    const saldo = receitas - despesas;

    // Gastos dos últimos 7 dias, agrupados por categoria
    const semana = reais.filter((l: any) => l.tipo === "despesa" && l.data >= seteDiasAtras);
    const totalSemana = semana.reduce((s: number, l: any) => s + Number(l.valor), 0);

    const porCategoria = new Map<string, number>();
    for (const l of semana) {
      const nome = l.categorias?.nome || "Sem categoria";
      porCategoria.set(nome, (porCategoria.get(nome) || 0) + Number(l.valor));
    }
    const topCategorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Pendências
    const semCategoria = reais.filter((l: any) => !l.categoria_id && l.tipo !== "transferencia").length;
    const aConciliar = reais.filter((l: any) =>
      !l.conciliado && !l.cartao_id && l.tipo !== "transferencia" && l.data <= iso(hoje)
    ).length;

    // Cartões: fatura do mês e vencimentos
    const cartoes = await consultar(`cartoes?ativo=eq.true&select=id,nome,dia_vencimento`);
    const linhasCartao: string[] = [];
    for (const c of cartoes) {
      const total = reais
        .filter((l: any) => l.cartao_id === c.id)
        .reduce((s: number, l: any) => s + Number(l.valor), 0);
      if (total > 0) {
        linhasCartao.push(`• ${c.nome}: ${real(total)} (vence dia ${c.dia_vencimento})`);
      }
    }

    // Monta a mensagem
    const partes: string[] = [];
    partes.push(`<b>📊 Resumo da semana</b>`);
    partes.push(`<i>${hoje.toLocaleDateString("pt-BR")}</i>`);
    partes.push("");
    partes.push(`<b>Gasto nos últimos 7 dias:</b> ${real(totalSemana)}`);
    if (topCategorias.length) {
      partes.push(topCategorias.map(([nome, v]) => `• ${nome}: ${real(v)}`).join("\n"));
    }
    partes.push("");
    partes.push(`<b>Mês até aqui</b>`);
    partes.push(`↑ Receitas: ${real(receitas)}`);
    partes.push(`↓ Despesas: ${real(despesas)}`);
    partes.push(`${saldo >= 0 ? "✅" : "🔴"} Saldo: ${real(saldo)}`);

    if (linhasCartao.length) {
      partes.push("");
      partes.push(`<b>💳 Faturas do mês</b>`);
      partes.push(linhasCartao.join("\n"));
    }

    if (semCategoria || aConciliar) {
      partes.push("");
      partes.push(`<b>🔔 Pendências</b>`);
      if (semCategoria) partes.push(`• ${semCategoria} sem categoria`);
      if (aConciliar) partes.push(`• ${aConciliar} a conciliar`);
      partes.push(`<a href="https://gestao-financeira-pessoal-tau.vercel.app">Abrir o app</a>`);
    } else {
      partes.push("");
      partes.push(`✅ Nenhuma pendência.`);
    }

    const texto = partes.join("\n");

    const envio = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: texto,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const resposta = await envio.text();
    if (!envio.ok) throw new Error(`Telegram ${envio.status}: ${resposta}`);

    return new Response(JSON.stringify({ ok: true, enviado: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, erro: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
