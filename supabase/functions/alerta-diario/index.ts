// Alerta diário das finanças -> Telegram (12h de Brasília, disparado pelo GitHub Actions)
// Mesmas regras do card de fluxo do app: realizado, agendado, previsto, selo e saldo previsto.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TG_TOKEN = Deno.env.get("TELEGRAM_TOKEN")!;
const TG_CHAT = Deno.env.get("TELEGRAM_CHAT_ID")!;
const APP_URL = "https://gestao-financeira-pessoal-tau.vercel.app";
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const HOLERITE = ["coparticipacao unimed", "dsr reflexo", "desconto refeicao", "horas extras c/ 100%", "horas extras c/ 50%",
  "horas normais", "inss", "irrf", "mensalidade unimed", "refeicao empresa", "seguro de vida", "taxa assistencial sindicato"];

function semAcento(t: string): string {
  return (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function iso(d: Date): string { return d.toISOString().slice(0, 10); }
function real(v: number): string {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function sinal(v: number): string { return (v >= 0 ? "+ " : "- ") + real(Math.abs(v)); }
function ultimoDia(a: number, m: number): number { return new Date(Date.UTC(a, m, 0)).getUTCDate(); }

// Le todas as linhas de uma consulta, em paginas de 1000
async function consultar(caminho: string): Promise<any[]> {
  const linhas: any[] = [];
  let inicio = 0;
  while (true) {
    const r = await fetch(SB_URL + "/rest/v1/" + caminho, {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Range-Unit": "items", Range: inicio + "-" + (inicio + 999) }
    });
    if (!r.ok) throw new Error(caminho.split("?")[0] + ": HTTP " + r.status + " " + (await r.text()));
    const lote = await r.json();
    linhas.push(...lote);
    if (lote.length < 1000) break;
    inicio += 1000;
  }
  return linhas;
}

Deno.serve(async () => {
  try {
    // Datas no fuso de Brasilia
    const agoraBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const hoje = iso(agoraBR);
    const amanha = iso(new Date(agoraBR.getTime() + 24 * 60 * 60 * 1000));
    const ano = Number(hoje.slice(0, 4)), mes = Number(hoje.slice(5, 7));
    const mesStr = String(mes).padStart(2, "0");
    const inicioMes = ano + "-" + mesStr + "-01";
    const fimMes = ano + "-" + mesStr + "-" + String(ultimoDia(ano, mes)).padStart(2, "0");
    const fimJanela = amanha > fimMes ? amanha : fimMes;

    const [contas, cartoes, categorias, lancMes, orcamento] = await Promise.all([
      consultar("contas?select=id,nome,tipo,saldo_inicial,colchao_minimo,ativo&order=id"),
      consultar("cartoes?select=id,nome,dia_vencimento,ativo,conta_pagamento_id&order=id"),
      consultar("categorias?select=id,nome,tipo,parent_id,fora_do_controle,conta_padrao_id&order=id"),
      consultar("lancamentos?select=id,data,descricao,valor,tipo,categoria_id,conta_id,cartao_id,conciliado,observacao" +
        "&data=gte." + inicioMes + "&data=lte." + fimJanela + "&order=id"),
      consultar("orcamento?select=categoria_id,valor_planejado&mes=eq." + mes + "&ano=eq." + ano + "&order=id")
    ]);

    const catPorId = new Map(categorias.map((c: any) => [c.id, c]));
    const foraDoControle = (id: string) => {
      const c: any = catPorId.get(id); if (!c) return false;
      if (c.fora_do_controle) return true;
      const p: any = c.parent_id ? catPorId.get(c.parent_id) : null;
      return !!(p && p.fora_do_controle);
    };
    const ehHolerite = (c: any) => {
      if (!HOLERITE.includes(semAcento(c.nome))) return false;
      if (!c.parent_id) return true;
      const p: any = catPorId.get(c.parent_id);
      return /holerite/i.test(p ? p.nome : "");
    };
    const foraDoMes = (l: any) => l.observacao === "__hol__" || foraDoControle(l.categoria_id);

    // ---------- 1) O que vence hoje e amanha ----------
    const vence: Record<string, string[]> = { [hoje]: [], [amanha]: [] };
    const pagamentos = lancMes.filter((l: any) => l.observacao === "__pgtofatura__");
    for (const dia of [hoje, amanha]) {
      const a = Number(dia.slice(0, 4)), m = Number(dia.slice(5, 7)), d = Number(dia.slice(8, 10));
      const ini = a + "-" + String(m).padStart(2, "0") + "-01";
      const fim = a + "-" + String(m).padStart(2, "0") + "-" + String(ultimoDia(a, m)).padStart(2, "0");
      for (const c of cartoes.filter((x: any) => x.ativo !== false && Number(x.dia_vencimento) === d)) {
        const total = lancMes.filter((l: any) => l.cartao_id === c.id && l.tipo === "despesa" && l.data >= ini && l.data <= fim)
          .reduce((t: number, l: any) => t + Number(l.valor), 0);
        if (total <= 0) continue;
        const ref = "(" + MESES[m - 1] + "/" + a + ")";
        const paga = pagamentos.some((p: any) => (p.descricao || "").includes(c.nome) && semAcento(p.descricao || "").includes(semAcento(ref)));
        vence[dia].push("💳 Fatura " + c.nome + ": " + real(total) + (paga ? " ✅ paga" : ""));
      }
      for (const l of lancMes.filter((x: any) => x.data === dia && x.conta_id && !x.cartao_id && !x.conciliado && x.observacao !== "__pgtofatura__")) {
        const conta: any = contas.find((c: any) => c.id === l.conta_id);
        vence[dia].push((l.tipo === "receita" ? "↑ " : "↓ ") + l.descricao + ": " + real(Number(l.valor)) + (conta ? " (" + conta.nome + ")" : ""));
      }
    }

    // ---------- 2) Pendencias do mes ----------
    const doMes = lancMes.filter((l: any) => l.data >= inicioMes && l.data <= fimMes && !foraDoMes(l));
    const semCategoria = doMes.filter((l: any) => !l.categoria_id && l.tipo !== "transferencia").length;
    const aConciliar = doMes.filter((l: any) => !l.conciliado && !l.cartao_id && l.tipo !== "transferencia" && l.data <= hoje).length;

    // ---------- 3) Fluxo do mes, selo e saldo previsto (conta principal) ----------
    const principalId = (cartoes.find((c: any) => c.conta_pagamento_id) || {} as any).conta_pagamento_id
      || (contas.find((c: any) => c.tipo === "corrente") || contas[0] || {} as any).id;
    const conta: any = contas.find((c: any) => c.id === principalId);
    let blocoFluxo = "";
    if (conta) {
      const anteriores = await consultar("lancamentos?select=valor,tipo,observacao&conta_id=eq." + conta.id + "&data=lt." + inicioMes + "&order=id");
      const saldoInicio = Number(conta.saldo_inicial || 0) + anteriores.filter((l: any) => l.observacao !== "__hol__")
        .reduce((t: number, l: any) => t + (l.tipo === "receita" ? 1 : -1) * Number(l.valor), 0);

      const daConta = lancMes.filter((l: any) => l.conta_id === conta.id && l.data >= inicioMes && l.data <= fimMes && l.observacao !== "__hol__");
      const terc = daConta.filter((l: any) => foraDoControle(l.categoria_id));
      const tercLiq = terc.reduce((t: number, l: any) => t + (l.tipo === "receita" ? 1 : -1) * Number(l.valor), 0);
      const meus = daConta.filter((l: any) => !foraDoControle(l.categoria_id));
      const ent = meus.filter((l: any) => l.tipo === "receita").reduce((t: number, l: any) => t + Number(l.valor), 0);
      const sai = meus.filter((l: any) => l.tipo !== "receita").reduce((t: number, l: any) => t + Number(l.valor), 0);

      // Faturas do mes pagas por esta conta e ainda nao registradas como pagas
      let faturas = 0;
      const refMes = semAcento("(" + MESES[mes - 1] + "/" + ano + ")");
      for (const c of cartoes.filter((x: any) => x.ativo !== false && (x.conta_pagamento_id ? x.conta_pagamento_id === conta.id : conta.id === principalId))) {
        const total = lancMes.filter((l: any) => l.cartao_id === c.id && l.tipo === "despesa" && l.data >= inicioMes && l.data <= fimMes)
          .reduce((t: number, l: any) => t + Number(l.valor), 0);
        const paga = daConta.some((p: any) => p.observacao === "__pgtofatura__" && (p.descricao || "").includes(c.nome) && semAcento(p.descricao || "").includes(refMes));
        if (total > 0 && !paga) faturas += total;
      }

      // Orcamento planejado que ainda nao aconteceu, atribuido a esta conta
      const realPorCat: Record<string, number> = {};
      for (const l of lancMes.filter((x: any) => x.data >= inicioMes && x.data <= fimMes && !foraDoMes(x) && x.categoria_id)) {
        realPorCat[l.categoria_id] = (realPorCat[l.categoria_id] || 0) + Number(l.valor);
      }
      let recPrev = 0, despPrev = 0;
      for (const o of orcamento) {
        const cat: any = catPorId.get(o.categoria_id);
        if (!cat || ehHolerite(cat) || foraDoControle(cat.id)) continue;
        const pai: any = cat.parent_id ? catPorId.get(cat.parent_id) : null;
        const contaCat = cat.conta_padrao_id || (pai && pai.conta_padrao_id) || principalId;
        if (contaCat !== conta.id) continue;
        const ids = [cat.id].concat(cat.parent_id ? [] : categorias.filter((c: any) => c.parent_id === cat.id).map((c: any) => c.id));
        const falta = Number(o.valor_planejado) - ids.reduce((t: number, id: string) => t + (realPorCat[id] || 0), 0);
        if (falta <= 0.004) continue;
        if (cat.tipo === "receita") recPrev += falta; else despPrev += falta;
      }

      const resultado = (ent + recPrev) - (sai + faturas + despPrev);
      const saldoPrevisto = saldoInicio + resultado + tercLiq;
      const colchao = Number(conta.colchao_minimo || 0);
      let selo;
      if (saldoPrevisto < 0) selo = "🔴 Desfavorável";
      else if (resultado < 0 && saldoPrevisto < colchao) selo = "🔴 Desfavorável";
      else if (resultado < 0 || saldoPrevisto < colchao) selo = "🟡 Atenção";
      else selo = "🟢 Favorável";

      blocoFluxo = "<b>🧭 " + MESES[mes - 1] + " — " + selo + "</b>\n" +
        "Resultado do mês: " + sinal(resultado) + "\n" +
        "Saldo previsto em " + ultimoDia(ano, mes) + "/" + mesStr + " (" + conta.nome + "): " + real(saldoPrevisto);
    }

    // ---------- Mensagem ----------
    const fmt = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
    const partes: string[] = [];
    partes.push("<b>☀️ Alerta do dia — " + fmt(hoje) + "</b>");
    partes.push("");
    if (vence[hoje].length || vence[amanha].length) {
      if (vence[hoje].length) partes.push("<b>Hoje</b>\n" + vence[hoje].map(x => "• " + x).join("\n"));
      if (vence[amanha].length) partes.push("<b>Amanhã (" + fmt(amanha) + ")</b>\n" + vence[amanha].map(x => "• " + x).join("\n"));
    } else {
      partes.push("Nada vence hoje nem amanhã.");
    }
    partes.push("");
    partes.push(semCategoria || aConciliar
      ? "<b>🔔 Pendências:</b> " + [semCategoria ? semCategoria + " sem categoria" : "", aConciliar ? aConciliar + " a conciliar" : ""].filter(Boolean).join(" · ")
      : "✅ Nenhuma pendência.");
    if (blocoFluxo) { partes.push(""); partes.push(blocoFluxo); }
    partes.push("");
    partes.push("<a href=\"" + APP_URL + "\">Abrir o app</a>");

    const envio = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text: partes.join("\n"), parse_mode: "HTML", disable_web_page_preview: true })
    });
    const resposta = await envio.text();
    if (!envio.ok) throw new Error("Telegram " + envio.status + ": " + resposta);

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, erro: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
