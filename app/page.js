"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function Mark({ children }) {
  return <span className="mark" aria-hidden="true">{children}</span>;
}

function Empty({ title, detail, action }) {
  return <div className="empty"><strong>{title}</strong><p>{detail}</p>{action}</div>;
}

function Login({ onSession }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event) {
    event.preventDefault();
    if (!supabase) return setError("As chaves públicas do Supabase não foram configuradas neste computador.");
    setLoading(true); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) return setError("Não foi possível entrar. Confira e-mail e senha.");
    onSession(data.session);
  }

  return <main className="login-shell">
    <section className="login-intro">
      <div className="brand"><span>F</span> Finanças <i>&</i> ADS</div>
      <p className="eyebrow">CENTRO DE CONTROLE PESSOAL</p>
      <h1>Suas contas e suas campanhas, no mesmo lugar.</h1>
      <p className="intro-copy">Um painel privado para visualizar saldo, despesas recorrentes, cartões, vendas e o retorno dos anúncios.</p>
      <div className="intro-ledger" aria-label="Recursos do painel">
        <div><Mark>01</Mark><span>Saldo por conta e período</span></div>
        <div><Mark>02</Mark><span>Conexões bancárias somente leitura</span></div>
        <div><Mark>03</Mark><span>Vendas e ADS com atribuição clara</span></div>
      </div>
    </section>
    <section className="login-panel">
      <form onSubmit={login} className="login-form">
        <div className="login-heading"><p>Acesso protegido</p><h2>Entrar no painel</h2><span>Use o e-mail e a senha cadastrados para você.</span></div>
        <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@exemplo.com" /></label>
        <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••••••" /></label>
        {error && <p role="alert" className="form-error">{error}</p>}
        <button className="primary" disabled={loading}>{loading ? "Entrando…" : "Entrar com segurança"}</button>
        <small>Não há cadastro público neste aplicativo.</small>
      </form>
    </section>
  </main>;
}

function Dashboard({ session, onLogout }) {
  const [section, setSection] = useState("resumo");
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState("expense");
  const [recurringForm, setRecurringForm] = useState({ name: "", expected_amount: "", category_id: "", frequency: "monthly", start_date: new Date().toISOString().slice(0, 10), end_date: "" });

  async function loadData() {
    if (!supabase) return;
    setLoading(true);
    const [profileResult, accountsResult, cardsResult, recurringResult, categoriesResult] = await Promise.all([
      supabase.from("profiles").select("user_id").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("financial_accounts").select("id,name,account_type,balance_kind,current_balance,available_balance").order("name"),
      supabase.from("cards").select("id,name,brand,last4,credit_limit,available_credit,closing_day,due_day").order("name"),
      supabase.from("recurring_expenses").select("id,name,expected_amount,frequency,start_date,end_date,next_due_date,is_active,category_id").eq("is_active", true).order("next_due_date", { ascending: true }),
      supabase.from("categories").select("id,name,kind").order("name")
    ]);
    if (!profileResult.data) await supabase.from("profiles").upsert({ user_id: session.user.id, timezone: "America/Sao_Paulo" });
    setAccounts(accountsResult.data || []); setCards(cardsResult.data || []); setRecurring(recurringResult.data || []); setCategories(categoriesResult.data || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const cashAccounts = useMemo(() => accounts.filter((item) => item.balance_kind === "cash"), [accounts]);
  const totalCash = cashAccounts.reduce((sum, item) => sum + Number(item.available_balance ?? item.current_balance ?? 0), 0);
  const activeExpenses = recurring.reduce((sum, item) => sum + Number(item.expected_amount || 0), 0);

  async function addCategory(event) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    const { error } = await supabase.from("categories").insert({ user_id: session.user.id, name: categoryName.trim(), kind: categoryKind });
    if (error) return setNotice("Não foi possível criar esta categoria. Talvez ela já exista.");
    setCategoryName(""); setNotice("Categoria criada."); loadData();
  }

  async function addRecurring(event) {
    event.preventDefault();
    const payload = { ...recurringForm, user_id: session.user.id, expected_amount: Number(recurringForm.expected_amount || 0), category_id: recurringForm.category_id || null, end_date: recurringForm.end_date || null };
    const { error } = await supabase.from("recurring_expenses").insert(payload);
    if (error) return setNotice("Confira as datas e os campos da despesa recorrente.");
    setNotice("Despesa recorrente registrada."); setRecurringForm((current) => ({ ...current, name: "", expected_amount: "", end_date: "" })); loadData();
  }

  const nav = [["resumo", "Resumo"], ["contas", "Contas"], ["cartoes", "Cartões"], ["recorrentes", "Recorrentes"], ["ads", "ADS"]];
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand compact"><span>F</span> Finanças <i>&</i> ADS</div>
      <nav>{nav.map(([id, label]) => <button key={id} onClick={() => setSection(id)} className={section === id ? "active" : ""}><span className="nav-dot" />{label}</button>)}</nav>
      <div className="sidebar-foot"><p>Dados financeiros</p><span>Somente visualização</span><button className="logout" onClick={onLogout}>Sair</button></div>
    </aside>
    <div className="content">
      <header className="topbar"><div><p className="eyebrow">PAINEL PESSOAL</p><h1>{section === "ads" ? "Central de ADS" : "Visão financeira"}</h1></div><div className="account-chip"><span>{session.user.email?.slice(0, 1).toUpperCase()}</span><p>{session.user.email}</p></div></header>
      {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {loading ? <div className="loading">Atualizando o painel…</div> : <>
        {section === "resumo" && <>
          <section className="hero-row"><div><p className="eyebrow">SALDO DISPONÍVEL</p><h2>{money.format(totalCash)}</h2><span>Somente contas classificadas como saldo em dinheiro.</span></div><div className="filter-chip">Período: hoje <b>⌄</b></div></section>
          <section className="metrics"><article><p>Contas conectadas</p><strong>{accounts.length}</strong><span>Importadas pelo Pluggy quando a integração estiver ativa.</span></article><article><p>Cartões visíveis</p><strong>{cards.length}</strong><span>Limites e faturas serão somente leitura.</span></article><article><p>Recorrências mensais</p><strong>{money.format(activeExpenses)}</strong><span>Estimativa das despesas ativas cadastradas.</span></article></section>
          <section className="two-col"><article className="panel"><div className="panel-head"><div><p className="eyebrow">SUAS CONTAS</p><h3>Saldo por instituição</h3></div><button onClick={() => setSection("contas")}>Ver todas</button></div>{accounts.length ? <div className="list">{accounts.slice(0, 5).map((item) => <div key={item.id} className="account-row"><span className="institution">{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.account_type} · {item.balance_kind}</small></div><b>{money.format(Number(item.available_balance ?? item.current_balance ?? 0))}</b></div>)}</div> : <Empty title="Nenhuma conta sincronizada ainda" detail="Quando a integração Pluggy estiver conectada ao aplicativo, as contas aparecerão aqui." />}</article>
          <article className="panel ads-pulse"><div className="panel-head"><div><p className="eyebrow">MODO ADS</p><h3>Pronto para conectar</h3></div><span className="status">Em preparo</span></div><p>Meta, Google, Cakto e Kiwify entram neste painel depois da etapa segura de credenciais no servidor.</p><button className="secondary" onClick={() => setSection("ads")}>Ver plano de ADS</button></article></section>
        </>}
        {section === "contas" && <section className="panel full"><div className="panel-head"><div><p className="eyebrow">FILTROS</p><h2>Contas e saldos</h2></div><div className="filter-chip">Todas as contas <b>⌄</b></div></div><p className="muted">O filtro por período será alimentado pelo histórico de saldos sincronizado.</p>{accounts.length ? <div className="list">{accounts.map((item) => <div key={item.id} className="account-row"><span className="institution">{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.account_type} · {item.balance_kind}</small></div><b>{money.format(Number(item.available_balance ?? item.current_balance ?? 0))}</b></div>)}</div> : <Empty title="Aguardando integração bancária" detail="Seu banco já está autorizado no Pluggy; agora falta conectar o Pluggy ao aplicativo com a chave privada no servidor." />}</section>}
        {section === "cartoes" && <section className="panel full"><div className="panel-head"><div><p className="eyebrow">CRÉDITO</p><h2>Cartões</h2></div></div>{cards.length ? <div className="cards-grid">{cards.map((card) => <article key={card.id} className="credit-card"><small>{card.brand || "Cartão"}</small><h3>{card.name}</h3><p>•••• {card.last4 || "----"}</p><div><span>Disponível</span><b>{money.format(Number(card.available_credit || 0))}</b></div></article>)}</div> : <Empty title="Nenhum cartão importado" detail="Cartões aparecerão aqui depois da sincronização da conta de crédito conectada." />}</section>}
        {section === "recorrentes" && <section className="recurring-layout"><article className="panel"><div className="panel-head"><div><p className="eyebrow">PLANEJAMENTO</p><h2>Despesas recorrentes</h2></div></div>{recurring.length ? <div className="list">{recurring.map((item) => <div className="recurring-row" key={item.id}><div><strong>{item.name}</strong><small>{item.frequency === "monthly" ? "Mensal" : item.frequency === "weekly" ? "Semanal" : "Anual"} · começa em {dateFormatter.format(new Date(`${item.start_date}T12:00:00`))}{item.end_date ? ` · termina em ${dateFormatter.format(new Date(`${item.end_date}T12:00:00`))}` : " · sem data final"}</small></div><b>{money.format(Number(item.expected_amount || 0))}</b></div>)}</div> : <Empty title="Nenhuma recorrência cadastrada" detail="Cadastre financiamento, internet, assinaturas e outras despesas para acompanhá-las aqui." />}</article>
          <aside className="panel form-panel"><p className="eyebrow">NOVO LANÇAMENTO</p><h3>Adicionar recorrência</h3><form onSubmit={addRecurring}><label>Nome<input value={recurringForm.name} onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })} required placeholder="Ex.: Financiamento do carro" /></label><label>Valor previsto<input type="number" min="0" step="0.01" value={recurringForm.expected_amount} onChange={(e) => setRecurringForm({ ...recurringForm, expected_amount: e.target.value })} required placeholder="0,00" /></label><label>Categoria<select value={recurringForm.category_id} onChange={(e) => setRecurringForm({ ...recurringForm, category_id: e.target.value })}><option value="">Sem categoria</option>{categories.filter((c) => c.kind === "expense").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Data de início<input type="date" value={recurringForm.start_date} onChange={(e) => setRecurringForm({ ...recurringForm, start_date: e.target.value })} required /></label><label>Data final <em>opcional</em><input type="date" value={recurringForm.end_date} min={recurringForm.start_date} onChange={(e) => setRecurringForm({ ...recurringForm, end_date: e.target.value })} /></label><button className="primary">Salvar recorrência</button></form></aside>
          <aside className="panel form-panel category-panel"><p className="eyebrow">ORGANIZAÇÃO</p><h3>Nova categoria</h3><form onSubmit={addCategory}><label>Nome<input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required placeholder="Ex.: Carro" /></label><label>Tipo<select value={categoryKind} onChange={(e) => setCategoryKind(e.target.value)}><option value="expense">Despesa</option><option value="income">Receita</option><option value="transfer">Transferência</option></select></label><button className="secondary">Criar categoria</button></form></aside></section>}
        {section === "ads" && <section className="ads-board"><div className="ads-statement"><p className="eyebrow">FASE 1</p><h2>Dados confiáveis antes de escala.</h2><p>O modo ADS será o centro de leitura de Meta e Google Ads, vendas Cakto/Kiwify e lucro por campanha — com atribuição explícita, nunca inventada.</p></div><div className="ads-steps"><article><b>1</b><div><h3>Conectar fontes</h3><p>Meta, Google, Cakto e Kiwify via servidor.</p></div></article><article><b>2</b><div><h3>Normalizar dados</h3><p>Gastos, vendas, UTMs e taxas em uma só linha do tempo.</p></div></article><article><b>3</b><div><h3>Analisar lucro</h3><p>ROAS, CPA e receita atribuída com filtros claros.</p></div></article></div><div className="panel"><p className="eyebrow">STATUS ATUAL</p><h3>Integrações de ADS ainda não conectadas</h3><p>O banco já está pronto para receber esses dados; as chaves de cada plataforma ficarão somente no servidor quando iniciarmos essa etapa.</p></div></section>}
      </>}
    </div>
  </main>;
}

export default function Home() {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!supabase) return setChecked(true);
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecked(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (!checked) return <main className="boot">Abrindo seu painel…</main>;
  if (!session) return <Login onSession={setSession} />;
  return <Dashboard session={session} onLogout={() => supabase.auth.signOut()} />;
}
