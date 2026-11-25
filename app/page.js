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
  const [section, setSection] = useState("financeiro");
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [manualEntries, setManualEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState("expense");
  const [recurringForm, setRecurringForm] = useState({ name: "", expected_amount: "", category_id: "", frequency: "monthly", start_date: new Date().toISOString().slice(0, 10), end_date: "" });
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category_id: "", expense_group: "subscription", due_date: new Date().toISOString().slice(0, 10) });

  async function loadData() {
    if (!supabase) return;
    setLoading(true);
    const [profileResult, accountsResult, cardsResult, recurringResult, categoriesResult, entriesResult] = await Promise.all([
      supabase.from("profiles").select("user_id").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("financial_accounts").select("id,name,account_type,balance_kind,current_balance,available_balance").order("name"),
      supabase.from("cards").select("id,name,brand,last4,credit_limit,available_credit,closing_day,due_day").order("name"),
      supabase.from("recurring_expenses").select("id,name,expected_amount,frequency,start_date,end_date,next_due_date,is_active,category_id").eq("is_active", true).order("next_due_date", { ascending: true }),
      supabase.from("categories").select("id,name,kind").order("name"),
      supabase.from("manual_entries").select("id,description,amount,entry_type,expense_group,due_date,paid_at,is_paid,category_id").order("due_date", { ascending: true })
    ]);
    if (!profileResult.data) await supabase.from("profiles").upsert({ user_id: session.user.id, timezone: "America/Sao_Paulo" });
    setAccounts(accountsResult.data || []); setCards(cardsResult.data || []); setRecurring(recurringResult.data || []); setCategories(categoriesResult.data || []); setManualEntries(entriesResult.data || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const cashAccounts = useMemo(() => accounts.filter((item) => item.balance_kind === "cash"), [accounts]);
  const totalCash = cashAccounts.reduce((sum, item) => sum + Number(item.available_balance ?? item.current_balance ?? 0), 0);
  const activeExpenses = recurring.reduce((sum, item) => sum + Number(item.expected_amount || 0), 0);
  const expensesPaid = manualEntries.filter((item) => item.entry_type === "expense" && item.is_paid).reduce((sum, item) => sum + Number(item.amount), 0);
  const expensesDue = manualEntries.filter((item) => item.entry_type === "expense" && !item.is_paid).reduce((sum, item) => sum + Number(item.amount), 0);
  const incomeDue = manualEntries.filter((item) => item.entry_type === "income" && !item.is_paid).reduce((sum, item) => sum + Number(item.amount), 0);

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

  async function addExpense(event) {
    event.preventDefault();
    const payload = { ...expenseForm, user_id: session.user.id, entry_type: "expense", amount: Number(expenseForm.amount || 0), category_id: expenseForm.category_id || null };
    const { error } = await supabase.from("manual_entries").insert(payload);
    if (error) return setNotice("Confira os dados da despesa e tente novamente.");
    setNotice("Despesa adicionada ao seu planejamento.");
    setExpenseForm((current) => ({ ...current, description: "", amount: "" }));
    loadData();
  }

  async function markAsPaid(entry) {
    const { error } = await supabase.from("manual_entries").update({ is_paid: true, paid_at: new Date().toISOString() }).eq("id", entry.id);
    if (error) return setNotice("Não foi possível atualizar este lançamento.");
    setNotice("Despesa marcada como paga."); loadData();
  }

  const nav = [["financeiro", "Dashboard"], ["contas", "Contas"], ["despesas", "Despesas"], ["cartoes", "Cartões"]];
  const expenseTypes = [
    ["subscription", "Assinaturas", "Netflix, internet, streaming e serviços"],
    ["financing", "Financiamento", "Carro, moto ou bem parcelado"],
    ["loan", "Empréstimo", "Parcelas, acordos e empréstimos"],
    ["card", "Cartão", "Fatura ou compra no cartão"],
    ["other", "Nova despesa", "Outro gasto que você queira planejar"]
  ];
  const cardCategoryExamples = ["Abastecimento", "Mercado", "Restaurantes", "Shopee e Mercado Livre", "Streaming", "Transporte", "Saúde", "Outros"];
  return <main className="app-shell">
    <aside className="sidebar">
      <button className="brand compact brand-button" onClick={() => setSection("financeiro")}><span>F</span> Finanças</button>
      <nav>{nav.map(([id, label]) => <button key={id} onClick={() => setSection(id)} className={section === id ? "active" : ""}><span className="nav-dot" />{label}</button>)}</nav>
      <div className="sidebar-foot"><button className="mode-ads" onClick={() => setSection("ads")}>ADS <span>↗</span></button><p>Dados financeiros</p><span>Visão integrada e lançamentos pessoais.</span><button className="logout" onClick={onLogout}>Sair</button></div>
    </aside>
    <div className="content">
      <header className="topbar"><div><p className="eyebrow">PAINEL PESSOAL</p><h1>{section === "ads" ? "Central de ADS" : section === "despesas" ? "Despesas" : section === "cartoes" ? "Cartões e categorias" : "Finanças"}</h1></div><div className="right-tools"><div className="mode-switch"><button className={section === "ads" ? "" : "selected"} onClick={() => setSection("financeiro")}>Finanças</button><button className={section === "ads" ? "selected" : ""} onClick={() => setSection("ads")}>ADS</button></div><div className="account-chip"><span>{session.user.email?.slice(0, 1).toUpperCase()}</span><p>{session.user.email}</p></div></div></header>
      {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {loading ? <div className="loading">Atualizando o painel…</div> : <>
        {section === "financeiro" && <>
          <section className="hero-row"><div><p className="eyebrow">SALDO DISPONÍVEL</p><h2>{money.format(totalCash)}</h2><span>Somente contas classificadas como saldo em dinheiro.</span></div><div className="filter-chip">Período: hoje <b>⌄</b></div></section>
          <section className="metrics four"><article><p>Contas conectadas</p><strong>{accounts.length}</strong><span>Contas e carteiras sincronizadas.</span></article><article><p>Contas a receber</p><strong>{money.format(incomeDue)}</strong><span>Receitas pendentes de entrada.</span></article><article><p>Despesas pagas</p><strong>{money.format(expensesPaid)}</strong><span>Despesas manuais já baixadas.</span></article><article><p>Despesas a vencer</p><strong>{money.format(expensesDue + activeExpenses)}</strong><span>Planejadas e recorrências ativas.</span></article></section>
          <section className="two-col"><article className="panel"><div className="panel-head"><div><p className="eyebrow">SUAS CONTAS</p><h3>Saldo por instituição</h3></div><button onClick={() => setSection("contas")}>Ver contas</button></div>{accounts.length ? <div className="list">{accounts.slice(0, 5).map((item) => <div key={item.id} className="account-row"><span className="institution">{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.account_type} · {item.balance_kind}</small></div><b>{money.format(Number(item.available_balance ?? item.current_balance ?? 0))}</b></div>)}</div> : <Empty title="Nenhuma conta sincronizada ainda" detail="Quando a integração Pluggy estiver conectada ao aplicativo, as contas aparecerão aqui." />}</article>
          <article className="panel"><div className="panel-head"><div><p className="eyebrow">PRÓXIMAS DESPESAS</p><h3>Contas a pagar</h3></div><button onClick={() => setSection("despesas")}>Adicionar</button></div>{manualEntries.filter((item) => !item.is_paid && item.entry_type === "expense").slice(0, 4).map((item) => <div className="recurring-row" key={item.id}><div><strong>{item.description}</strong><small>Vence em {dateFormatter.format(new Date(`${item.due_date}T12:00:00`))}</small></div><b>{money.format(Number(item.amount))}</b></div>) || <Empty title="Sem despesas próximas" detail="Cadastre assinaturas, financiamento e outras despesas." />}</article></section>
        </>}
        {section === "contas" && <section className="panel full"><div className="panel-head"><div><p className="eyebrow">FILTROS</p><h2>Contas e saldos</h2></div><div className="filter-chip">Todas as contas <b>⌄</b></div></div><p className="muted">O filtro por período será alimentado pelo histórico de saldos sincronizado.</p>{accounts.length ? <div className="list">{accounts.map((item) => <div key={item.id} className="account-row"><span className="institution">{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.account_type} · {item.balance_kind}</small></div><b>{money.format(Number(item.available_balance ?? item.current_balance ?? 0))}</b></div>)}</div> : <Empty title="Aguardando integração bancária" detail="Seu banco já está autorizado no Pluggy; agora falta conectar o Pluggy ao aplicativo com a chave privada no servidor." />}</section>}
        {section === "despesas" && <section className="expenses-layout"><article className="panel expense-types"><div className="panel-head"><div><p className="eyebrow">LANÇAR DESPESA</p><h2>Como quer organizar?</h2></div></div><div className="expense-type-grid">{expenseTypes.map(([id, title, detail]) => <button key={id} className={expenseForm.expense_group === id ? "chosen" : ""} onClick={() => setExpenseForm({ ...expenseForm, expense_group: id })}><strong>{title}</strong><span>{detail}</span></button>)}</div><form className="expense-form" onSubmit={addExpense}><label>Descrição<input required value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Ex.: Netflix, financiamento do carro" /></label><label>Valor<input required type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0,00" /></label><label>Vencimento<input required type="date" value={expenseForm.due_date} onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })} /></label><label>Categoria<select value={expenseForm.category_id} onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}><option value="">Sem categoria</option>{categories.filter((c) => c.kind === "expense").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><button className="primary">Adicionar despesa</button></form></article>
          <aside className="panel"><p className="eyebrow">A PAGAR</p><h3>Próximos lançamentos</h3>{manualEntries.filter((item) => item.entry_type === "expense" && !item.is_paid).length ? <div className="list">{manualEntries.filter((item) => item.entry_type === "expense" && !item.is_paid).map((item) => <div className="recurring-row" key={item.id}><div><strong>{item.description}</strong><small>Vencimento {dateFormatter.format(new Date(`${item.due_date}T12:00:00`))}</small></div><b>{money.format(Number(item.amount))}</b><button className="mini-button" onClick={() => markAsPaid(item)}>Paguei</button></div>)}</div> : <Empty title="Tudo em dia" detail="Novas despesas aparecerão aqui." />}</aside>
          <aside className="panel form-panel category-panel"><p className="eyebrow">ORGANIZAÇÃO</p><h3>Criar categoria</h3><form onSubmit={addCategory}><label>Nome<input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required placeholder="Ex.: Carro" /></label><label>Tipo<select value={categoryKind} onChange={(e) => setCategoryKind(e.target.value)}><option value="expense">Despesa</option><option value="income">Receita</option><option value="transfer">Transferência</option></select></label><button className="secondary">Criar categoria</button></form></aside></section>}
        {section === "cartoes" && <section className="cards-page"><article className="panel full"><div className="panel-head"><div><p className="eyebrow">CRÉDITO</p><h2>Seus cartões</h2></div></div>{cards.length ? <div className="cards-grid">{cards.map((card) => <article key={card.id} className="credit-card"><small>{card.brand || "Cartão"}</small><h3>{card.name}</h3><p>•••• {card.last4 || "----"}</p><div><span>Disponível</span><b>{money.format(Number(card.available_credit || 0))}</b></div></article>)}</div> : <Empty title="Nenhum cartão importado" detail="Cartões aparecerão aqui depois da sincronização da conta de crédito conectada." />}</article><aside className="panel"><p className="eyebrow">CATEGORIAS DE COMPRA</p><h3>Organize seus gastos</h3><p className="muted">As categorias pessoais serão usadas para entender suas compras do cartão sem alterar dados da Nubank ou Itaú.</p><div className="category-chips">{[...cardCategoryExamples, ...categories.filter((item) => item.kind === "expense").map((item) => item.name)].map((name) => <span key={name}>{name}</span>)}</div><button className="secondary" onClick={() => setSection("despesas")}>Criar categoria</button></aside></section>}
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
