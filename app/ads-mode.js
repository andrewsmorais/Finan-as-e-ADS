import { useEffect, useMemo, useState } from "react";
import {
  adsProfit, adsTimeZone, buildExample, exampleOffers, exampleProducts, filterExample, gateways, getPeriod,
  onlyAds, ownedChannels, paymentNames, platforms, previousPeriod, summarizeAds, todayInPanel,
} from "../lib/ads-example";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR");
const ratio = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const signedPercent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const noData = "Sem dados";
const periods = [["1", "Hoje"], ["yesterday", "Ontem"], ["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"], ["6m", "6 meses"], ["12m", "12 meses"], ["custom", "Personalizado"]];

const navigation = [
  ["dashboard", "Dashboard", "grid"],
  ["campaigns", "Campanhas", "chart"],
  ["sales", "Vendas", "receipt"],
  ["connections", "Conectar", "bank"],
  ["creatives", "Creative Hub", "card"],
];
const statusLabels = { approved: "Aprovada", pending: "Pendente", refunded: "Reembolso", chargeback: "Chargeback", checkout: "Checkout iniciado" };

const money = (cents) => cents === null ? noData : currency.format(cents / 100);
const multiple = (value) => value === null ? noData : ratio.format(value) + "×";
const integer = (value) => value === null ? noData : number.format(value);
const percentage = (value) => value === null ? noData : percent.format(value);
const formatDay = (day) => shortDate.format(new Date(day + "T00:00:00Z"));
const originNames = Object.fromEntries([...platforms, ...ownedChannels].map((item) => [item.id, item.name]));
const platformName = (id) => originNames[id] || "Sem origem";
const originId = (row) => row.platform || row.origin || "";
const dateRange = (period) => [period.start, period.end].map((day) => fullDate.format(new Date(day + "T00:00:00Z"))).join(" – ");
const expenseDefaults = { revenueTax: null, adTax: null, perSale: null };
const preferenceDefaults = { origin: false, campaign: false };

function exportExample(events, period) {
  const cell = (input) => {
    const value = typeof input === "number" ? input.toFixed(2).replace(".", ",") : String(input ?? "");
    const safe = typeof input !== "number" && /^[=+@\-\s]/.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const rows = [["Conjunto de dados", "Pedido", "Data", "Hora de São Paulo", "Produto", "Gateway", "Status", "Origem", "Campanha", "Anúncio", "Posicionamento", "Pagamento", "Valor em BRL"]];
  for (const event of events) {
    if (event.status === "checkout") continue;
    const signed = event.status === "refunded" || event.status === "chargeback" ? -event.cents : event.cents;
    rows.push(["Exemplo", event.id, event.day, String(event.hour).padStart(2, "0") + ":00", event.product, event.gateway, statusLabels[event.status], platformName(originId(event)), event.campaign, event.ad, event.placement, paymentNames[event.payment], signed == null ? "" : signed / 100]);
  }
  const csv = rows.map((row) => row.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ads-exemplo-" + period.start + "-" + period.end + ".csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getCosts(expenses) {
  return { ...expenses, perSale: expenses.perSale == null ? null : Math.round(expenses.perSale * 100) };
}

function Comparison({ value, previous }) {
  if (value === null || previous === null || previous <= 0) return <span>Sem comparação</span>;
  return <span className="ads-compare">{signedPercent.format((value - previous) / previous)} vs. período anterior</span>;
}

function AdsFilters({ preset, setPreset, custom, setCustom, account, setAccount, offer, setOffer, campaigns, period, invalid }) {
  return (
    <section className="panel ads-filter-strip" aria-label="Filtros de ADS">
      <div className="ads-period-line">
        <div className="ads-periods" role="group" aria-label="Período">
          {periods.map(([id, label]) => <button key={id} type="button" aria-pressed={preset === id} onClick={() => setPreset(id)}>{label}</button>)}
        </div>
        {!invalid && <span className="ads-date-range">{dateRange(period)}</span>}
      </div>
      <div className="ads-filters">
        {preset === "custom" && <>
          <label>De<input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} /></label>
          <label>Até<input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} /></label>
        </>}
        <label>Conta de anúncio<select value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Todas as contas</option>{campaigns.map((campaign) => <option value={campaign.platform} key={campaign.id}>{campaign.account}</option>)}</select></label>
        <label>Produto<select value={offer} onChange={(e) => setOffer(e.target.value)}><option value="">Todos os produtos</option>{exampleOffers.map((name, index) => <option key={name} value={name}>{exampleProducts[index]}</option>)}</select></label>
        <div className="ads-context"><strong>BRL</strong><span>São Paulo · horário local</span></div>
      </div>
    </section>
  );
}

function HourlySales({ events }) {
  const counts = Array(24).fill(0);
  for (const event of events) if (event.status === "approved") counts[event.hour]++;
  const peak = Math.max(...counts);
  return (
    <section className="panel">
      <h2>Vendas por hora</h2>
      <p className="ads-note">Vendas aprovadas agrupadas por hora em São Paulo.</p>
      {peak ? <div className="ads-hour-chart" aria-label="Gráfico de vendas por hora">
        {counts.map((count, hour) => {
          const label = String(hour).padStart(2, "0") + "h";
          return <div className="ads-hour" key={hour} role="img" aria-label={label + ": " + count + " vendas"} title={label + ": " + count + " vendas"}>
            <div className="ads-hour-track"><div className="ads-hour-bar" style={{ height: (100 * count / peak) + "%" }} /></div>
            <span aria-hidden="true">{hour % 6 === 0 || hour === 23 ? label : ""}</span>
          </div>;
        })}
      </div> : <p className="empty">Sem vendas aprovadas no período.</p>}
    </section>
  );
}

function groupSales(events, getKey) {
  const groups = new Map();
  for (const event of events) {
    const key = getKey(event);
    if (key === undefined || key === null) continue;
    const row = groups.get(key) ?? { approved: 0, revenue: 0, checkouts: 0 };
    if (event.status === "approved") {
      row.approved++;
      row.revenue += event.cents;
    } else if (event.status === "refunded" || event.status === "chargeback") {
      row.revenue -= event.cents;
    } else if (event.status === "checkout") {
      row.checkouts++;
    } else continue;
    groups.set(key, row);
  }
  return [...groups].sort(([, a], [, b]) => b.revenue - a.revenue);
}

function PaymentBreakdown({ events }) {
  const rows = groupSales(events.filter(({ status }) => status === "approved"), (event) => event.payment);
  const total = rows.reduce((sum, [, row]) => sum + row.approved, 0);
  return (
    <section className="panel">
      <h2>Vendas por pagamento</h2>
      <p className="ads-note">Participação nas vendas aprovadas.</p>
      {rows.length ? <ul className="ads-payment-list">{rows.map(([method, row]) => (
        <li key={method}>
          <div><strong>{paymentNames[method]}</strong><span>{integer(row.approved)} · {percentage(row.approved / total)}</span></div>
          <progress aria-label={paymentNames[method]} value={row.approved} max={total} />
        </li>
      ))}</ul> : <p className="empty">Nenhuma venda aprovada no período.</p>}
    </section>
  );
}

function Placements({ events }) {
  const rows = groupSales(events, (event) => event.placement ? platformName(originId(event)) + " · " + event.placement : null);
  return (
    <section className="panel ads-placement">
      <h2>Posicionamentos</h2>
      <p className="ads-note">Vendas aprovadas e faturamento após estornos.</p>
      {rows.length ? <AdsTable label="Posicionamentos" headings={["Posicionamento", "Vendas", "Faturamento"]}>
        {rows.map(([name, row]) => <tr key={name}><th scope="row">{name}</th><td>{integer(row.approved)}</td><td>{money(row.revenue)}</td></tr>)}
      </AdsTable> : <p className="empty">Nenhuma venda ou acesso com posicionamento no período.</p>}
    </section>
  );
}

function OriginBreakdown({ data, onCampaigns }) {
  const rows = groupSales(data.events, originId);
  return (
    <section className="panel">
      <h2>Origem das vendas</h2>
      <p className="ads-note">Abra um canal para ver as campanhas identificadas.</p>
      {rows.length ? <div className="ads-origins">{rows.map(([id, row]) => (
        <details key={id}>
          <summary><span>{platformName(id)}</span><small>{integer(row.approved)} {row.approved === 1 ? "venda" : "vendas"}</small><b>{money(row.revenue)}</b></summary>
          <div className="ads-origin-detail">
            <dl className="ads-funnel">
              {groupSales(data.events.filter((event) => originId(event) === id), (event) => event.campaign || "Campanha não identificada").map(([name, item]) => <div key={name}><dt>{name}</dt><dd>{money(item.revenue)}</dd></div>)}
            </dl>
            {platforms.some((platform) => platform.id === id) && <button className="text-button" onClick={() => onCampaigns(id)}>Abrir campanhas de {platformName(id)}</button>}
          </div>
        </details>
      ))}</div> : <p className="empty">Nenhuma venda ou acesso no período.</p>}
    </section>
  );
}

function NotificationPreview({ preferences, onPreference }) {
  return (
    <section className="panel ads-notification">
      <h2>Aviso de venda</h2>
      <p className="ads-note">Escolha os detalhes da prévia. O envio ao celular depende da integração de notificações.</p>
      <div className="ads-options">
        <label><input type="checkbox" checked={preferences.origin} onChange={(event) => onPreference("origin", event.target.checked)} /> Incluir origem da venda</label>
        <label><input type="checkbox" checked={preferences.campaign} onChange={(event) => onPreference("campaign", event.target.checked)} /> Incluir nome da campanha</label>
      </div>
      <div className="ads-notification-sample" role="status"><strong>Venda aprovada · R$ 119,00</strong><p>{["Curso Exemplo", preferences.origin && "Google Ads", preferences.campaign && "Pesquisa de marca"].filter(Boolean).join(" · ")}</p></div>
    </section>
  );
}

function ExpenseSettings({ expenses, onExpenses }) {
  const fields = [["revenueTax", "Imposto sobre vendas (%)", 100], ["adTax", "Imposto sobre anúncios (%)", 100], ["perSale", "Custo por venda (R$)", undefined]];
  return (
    <details className="ads-expense-settings">
      <summary>Configurar custos da prévia</summary>
      <p className="ads-note">Preencha os três campos para calcular lucro e ROI. Informe 0 quando o custo não se aplicar.</p>
      <div className="ads-filters">
        {fields.map(([key, label, max]) => <label key={key}>{label}<input type="number" min="0" max={max} step="0.01" value={expenses[key] ?? ""} onChange={(event) => {
          const value = event.target.valueAsNumber;
          const valid = Number.isFinite(value) && value >= 0 && (max == null || value <= max);
          onExpenses(key, valid ? value : null);
        }} /></label>)}
      </div>
    </details>
  );
}

function AdsOverview({ data, previous, period, expenses, onExpenses, onCampaigns, onConnect, preferences, onPreference }) {
  const current = summarizeAds(data);
  const before = summarizeAds(previous);
  const costSettings = getCosts(expenses);
  const profit = adsProfit(current, costSettings);
  const previousProfit = adsProfit(before, costSettings);
  const tiles = [
    ["Gasto com anúncios", current.cost, before.cost, money],
    ["ROAS", current.roas, before.roas, multiple],
    ["Lucro", profit.profit, previousProfit.profit, money],
    ["ROI", profit.roi, previousProfit.roi, percentage],
    ["Margem", profit.margin, previousProfit.margin, percentage],
    ["CPA", current.cpa, before.cpa, money],
    ["Ticket médio", current.ticket, before.ticket, money],
    ["ARPU", current.arpu, before.arpu, money],
  ];
  const reconciliation = [["Pendentes", current.pendingAmount], ["Reembolsos", current.refundedAmount], ["Chargebacks", current.chargebackAmount], ["Imposto de vendas", profit.tax]];
  const tracking = [["Vendas via UTM", integer(current.utmSales)], ["Faturamento via UTM", money(current.utmRevenue)], ["Campanhas com UTM", integer(current.utmCampaigns)], ["Acessos ao checkout", data.events.length ? integer(current.checkout) : noData]];
  const steps = [["Checkouts iniciados", current.checkout], ["Compras principais", current.principalSales], ["Upsell 1", current.upsell1], ["Upsell 2", current.upsell2]];
  return (
    <div className="ads-overview-stack">
      <div className="ads-integration-strip"><div><p><strong>Integrações em espera</strong></p><p>As plataformas e os gateways estão na prévia. Conecte as fontes para cruzar investimento e vendas confirmadas.</p></div><button className="secondary" onClick={onConnect}>Ver conexões</button></div>
      <div className="ads-summary">
        <section className="balance-panel ads-revenue">
          <h2>Faturamento líquido</h2>
          <strong className="balance-number">{money(current.netRevenue)}</strong>
          <p>{formatDay(period.start)} a {formatDay(period.end)}</p>
          <Comparison value={current.netRevenue} previous={before.netRevenue} />
          <dl><div><dt>Vendas aprovadas</dt><dd>{integer(current.sales)}</dd></div></dl>
        </section>
        <div className="ads-kpis">
          {tiles.map(([name, value, prior, format]) => <article className="panel ads-kpi" key={name}><h2>{name}</h2><strong>{format(value)}</strong>{["Lucro", "ROI", "Margem"].includes(name) && value === null ? <span>Depende dos custos</span> : <Comparison value={value} previous={prior} />}</article>)}
        </div>
      </div>
      <div className="ads-pair">
        <PaymentBreakdown events={data.events} />
        <section className="panel">
          <h2>Conciliação do período</h2>
          <p className="ads-note">Os valores abaixo usam os pedidos e estornos da prévia.</p>
          <dl className="ads-funnel">{reconciliation.map(([name, amount]) => <div key={name}><dt>{name}</dt><dd>{money(amount)}</dd></div>)}</dl>
          <ExpenseSettings expenses={expenses} onExpenses={onExpenses} />
        </section>
      </div>
      <section className="panel">
        <div className="panel-head"><div><h2>Rastreamento de vendas</h2><p className="ads-note">Pedidos e visitas identificados pelos parâmetros do checkout.</p></div></div>
        <dl className="ads-tracking">{tracking.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <div className="ads-pair">
        <OriginBreakdown data={data} onCampaigns={onCampaigns} />
        <Placements events={data.events} />
      </div>
      <div className="ads-pair">
        <HourlySales events={data.events} />
        <section className="panel">
          <h2>Funil de vendas</h2>
          <p className="ads-note">Contagem de eventos por etapa no período.</p>
          <dl className="ads-funnel">{steps.map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{data.events.length ? integer(count) : noData}</dd></div>)}</dl>
        </section>
      </div>
      <NotificationPreview preferences={preferences} onPreference={onPreference} />
    </div>
  );
}

function AdsTable({ label, headings, children }) {
  return (
    <div className="ads-scroll" role="region" tabIndex={0} aria-label={label}>
      <table className="activity-table ads-table" aria-label={label}>
        <thead><tr>{headings.map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function PerformanceCells({ data, expenses }) {
  const stats = summarizeAds(data);
  const result = adsProfit(stats, getCosts(expenses));
  return <><td>{money(stats.cost)}</td><td>{integer(stats.sales)}</td><td>{money(stats.netRevenue)}</td><td>{money(stats.cpa)}</td><td>{multiple(stats.roas)}</td><td>{percentage(result.roi)}</td><td>{money(result.profit)}</td></>;
}

function Campaigns({ campaigns, data, expenses }) {
  const [campaignId, setCampaignId] = useState("");
  const [groupId, setGroupId] = useState("");
  const campaign = campaigns.find(({ id }) => id === campaignId);
  const group = campaign?.groups.find(({ id }) => id === groupId);
  const levels = group ? [{ ...group.ad, adIds: [group.ad.id] }] : campaign
    ? campaign.groups.map((item) => ({ ...item, adIds: [item.ad.id], open: () => setGroupId(item.id) }))
    : campaigns.map((item) => ({ ...item, adIds: item.groups.map(({ ad }) => ad.id), open: () => { setCampaignId(item.id); setGroupId(""); } }));
  return (
    <section className="panel">
      <div className="panel-head"><div><h2>{group ? "Anúncios" : campaign ? "Conjuntos" : "Campanhas"}</h2><p className="ads-note">{[campaign?.name, group?.name].filter(Boolean).join(" / ") || "Abra uma campanha para ver seus conjuntos e anúncios."}</p></div>
        {campaign && <button className="secondary" onClick={() => group ? setGroupId("") : setCampaignId("")}>{group ? "Voltar aos conjuntos" : "Voltar às campanhas"}</button>}</div>
      {levels.length ? <AdsTable label="Desempenho por campanha" headings={["Nome", "Status", "Orçamento diário", "Gasto", "Vendas", "Faturamento", "CPA", "ROAS", "ROI", "Lucro"]}>
        {levels.map((row) => <tr key={row.id}><th scope="row">{row.open ? <button className="text-button" onClick={row.open}>{row.name}</button> : row.name}{row.platform && <small>{platformName(row.platform)}</small>}</th><td>Ativo · exemplo</td><td>{money(row.budget ?? null)}</td><PerformanceCells data={onlyAds(data, row.adIds)} expenses={expenses} /></tr>)}
      </AdsTable> : <p className="empty">Nenhuma campanha com os filtros atuais.</p>}
    </section>
  );
}

function Sales({ events }) {
  const [unattributed, setUnattributed] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const rows = events.filter((item) => item.status !== "checkout" && (!unattributed || !originId(item)) &&
    [item.id, item.product, item.campaign, item.gateway].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const pageSize = 30;
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, lastPage);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <section className="panel">
      <div className="panel-head ads-table-tools">
        <div className="mode-switch ads-local-switch" role="group" aria-label="Origem das vendas"><button aria-pressed={!unattributed} onClick={() => { setUnattributed(false); setPage(1); }}>Todas</button><button aria-pressed={unattributed} onClick={() => { setUnattributed(true); setPage(1); }}>Sem origem</button></div>
        <input type="search" aria-label="Buscar vendas" placeholder="Buscar venda ou gateway" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
      </div>
      {rows.length ? <AdsTable label="Vendas do período" headings={["Pedido", "Produto", "Data e hora", "Gateway", "Status", "Origem", "Valor"]}>
        {pageRows.map((row) => <tr key={row.id}><th scope="row">{row.id}</th><td>{row.product}</td><td>{formatDay(row.day)} · {String(row.hour).padStart(2, "0")}:00</td><td>{row.gateway}</td><td><span className={`entry-status ${row.status === "approved" ? "settled" : "pending"}`}>{statusLabels[row.status]}</span></td><td>{platformName(originId(row))}{row.campaign && <small>{[row.campaign, row.ad].filter(Boolean).join(" · ")}</small>}</td><td>{money(row.status === "refunded" || row.status === "chargeback" ? -row.cents : row.cents)}</td></tr>)}
      </AdsTable> : <p className="empty">Nenhuma venda encontrada com os filtros atuais.</p>}
      {lastPage > 1 && <div className="ads-pagination"><span>Página {currentPage} de {lastPage}</span><button className="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><button className="secondary" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Próxima</button></div>}
    </section>
  );
}

function Connections() {
  return (
    <div className="ads-analysis">
      <section className="panel">
        <h2>Plataformas de anúncio</h2>
        <ul className="ads-connection-list">{platforms.map(({ id, name, detail }) => <li key={id}><div><strong>{name}</strong><small>{detail}</small></div><span className="entry-status pending">Não conectado</span></li>)}</ul>
      </section>
      <section className="panel">
        <h2>Gateways de venda</h2>
        <ul className="ads-connection-list">{gateways.map((name) => <li key={name}><strong>{name}</strong><span className="entry-status pending">Não conectado</span></li>)}</ul>
        <p className="ads-note">Endereços de webhook, parâmetros de anúncios e script de rastreio estarão disponíveis após configurar e validar as integrações.</p>
      </section>
    </div>
  );
}

function CreativeBatches({ campaigns, data, offer, expenses }) {
  const [batch, setBatch] = useState("Leva 01");
  const entries = campaigns.flatMap((campaign) => campaign.groups.map(({ ad }) => ({ ...ad, platform: campaign.platform }))).filter((ad) => ad.batch === batch);
  const stats = summarizeAds(onlyAds(data, entries.map(({ id }) => id)));
  return (
    <section className="panel">
      <div className="panel-head"><div><h2>Levas de criativos</h2><p className="ads-note">{offer || "Todas as ofertas"} · {entries.length} anúncios · Investimento: {money(stats.cost)}</p></div>
        <select aria-label="Leva de criativos" value={batch} onChange={(e) => setBatch(e.target.value)}><option>Leva 01</option><option>Leva 02</option></select></div>
      {entries.length ? <AdsTable label="Indicadores dos criativos" headings={["Criativo", "Plataforma", "Gasto", "Vendas", "Faturamento", "CPA", "ROAS", "ROI", "Lucro"]}>
        {entries.map((ad) => <tr key={ad.id}><th scope="row">{ad.name}</th><td>{platformName(ad.platform)}</td><PerformanceCells data={onlyAds(data, [ad.id])} expenses={expenses} /></tr>)}
      </AdsTable> : <p className="empty">Nenhum criativo com os filtros atuais.</p>}
    </section>
  );
}

export function AdsMode({ Icon, dark, onToggleTheme, userId }) {
  const [view, setView] = useState("dashboard");
  const [preset, setPreset] = useState("7");
  const [account, setAccount] = useState("");
  const [offer, setOffer] = useState("");
  const [today, setToday] = useState(todayInPanel);
  const [custom, setCustom] = useState(() => getPeriod(todayInPanel(), "7"));
  const [refreshMessage, setRefreshMessage] = useState("");
  const [expenses, setExpenses] = useState(expenseDefaults);
  const [preferences, setPreferences] = useState(preferenceDefaults);
  const example = useMemo(() => buildExample(today), [today]);
  const period = getPeriod(today, preset, custom);
  const invalid = !period.start || !period.end || period.start > period.end || period.end > today ||
    period.start < getPeriod(period.end || today, "12m").start;
  const data = useMemo(() => invalid ? null : filterExample(example, period, account, offer), [example, period.start, period.end, account, offer, invalid]);
  const earlier = useMemo(() => invalid ? null : filterExample(example, previousPeriod(period), account, offer), [example, period.start, period.end, account, offer, invalid]);
  const campaigns = example.campaigns.filter((item) => (!account || item.platform === account) && (!offer || item.offer === offer));
  const currentTitle = navigation.find(([id]) => id === view)[1];
  const preferenceKey = "ads:notification:" + userId;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey));
      setPreferences({ origin: saved?.origin === true, campaign: saved?.campaign === true });
    } catch {
      setPreferences(preferenceDefaults);
    }
  }, [preferenceKey]);

  function changePreference(key, value) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(next));
    } catch {
      // The preview still works if the browser blocks storage.
    }
  }

  function showCampaigns(platform) {
    setAccount(platform);
    setView("campaigns");
  }

  function refreshExample() {
    setToday(todayInPanel());
    setRefreshMessage("Prévia atualizada às " + new Intl.DateTimeFormat("pt-BR", { timeZone: adsTimeZone, timeStyle: "short" }).format(new Date()) + ".");
  }

  return (
    <>
      <nav className="main-nav ads-nav" aria-label="Navegação ADS">
        {navigation.map(([id, label, icon]) => <button key={id} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}><Icon name={icon} size={17} /><span>{label}</span></button>)}
      </nav>
      <main className="workspace-content ads-content" id="workspace-content">
        <div className="page-heading">
          <div><h1>{view === "dashboard" ? "Central de ADS" : currentTitle}</h1><p>Prévia com dados de exemplo.</p></div>
          <div className="ads-actions">
            <button className="secondary" aria-pressed={dark} onClick={onToggleTheme}>Tema escuro</button>
            {view !== "connections" && <button className="secondary" onClick={refreshExample}>Atualizar prévia</button>}
            {(view === "dashboard" || view === "sales") && <button className="primary ads-export" disabled={!data?.events.some(({ status }) => status !== "checkout")} onClick={() => exportExample(data.events, period)}>Exportar CSV</button>}
          </div>
        </div>
        {view !== "connections" && <>
          <AdsFilters {...{ preset, setPreset, custom, setCustom, account, setAccount, offer, setOffer, period, invalid }} campaigns={example.campaigns} />
          <p className="ads-note ads-source-note" role="status">Cotação: valores já em BRL · Sincronização real: pendente{refreshMessage && " · " + refreshMessage}</p>
        </>}
        {view === "connections" ? <Connections /> : invalid ? <p className="notice" role="alert">Escolha um intervalo válido de até 12 meses, encerrado até hoje.</p> : <>
          {view === "dashboard" && <AdsOverview data={data} previous={earlier} period={period} expenses={expenses}
            onExpenses={(key, value) => setExpenses((current) => ({ ...current, [key]: value }))}
            onCampaigns={showCampaigns} onConnect={() => setView("connections")} preferences={preferences} onPreference={changePreference} />}
          {view === "campaigns" && <Campaigns key={account + ":" + offer} campaigns={campaigns} data={data} expenses={expenses} />}
          {view === "sales" && <Sales key={[period.start, period.end, account, offer].join(":")} events={data.events} />}
          {view === "creatives" && <CreativeBatches campaigns={campaigns} data={data} offer={offer} expenses={expenses} />}
        </>}
      </main>
    </>
  );
}
