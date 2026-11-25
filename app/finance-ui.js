import { useState } from "react";
import { AdsMode } from "./ads-mode";
import "./ads.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const compactMoney = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

const shapes = {
  brand: "M4 16l6-6 4 4 6-8M14 6h6v6",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  bank: "M3 9l9-5 9 5H3zm2 11h14M7 11v6m5-6v6m5-6v6",
  receipt: "M6 3l3 2 3-2 3 2 3-2v18l-3-2-3 2-3-2-3 2zM9 9h6m-6 4h6",
  card: "M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm-1 4h18M7 14h3",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  down: "M6 9l6 6 6-6",
  income: "M5 17L17 5m-8 0h8v8",
  check: "M5 12l4 4L19 6",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  search: "M20 20l-4-4m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  exit: "M10 17l5-5-5-5m-5 5h10m0-8h4v16h-4",
  close: "M6 6l12 12M18 6L6 18",
  lock: "M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v11H6z",
  chart: "M4 19h16M7 16v-5m5 5V7m5 9V4",
};

const sections = [
  ["financeiro", "Visão geral", "grid"],
  ["contas", "Contas", "bank"],
  ["despesas", "Despesas", "receipt"],
  ["cartoes", "Cartões", "card"],
];

const expenseTypes = [
  ["subscription", "Assinaturas", "Internet, streaming e serviços"],
  ["financing", "Financiamento", "Carro, moto ou bem parcelado"],
  ["loan", "Empréstimo", "Parcelas e acordos"],
  ["card", "Cartão", "Fatura ou compra no cartão"],
  ["other", "Outras", "Outros gastos"],
];

const cardCategories = ["Abastecimento", "Mercado", "Restaurantes", "Shopee e Mercado Livre", "Streaming", "Transporte", "Saúde", "Outros"];
const accountTypes = { checking: "Conta corrente", savings: "Poupança", payment: "Conta de pagamento", wallet: "Carteira", credit: "Crédito", investment: "Investimentos", other: "Outra conta" };

export function Icon({ name, size = 18 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={shapes[name]} />
    </svg>
  );
}

export function Brand() {
  return <span className="brand"><span className="brand-mark"><Icon name="brand" size={19} /></span>Finanças <span className="brand-amp">&amp;</span> ADS</span>;
}

function accountBalance(item) {
  const value = item.available_balance ?? item.current_balance;
  return value == null ? "—" : money.format(Number(value));
}

function displayDate(date) {
  return shortDate.format(new Date(date.slice(0, 10) + "T12:00:00Z"));
}

function Empty({ title, detail }) {
  return <div className="empty"><strong>{title}</strong>{detail && <p>{detail}</p>}</div>;
}

function AccountRow({ account }) {
  return (
    <div className="account-row">
      <span className="institution" aria-hidden="true">{account.name?.slice(0, 1).toUpperCase() || <Icon name="bank" />}</span>
      <div><strong>{account.name}</strong><small>{accountTypes[account.account_type] || "Conta financeira"}</small></div>
      <b>{accountBalance(account)}</b>
    </div>
  );
}

function CreditCard({ card }) {
  return (
    <article className="credit-card">
      <div className="credit-top"><Icon name="card" /><small>{card.brand || "Cartão"}</small></div>
      <div>
        <h3>{card.name}</h3>
        {card.last4 && <p aria-label={`Final ${card.last4}`}>•••• {card.last4}</p>}
      </div>
      {card.available_credit != null && <div className="credit-limit"><span>Limite disponível</span><b>{money.format(Number(card.available_credit))}</b></div>}
    </article>
  );
}

function BalancePanel({ accounts, totalCash, onNavigate }) {
  const cashAccountCount = accounts.filter((account) => account.balance_kind === "cash").length;
  return (
    <section className="balance-panel" aria-labelledby="balance-title">
      <div className="balance-head"><h2 id="balance-title">Saldo disponível</h2><span><Icon name="bank" size={15} /> BRL</span></div>
      <strong className="balance-number">{cashAccountCount ? money.format(totalCash) : "—"}</strong>
      <p>{cashAccountCount ? `${cashAccountCount} ${cashAccountCount === 1 ? "conta com saldo em dinheiro" : "contas com saldo em dinheiro"}` : "As contas sincronizadas aparecem aqui."}</p>
      <div className="balance-accounts">
        {accounts.slice(0, 2).map((account) => <AccountRow key={account.id} account={account} />)}
      </div>
      <button className="balance-link" onClick={() => onNavigate("contas")}>Ver contas <Icon name="arrow" size={16} /></button>
    </section>
  );
}

function Metrics({ accountCount, incomeDue, expensesPaid, expensesDue }) {
  const metrics = [
    ["A receber", money.format(incomeDue), "income", "Receitas pendentes"],
    ["Despesas a vencer", money.format(expensesDue), "clock", "Inclui recorrências ativas"],
    ["Despesas pagas", money.format(expensesPaid), "check", "Lançamentos manuais"],
    ["Contas conectadas", accountCount, "bank", "Contas e carteiras"],
  ];
  return (
    <section className="metric-grid" aria-label="Resumo financeiro">
      {metrics.map(([label, value, icon, detail]) => (
        <article className="metric-card" key={label}>
          <div><h2>{label}</h2><Icon name={icon} size={17} /></div>
          <strong>{value}</strong>
          <p>{detail}</p>
        </article>
      ))}
    </section>
  );
}

function buildMonthSeries(entries, count) {
  const [year, month] = localDate.format(new Date()).split("-").map(Number);
  const months = Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - count + index, 1));
    return { date, key: date.toISOString().slice(0, 7), income: 0, expense: 0 };
  });
  const byMonth = new Map(months.map((item) => [item.key, item]));
  for (const entry of entries) {
    if (!entry.is_paid) continue;
    const date = entry.paid_at ? localDate.format(new Date(entry.paid_at)) : entry.due_date;
    const bucket = byMonth.get(date.slice(0, 7));
    if (bucket) bucket[entry.entry_type] += Number(entry.amount);
  }
  return months;
}

function MonthlyChart({ entries }) {
  const [count, setCount] = useState(6);
  const months = buildMonthSeries(entries, count);
  const peak = Math.max(0, ...months.flatMap(({ income, expense }) => [income, expense]));
  const targetStep = peak / 5;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep || 1));
  const step = [1, 2, 2.5, 5, 10].find((value) => value * magnitude >= targetStep) * magnitude;
  const scale = step * 5;
  return (
    <section className="panel chart-panel" aria-labelledby="chart-title">
      <div className="panel-head"><h2 id="chart-title">Fluxo mensal</h2><select aria-label="Período do fluxo mensal" value={count} onChange={(event) => setCount(Number(event.target.value))}><option value={6}>6 meses</option><option value={3}>3 meses</option></select></div>
      <div className="chart-legend"><span><i /> Recebido</span><span><i /> Pago</span></div>
      {peak > 0 ? (
        <figure className="chart">
          <div className="chart-axis" aria-hidden="true">
            {[5, 4, 3, 2, 1, 0].map((tick) => (
              <span key={tick} style={{ "--tick-position": `${(5 - tick) * 20}%` }}>{compactMoney.format(step * tick)}</span>
            ))}
          </div>
          <div className="chart-columns">
            {months.map(({ key, date, income, expense }) => (
              <div className="chart-month" key={key} role="img" aria-label={`${monthLabel.format(date)}: ${money.format(income)} recebido, ${money.format(expense)} pago`} title={`Recebido: ${money.format(income)} · Pago: ${money.format(expense)}`}>
                <div className="bar-pair" aria-hidden="true">
                  <i style={{ "--bar-height": `${100 * income / scale}%` }} />
                  <i style={{ "--bar-height": `${100 * expense / scale}%` }} />
                </div>
                <span aria-hidden="true">{monthLabel.format(date).replace(".", "")}</span>
              </div>
            ))}
          </div>
        </figure>
      ) : <div className="chart-empty"><Icon name="chart" size={25} /><Empty title="Sem movimentações no período" detail="Receitas recebidas e despesas pagas aparecem no gráfico." /></div>}
    </section>
  );
}

function Activity({ entries, categories }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const byCategory = new Map(categories.map((category) => [category.id, category.name]));
  const rows = entries.filter((item) => {
    if (status !== "all" && item.is_paid !== (status === "paid")) return false;
    const searchable = `${item.description} ${byCategory.get(item.category_id) || ""}`;
    return searchable.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));
  }).sort((a, b) => (b.created_at || b.due_date).localeCompare(a.created_at || a.due_date)).slice(0, 6);

  return (
    <section className="panel activity-panel" aria-labelledby="activity-title">
      <div className="panel-head activity-head">
        <h2 id="activity-title">Atividade recente</h2>
        <div className="activity-controls">
          <label className="search-field"><Icon name="search" size={15} /><input type="search" aria-label="Buscar lançamentos" placeholder="Buscar lançamentos" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select aria-label="Status dos lançamentos" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos</option><option value="open">Pendentes</option><option value="paid">Concluídos</option></select>
        </div>
      </div>
      {rows.length ? (
        <table className="activity-table">
          <thead><tr><th scope="col">Lançamento</th><th scope="col">Vencimento</th><th scope="col">Status</th><th scope="col">Valor</th></tr></thead>
          <tbody>{rows.map((item) => {
            const isIncome = item.entry_type === "income";
            const category = byCategory.get(item.category_id) || (isIncome ? "Receita" : "Despesa");
            const badge = item.is_paid ? (isIncome ? "Recebido" : "Pago") : "Pendente";
            return (
              <tr key={item.id}>
                <th scope="row"><span>{item.description}</span><small>{category}</small></th>
                <td>{displayDate(item.due_date)}</td>
                <td><span className={`entry-status ${item.is_paid ? "settled" : "pending"}`}>{badge}</span></td>
                <td>{isIncome ? "+" : "−"}{money.format(Number(item.amount))}</td>
              </tr>
            );
          })}</tbody>
        </table>
      ) : <Empty title={entries.length ? "Nenhum lançamento encontrado" : "Seus lançamentos aparecem aqui"} detail={entries.length ? "Tente outra busca ou mude o filtro." : "Use Nova despesa para registrar seu primeiro gasto."} />}
    </section>
  );
}

function ExpensePage({ entries, categories, expenseForm, setExpenseForm, onAddExpense, onMarkPaid, categoryName, setCategoryName, categoryKind, setCategoryKind, onAddCategory }) {
  const pending = entries.filter((entry) => entry.entry_type === "expense" && !entry.is_paid);
  const setField = (field, value) => setExpenseForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="detail-grid">
      <section className="panel expense-panel">
        <h2>Lançar despesa</h2>
        <div className="expense-types" role="group" aria-label="Tipo de despesa">
          {expenseTypes.map(([id, label, detail]) => <button key={id} aria-pressed={expenseForm.expense_group === id} onClick={() => setField("expense_group", id)}><strong>{label}</strong><small>{detail}</small></button>)}
        </div>
        <form className="expense-form" onSubmit={onAddExpense}>
          <label>Descrição<input required value={expenseForm.description} onChange={(event) => setField("description", event.target.value)} placeholder="Ex.: Internet residencial" /></label>
          <label>Valor<input required type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setField("amount", event.target.value)} placeholder="0,00" /></label>
          <label>Vencimento<input required type="date" value={expenseForm.due_date} onChange={(event) => setField("due_date", event.target.value)} /></label>
          <label>Categoria<select value={expenseForm.category_id} onChange={(event) => setField("category_id", event.target.value)}><option value="">Sem categoria</option>{categories.filter((item) => item.kind === "expense").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <button className="primary"><Icon name="plus" size={16} /> Adicionar despesa</button>
        </form>
      </section>
      <div className="panel-stack">
        <section className="panel">
          <h2>Próximas despesas</h2>
          {pending.length ? pending.map((item) => (
            <div className="due-row" key={item.id}>
              <div><strong>{item.description}</strong><small>Vence em {displayDate(item.due_date)}</small></div>
              <b>{money.format(Number(item.amount))}</b>
              <button className="secondary" onClick={() => onMarkPaid(item)}>Paguei</button>
            </div>
          )) : <Empty title="Tudo em dia" detail="Novas despesas aparecem aqui." />}
        </section>
        <section className="panel">
          <h2>Criar categoria</h2>
          <form className="category-form" onSubmit={onAddCategory}>
            <label>Nome<input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required placeholder="Ex.: Carro" /></label>
            <label>Tipo<select value={categoryKind} onChange={(event) => setCategoryKind(event.target.value)}><option value="expense">Despesa</option><option value="income">Receita</option><option value="transfer">Transferência</option></select></label>
            <button className="secondary">Criar categoria</button>
          </form>
        </section>
      </div>
    </div>
  );
}

const headings = {
  financeiro: ["Visão geral", "Acompanhe seu saldo, pagamentos e próximos vencimentos."],
  contas: ["Contas e saldos", "Acompanhe o saldo de cada instituição conectada."],
  despesas: ["Despesas", "Organize lançamentos e dê baixa nos pagamentos."],
  cartoes: ["Cartões", "Acompanhe seus cartões e organize categorias de compra."],
};

export function FinanceView({
  session, onLogout, section, onNavigate, accounts, cards, categories, manualEntries,
  totalCash, incomeDue, expensesPaid, expensesDue, loading, notice, onDismiss, ...expenseProps
}) {
  const [adsDark, setAdsDark] = useState(false);
  const isAds = section === "ads";
  const [title, subtitle] = headings[section] ?? [];
  const displayName = session.user.user_metadata?.name || session.user.user_metadata?.full_name || "Minha conta";
  const initial = (displayName === "Minha conta" ? session.user.email : displayName)?.charAt(0).toUpperCase() || "F";
  return (
    <div className="workspace" data-ads-theme={isAds && adsDark ? "dark" : undefined}>
      <a className="skip-link" href="#workspace-content">Ir para o conteúdo</a>
      <header className="app-header">
        <button className="brand-button" onClick={() => onNavigate("financeiro")}><Brand /></button>
        <div className="header-tools">
          <div className="mode-switch" role="group" aria-label="Área do aplicativo">
            <button aria-pressed={section !== "ads"} onClick={() => onNavigate("financeiro")}>Finanças</button>
            <button aria-pressed={section === "ads"} onClick={() => onNavigate("ads")}>ADS</button>
          </div>
          <details className="account-menu">
            <summary aria-label="Abrir menu da conta"><span className="avatar">{initial}</span><span className="account-name">{displayName}</span><Icon name="down" size={14} /></summary>
            <div className="account-popover"><p>{session.user.email}</p><button onClick={onLogout}><Icon name="exit" size={16} /> Sair</button></div>
          </details>
        </div>
      </header>
      <div className="workspace-body">
        {isAds ? <AdsMode Icon={Icon} dark={adsDark} onToggleTheme={() => setAdsDark((current) => !current)} /> : <>
        <nav className="main-nav" aria-label="Navegação financeira">
          {sections.map(([id, label, icon]) => <button key={id} aria-current={section === id ? "page" : undefined} onClick={() => onNavigate(id)}><Icon name={icon} size={17} /><span>{label}</span></button>)}
        </nav>
        <main className="workspace-content" id="workspace-content">
          <div className="page-heading">
            <div><h1>{title}</h1><p>{subtitle}</p></div>
            {section === "financeiro" && <button className="primary" onClick={() => onNavigate("despesas")}><Icon name="plus" size={17} /> Nova despesa</button>}
          </div>
          {notice && <div className="notice" role="status">{notice}<button aria-label="Fechar aviso" onClick={onDismiss}><Icon name="close" size={16} /></button></div>}
          {loading ? <div className="loading panel" role="status">Atualizando o painel…</div> : <>
            {section === "financeiro" && (
              <>
                <div className="overview-grid">
                  <BalancePanel accounts={accounts} totalCash={totalCash} onNavigate={onNavigate} />
                  <Metrics accountCount={accounts.length} incomeDue={incomeDue} expensesPaid={expensesPaid} expensesDue={expensesDue} />
                  <MonthlyChart entries={manualEntries} />
                </div>
                <div className="overview-bottom">
                  <Activity entries={manualEntries} categories={categories} />
                  <section className="panel wallet-panel">
                    <div className="panel-head"><h2>Meus cartões</h2><button className="text-button" onClick={() => onNavigate("cartoes")}>Ver cartões <Icon name="arrow" size={15} /></button></div>
                    {cards.length ? <div className="cards-grid">{cards.slice(0, 2).map((card) => <CreditCard key={card.id} card={card} />)}</div> : <Empty title="Nenhum cartão importado" detail="Cartões de crédito sincronizados aparecem aqui." />}
                  </section>
                </div>
              </>
            )}
            {section === "contas" && <section className="panel section-panel"><h2>Instituições conectadas</h2>{accounts.length ? accounts.map((account) => <AccountRow key={account.id} account={account} />) : <Empty title="Nenhuma conta sincronizada" detail="Suas contas aparecem aqui quando a integração Pluggy estiver conectada ao aplicativo." />}</section>}
            {section === "despesas" && <ExpensePage entries={manualEntries} categories={categories} {...expenseProps} />}
            {section === "cartoes" && <div className="detail-grid"><section className="panel"><h2>Seus cartões</h2>{cards.length ? <div className="cards-grid">{cards.map((card) => <CreditCard key={card.id} card={card} />)}</div> : <Empty title="Nenhum cartão importado" detail="Cartões aparecem aqui depois da sincronização das contas de crédito." />}</section><aside className="panel"><h2>Categorias de compra</h2><div className="category-chips">{[...new Set([...cardCategories, ...categories.filter((item) => item.kind === "expense").map((item) => item.name)])].map((name) => <span key={name}>{name}</span>)}</div><button className="secondary" onClick={() => onNavigate("despesas")}>Criar categoria</button></aside></div>}
          </>}
        </main>
        </>}
      </div>
    </div>
  );
}
