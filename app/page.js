"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import { Brand, FinanceView, Icon } from "./finance-ui";

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

  return (
    <main className="login-shell">
      <section className="login-intro">
        <Brand />
        <div className="login-message">
          <Icon name="chart" size={34} />
          <h1>Suas contas e campanhas em um só painel.</h1>
          <p>Acompanhe saldos, despesas, cartões e resultados de anúncios.</p>
        </div>
      </section>
      <section className="login-panel">
        <form onSubmit={login} className="login-form">
          <div className="login-heading"><h2>Entrar no painel</h2><p>Use seu e-mail e senha para acessar.</p></div>
          <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="voce@exemplo.com" /></label>
          <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
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
      supabase.from("manual_entries").select("id,description,amount,entry_type,expense_group,due_date,paid_at,is_paid,category_id,created_at").order("due_date", { ascending: true })
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

  return (
    <FinanceView
      session={session}
      onLogout={onLogout}
      section={section}
      onNavigate={setSection}
      accounts={accounts}
      cards={cards}
      categories={categories}
      manualEntries={manualEntries}
      totalCash={totalCash}
      incomeDue={incomeDue}
      expensesPaid={expensesPaid}
      expensesDue={expensesDue + activeExpenses}
      loading={loading}
      notice={notice}
      onDismiss={() => setNotice("")}
      expenseForm={expenseForm}
      setExpenseForm={setExpenseForm}
      onAddExpense={addExpense}
      onMarkPaid={markAsPaid}
      categoryName={categoryName}
      setCategoryName={setCategoryName}
      categoryKind={categoryKind}
      setCategoryKind={setCategoryKind}
      onAddCategory={addCategory}
    />
  );
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
