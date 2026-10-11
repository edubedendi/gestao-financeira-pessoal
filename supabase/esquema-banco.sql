-- Estrutura do banco do app de finanças (Supabase)
-- Gerado em 11/10/2026, 15:42:06 a partir do banco real. Sem dados, sem chaves.
-- Antes de rodar: troque COLE_AQUI_A_ANON_KEY pela anon key do projeto.

-- ==== TABELAS ====
create table if not exists public.aportes_poupanca (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  meta_id uuid not null,
  mes integer not null,
  ano integer not null,
  valor numeric(12,2) not null,
  data date not null,
  observacao text,
  created_at timestamp with time zone default now(),
  lancamento_id uuid,
  constraint aportes_poupanca_pkey PRIMARY KEY (id),
  constraint aportes_poupanca_mes_check CHECK (((mes >= 1) AND (mes <= 12)))
);
alter table public.aportes_poupanca enable row level security;

create table if not exists public.cartoes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  bandeira text default 'Visa'::text,
  limite numeric(12,2) default 0,
  dia_fechamento integer not null,
  dia_vencimento integer not null,
  cor text default '#6366f1'::text,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  conta_pagamento_id uuid,
  constraint cartoes_pkey PRIMARY KEY (id),
  constraint cartoes_dia_fechamento_check CHECK (((dia_fechamento >= 1) AND (dia_fechamento <= 31))),
  constraint cartoes_dia_vencimento_check CHECK (((dia_vencimento >= 1) AND (dia_vencimento <= 31)))
);
alter table public.cartoes enable row level security;

create table if not exists public.categorias (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  tipo text not null,
  cor text default '#6366f1'::text,
  icone text default '📁'::text,
  parent_id uuid,
  created_at timestamp with time zone default now(),
  holerite_tipo text,
  conta_padrao_id uuid,
  fora_do_controle boolean not null default false,
  constraint categorias_pkey PRIMARY KEY (id),
  constraint categorias_holerite_tipo_check CHECK ((holerite_tipo = ANY (ARRAY['provento'::text, 'desconto'::text, 'desconto_fiscal'::text]))),
  constraint categorias_tipo_check CHECK ((tipo = ANY (ARRAY['receita'::text, 'despesa'::text])))
);
alter table public.categorias enable row level security;

create table if not exists public.config_poupanca_mensal (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  mes integer not null,
  ano integer not null,
  percentual numeric(5,2) not null default 10,
  created_at timestamp with time zone default now(),
  constraint config_poupanca_mensal_user_id_mes_ano_key UNIQUE (user_id, mes, ano),
  constraint config_poupanca_mensal_pkey PRIMARY KEY (id),
  constraint config_poupanca_mensal_mes_check CHECK (((mes >= 1) AND (mes <= 12)))
);
alter table public.config_poupanca_mensal enable row level security;

create table if not exists public.contas (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  banco text default 'Bradesco'::text,
  tipo text default 'corrente'::text,
  saldo_inicial numeric(12,2) default 0,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  colchao_minimo numeric not null default 0,
  constraint contas_pkey PRIMARY KEY (id),
  constraint contas_tipo_check CHECK ((tipo = ANY (ARRAY['corrente'::text, 'poupanca'::text, 'investimento'::text, 'outro'::text])))
);
alter table public.contas enable row level security;

create table if not exists public.favorecidos (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  icone text default '🏢'::text,
  created_at timestamp with time zone default now(),
  constraint favorecidos_pkey PRIMARY KEY (id)
);
alter table public.favorecidos enable row level security;

create table if not exists public.grupos (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  icone text default '🎯'::text,
  cor text default '#4f46e5'::text,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  constraint grupos_pkey PRIMARY KEY (id)
);
alter table public.grupos enable row level security;

create table if not exists public.holerite_itens (
  id uuid not null default gen_random_uuid(),
  holerite_id uuid not null,
  nome text not null,
  tipo text not null,
  valor numeric(12,2) not null,
  ordem integer default 0,
  constraint holerite_itens_pkey PRIMARY KEY (id),
  constraint holerite_itens_tipo_check CHECK ((tipo = ANY (ARRAY['provento'::text, 'desconto'::text])))
);
alter table public.holerite_itens enable row level security;

create table if not exists public.holerites (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  mes integer not null,
  ano integer not null,
  observacao text,
  created_at timestamp with time zone default now(),
  constraint holerites_user_id_mes_ano_key UNIQUE (user_id, mes, ano),
  constraint holerites_pkey PRIMARY KEY (id),
  constraint holerites_mes_check CHECK (((mes >= 1) AND (mes <= 12)))
);
alter table public.holerites enable row level security;

create table if not exists public.lancamentos (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  data date not null,
  descricao text not null,
  valor numeric(12,2) not null,
  tipo text not null,
  categoria_id uuid,
  cartao_id uuid,
  parcela_atual integer,
  total_parcelas integer,
  parcela_grupo_id uuid,
  recorrente boolean default false,
  observacao text,
  created_at timestamp with time zone default now(),
  forma_pagamento text default 'dinheiro'::text,
  favorecido_id uuid,
  recorrencia_id uuid,
  conta_id uuid,
  grupo_id uuid,
  conciliado boolean default false,
  rateio_grupo_id uuid,
  data_compra date,
  constraint lancamentos_pkey PRIMARY KEY (id),
  constraint lancamentos_tipo_check CHECK ((tipo = ANY (ARRAY['receita'::text, 'despesa'::text, 'transferencia'::text])))
);
alter table public.lancamentos enable row level security;

create table if not exists public.metas_poupanca (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  valor_meta numeric(12,2),
  prazo date,
  cor text default '#10b981'::text,
  icone text default '🎯'::text,
  ativa boolean default true,
  created_at timestamp with time zone default now(),
  constraint metas_poupanca_pkey PRIMARY KEY (id)
);
alter table public.metas_poupanca enable row level security;

create table if not exists public.orcamento (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  categoria_id uuid not null,
  mes integer not null,
  ano integer not null,
  valor_planejado numeric(12,2) not null default 0,
  created_at timestamp with time zone default now(),
  constraint orcamento_user_id_categoria_id_mes_ano_key UNIQUE (user_id, categoria_id, mes, ano),
  constraint orcamento_pkey PRIMARY KEY (id),
  constraint orcamento_mes_check CHECK (((mes >= 1) AND (mes <= 12)))
);
alter table public.orcamento enable row level security;

create table if not exists public.perfis (
  id uuid not null,
  nome text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  constraint perfis_pkey PRIMARY KEY (id)
);
alter table public.perfis enable row level security;

create table if not exists public.recorrencias (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  favorecido_id uuid,
  categoria_id uuid,
  valor numeric(12,2) not null,
  tipo text not null,
  cartao_id uuid,
  forma_pagamento text default 'dinheiro'::text,
  dia_do_mes integer not null default 1,
  ativa boolean default true,
  created_at timestamp with time zone default now(),
  conta_id uuid,
  constraint recorrencias_pkey PRIMARY KEY (id),
  constraint recorrencias_dia_do_mes_check CHECK (((dia_do_mes >= 1) AND (dia_do_mes <= 28))),
  constraint recorrencias_tipo_check CHECK ((tipo = ANY (ARRAY['receita'::text, 'despesa'::text])))
);
alter table public.recorrencias enable row level security;

create table if not exists public.regras_categorizacao (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  padrao text not null,
  categoria_id uuid,
  favorecido_id uuid,
  forma_pagamento text,
  prioridade integer not null default 100,
  usos integer not null default 0,
  ativa boolean not null default true,
  created_at timestamp with time zone default now(),
  constraint regras_categorizacao_pkey PRIMARY KEY (id)
);
alter table public.regras_categorizacao enable row level security;

-- ==== CHAVES ESTRANGEIRAS ====
alter table public.aportes_poupanca add constraint aportes_poupanca_lancamento_id_fkey FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id) ON DELETE SET NULL;
alter table public.aportes_poupanca add constraint aportes_poupanca_meta_id_fkey FOREIGN KEY (meta_id) REFERENCES metas_poupanca(id) ON DELETE CASCADE;
alter table public.aportes_poupanca add constraint aportes_poupanca_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.cartoes add constraint cartoes_conta_pagamento_id_fkey FOREIGN KEY (conta_pagamento_id) REFERENCES contas(id) ON DELETE SET NULL;
alter table public.cartoes add constraint cartoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.categorias add constraint categorias_conta_padrao_id_fkey FOREIGN KEY (conta_padrao_id) REFERENCES contas(id) ON DELETE SET NULL;
alter table public.categorias add constraint categorias_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public.categorias add constraint categorias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.config_poupanca_mensal add constraint config_poupanca_mensal_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.contas add constraint contas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.favorecidos add constraint favorecidos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.grupos add constraint grupos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.holerite_itens add constraint holerite_itens_holerite_id_fkey FOREIGN KEY (holerite_id) REFERENCES holerites(id) ON DELETE CASCADE;
alter table public.holerites add constraint holerites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.lancamentos add constraint lancamentos_cartao_id_fkey FOREIGN KEY (cartao_id) REFERENCES cartoes(id) ON DELETE SET NULL;
alter table public.lancamentos add constraint lancamentos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;
alter table public.lancamentos add constraint lancamentos_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE SET NULL;
alter table public.lancamentos add constraint lancamentos_favorecido_id_fkey FOREIGN KEY (favorecido_id) REFERENCES favorecidos(id) ON DELETE SET NULL;
alter table public.lancamentos add constraint lancamentos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL;
alter table public.lancamentos add constraint lancamentos_recorrencia_id_fkey FOREIGN KEY (recorrencia_id) REFERENCES recorrencias(id) ON DELETE SET NULL;
alter table public.lancamentos add constraint lancamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.metas_poupanca add constraint metas_poupanca_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.orcamento add constraint orcamento_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public.orcamento add constraint orcamento_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.perfis add constraint perfis_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.recorrencias add constraint recorrencias_cartao_id_fkey FOREIGN KEY (cartao_id) REFERENCES cartoes(id) ON DELETE SET NULL;
alter table public.recorrencias add constraint recorrencias_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;
alter table public.recorrencias add constraint recorrencias_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE SET NULL;
alter table public.recorrencias add constraint recorrencias_favorecido_id_fkey FOREIGN KEY (favorecido_id) REFERENCES favorecidos(id) ON DELETE SET NULL;
alter table public.recorrencias add constraint recorrencias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.regras_categorizacao add constraint regras_categorizacao_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
alter table public.regras_categorizacao add constraint regras_categorizacao_favorecido_id_fkey FOREIGN KEY (favorecido_id) REFERENCES favorecidos(id) ON DELETE SET NULL;
alter table public.regras_categorizacao add constraint regras_categorizacao_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ==== ÍNDICES ====
CREATE INDEX idx_regras_user ON public.regras_categorizacao USING btree (user_id, ativa, prioridade);

-- ==== POLÍTICAS DE SEGURANÇA (RLS) ====
create policy "Usuário vê seus aportes" on public.aportes_poupanca as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê seus cartões" on public.cartoes as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê suas categorias" on public.categorias as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê sua config de poupança" on public.config_poupanca_mensal as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê suas contas" on public.contas as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê seus favorecidos" on public.favorecidos as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê seus grupos" on public.grupos as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê itens de seus holerites" on public.holerite_itens as PERMISSIVE for ALL to public using ((holerite_id IN ( SELECT holerites.id
   FROM holerites
  WHERE (holerites.user_id = auth.uid()))));
create policy "Usuário vê seus holerites" on public.holerites as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê seus lançamentos" on public.lancamentos as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê suas metas" on public.metas_poupanca as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê seu orçamento" on public.orcamento as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "Usuário vê seu perfil" on public.perfis as PERMISSIVE for ALL to public using ((auth.uid() = id));
create policy "Usuário vê suas recorrências" on public.recorrencias as PERMISSIVE for ALL to public using ((auth.uid() = user_id));
create policy "own rows" on public.regras_categorizacao as PERMISSIVE for ALL to public using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

-- ==== FUNÇÕES ====
CREATE OR REPLACE FUNCTION public.criar_recorrencia_de_lancamento(p_lanc uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare l record; v_rec uuid;
begin
  select * into l from lancamentos where id = p_lanc;
  if not found then raise exception 'Lançamento não encontrado'; end if;
  if l.recorrencia_id is not null then return l.recorrencia_id; end if;
  if l.parcela_grupo_id is not null then raise exception 'Parcelas não podem virar recorrência'; end if;
  insert into recorrencias (user_id, favorecido_id, categoria_id, valor, tipo, cartao_id, conta_id,
                            forma_pagamento, dia_do_mes, ativa)
  values (l.user_id, l.favorecido_id, l.categoria_id, l.valor, l.tipo, l.cartao_id, l.conta_id,
          l.forma_pagamento, least(extract(day from l.data)::int, 28), true)
  returning id into v_rec;
  update lancamentos set recorrencia_id = v_rec where id = p_lanc;
  return v_rec;
end $function$
;

CREATE OR REPLACE FUNCTION public.deslocar_parcelas(p_ids uuid[], p_meses integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  if p_meses not in (-1, 1) then raise exception 'Deslocamento inválido: %', p_meses; end if;
  -- Move um mês para frente ou para trás, ajustando o dia ao último do mês quando preciso;
  -- parcelas conciliadas nunca são movidas
  update lancamentos
     set data = (date_trunc('month', data) + make_interval(months => p_meses))::date
              + least(extract(day from data)::int,
                      extract(day from (date_trunc('month', data) + make_interval(months => p_meses + 1) - interval '1 day'))::int) - 1
   where id = any(p_ids) and not coalesce(conciliado, false);
  get diagnostics n = row_count;
  return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.gerar_recorrencias_mes(p_ano integer DEFAULT NULL::integer, p_mes integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ano int := coalesce(p_ano, extract(year  from (now() at time zone 'America/Sao_Paulo'))::int);
  v_mes int := coalesce(p_mes, extract(month from (now() at time zone 'America/Sao_Paulo'))::int);
  v_ini date := make_date(v_ano, v_mes, 1);
  v_fim date := (make_date(v_ano, v_mes, 1) + interval '1 month' - interval '1 day')::date;
  v_qtd int;
begin
  -- Mesma regra do app: dia limitado a 28, descrição = favorecido (ou categoria),
  -- e só cria se ainda não houver lançamento desta recorrência no mês
  insert into lancamentos (user_id, descricao, valor, data, tipo, categoria_id, favorecido_id,
                           cartao_id, conta_id, forma_pagamento, recorrencia_id)
  select r.user_id,
         coalesce(f.nome, c.nome, case when r.tipo = 'receita' then 'Receita' else 'Despesa' end),
         r.valor,
         make_date(v_ano, v_mes, least(r.dia_do_mes, 28)),
         r.tipo, r.categoria_id, r.favorecido_id, r.cartao_id, r.conta_id, r.forma_pagamento, r.id
    from recorrencias r
    left join favorecidos f on f.id = r.favorecido_id
    left join categorias  c on c.id = r.categoria_id
   where r.ativa
     and not exists (select 1 from lancamentos l
                      where l.recorrencia_id = r.id and l.data between v_ini and v_fim);
  get diagnostics v_qtd = row_count;
  return v_qtd;
end
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.perfis (id, nome)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nome');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.realocar_categoria(p_origem uuid, p_destino uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare o record;
begin
  if p_origem is null or p_destino is null or p_origem = p_destino then
    raise exception 'Origem e destino inválidos';
  end if;
  if not exists (select 1 from categorias where id = p_destino) then
    raise exception 'Categoria de destino não encontrada';
  end if;
  update lancamentos          set categoria_id = p_destino where categoria_id = p_origem;
  update recorrencias         set categoria_id = p_destino where categoria_id = p_origem;
  update regras_categorizacao set categoria_id = p_destino where categoria_id = p_origem;
  -- Orçamento: soma no destino quando já houver valor no mesmo mês; senão, transfere
  for o in select id, user_id, mes, ano, valor_planejado from orcamento where categoria_id = p_origem loop
    update orcamento set valor_planejado = valor_planejado + o.valor_planejado
     where categoria_id = p_destino and mes = o.mes and ano = o.ano and user_id = o.user_id;
    if found then delete from orcamento where id = o.id;
    else update orcamento set categoria_id = p_destino where id = o.id;
    end if;
  end loop;
  delete from categorias where id = p_origem;
end $function$
;

-- ==== AGENDAMENTOS (pg_cron) ====
select cron.schedule('backup-semanal', '10 19 * * 0', '
  select net.http_post(
    url := ''https://ffelwbhvovfiofqwdfjn.supabase.co/functions/v1/backup-semanal'',
    headers := ''{"Content-Type":"application/json","Authorization":"Bearer COLE_AQUI_A_ANON_KEY"}''::jsonb, timeout_milliseconds := 30000);
  ');
select cron.schedule('gerar-recorrencias', '0 6 1 * *', 'select public.gerar_recorrencias_mes()');
select cron.schedule('resumo-semanal', '0 19 * * 0', '
  select net.http_post(
    url := ''https://ffelwbhvovfiofqwdfjn.supabase.co/functions/v1/resumo-semanal'',
    headers := ''{"Content-Type":"application/json","Authorization":"Bearer COLE_AQUI_A_ANON_KEY"}''::jsonb, timeout_milliseconds := 30000);
  ');
