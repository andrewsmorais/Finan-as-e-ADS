import { useMemo, useState } from "react";
import {
  adsTimeZone, buildExample, exampleOffers, filterExample, gateways, getPeriod,
  onlyAds, platforms, previousPeriod, summarizeAds, todayInPanel,
} from "../lib/ads-example";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR");
const ratio = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const signedPercent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const noData = "Sem dados";

const navigation = [
  ["dashboard", "Dashboard", "grid"],
  ["campaigns", "Campanhas", "chart"],
  ["sales", "Vendas", "receipt"],
  ["connections", "Conectar", "bank"],
  ["creatives", "Creative Hub", "card"],
];
const statusLabels = { approved: "Aprovada", refunded: "Reembolso", chargeback: "Chargeback", checkout: "Checkout iniciado" };

const money = (cents) => cents === null ? noData : currency.format(cents / 100);
const multiple = (value) => value === null ? noData : ratio.format(value) + "×";
const integer = (value) => value === null ? noData : number.format(value);
const percentage = (value) => value === null ? noData : percent.format(value);
const formatDay = (day) => shortDate.format(new Date(day + "T00:00:00Z"));
const platformName = (id) => platforms.find((item) => item.id === id)?.name || "Sem origem";

function Comparison({ value, previous }) {
  if (value === null || previous === null || previous <= 0) return <span>Sem comparação</span>;
  return <span className="ads-compare">{signedPercent.format((value - previous) / previous)} vs. período anterior</span>;
}

function AdsFilters({ preset, setPreset, custom, setCustom, account, setAccount, offer, setOffer, campaigns }) {
  return (
    <div className="panel ads-filters" aria-label="Filtros de ADS">
      <label>Período<select value={preset} onChange={(e) => setPreset(e.target.value)}><option value="1">Hoje</option><option value="yesterday">Ontem</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="custom">Personalizado</option></select></label>
      {preset === "custom" && <>
        <label>De<input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} /></label>
        <label>Até<input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} /></label>
      </>}
      <label>Conta de anúncio<select value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Todas as contas</option>{campaigns.map((campaign) => <option value={campaign.platform} key={campaign.id}>{campaign.account}</option>)}</select></label>
      <label>Oferta<select value={offer} onChange={(e) => setOffer(e.target.value)}><option value="">Todas as ofertas</option>{exampleOffers.map((name) => <option key={name}>{name}</option>)}</select></label>
      <div className="ads-context"><strong>BRL</strong><span>São Paulo · horário local</span></div>
    </div>
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

function AdsOverview({ data, previous, period }) {
  const current = summarizeAds(data);
  const before = summarizeAds(previous);
  const tiles = [
    ["Gasto", current.cost, before.cost, money],
    ["Vendas", current.sales, before.sales, integer],
    ["ROAS", current.roas, before.roas, multiple],
    ["CPA", current.cpa, before.cpa, money],
    ["Ticket médio", current.ticket, before.ticket, money],
    ["Lucro", null, null, money],
    ["ROI", null, null, multiple],
    ["Vendas atribuídas", current.attribution, before.attribution, percentage],
  ];
  const steps = [["Checkouts iniciados", current.checkout], ["Compras principais", current.principalSales], ["Upsell 1", current.upsell1], ["Upsell 2", current.upsell2]];
  return (
    <>
      <div className="ads-summary">
        <section className="balance-panel ads-revenue">
          <h2>Faturamento</h2>
          <strong className="balance-number">{money(current.revenue)}</strong>
          <p>{formatDay(period.start)} a {formatDay(period.end)}</p>
          <Comparison value={current.revenue} previous={before.revenue} />
          <dl><div><dt>Reembolsos / chargebacks</dt><dd>{data.events.length ? current.refunds + " / " + current.chargebacks : noData}</dd></div></dl>
        </section>
        <div className="ads-kpis">
          {tiles.map(([name, value, prior, format]) => <article className="panel ads-kpi" key={name}><h2>{name}</h2><strong>{format(value)}</strong>{name === "Lucro" || name === "ROI" ? <span>Custos a definir</span> : <Comparison value={value} previous={prior} />}</article>)}
        </div>
      </div>
      <div className="ads-analysis">
        <HourlySales events={data.events} />
        <section className="panel">
          <h2>Funil de vendas</h2>
          <p className="ads-note">Contagem de eventos por etapa no período.</p>
          <dl className="ads-funnel">{steps.map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{data.events.length ? integer(count) : noData}</dd></div>)}</dl>
        </section>
      </div>
    </>
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

function PerformanceCells({ data }) {
  const stats = summarizeAds(data);
  return <><td>{money(stats.cost)}</td><td>{integer(stats.sales)}</td><td>{money(stats.revenue)}</td><td>{money(stats.cpa)}</td><td>{multiple(stats.roas)}</td><td>{noData}</td><td>{noData}</td></>;
}

function Campaigns({ campaigns, data }) {
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
        {levels.map((row) => <tr key={row.id}><th scope="row">{row.open ? <button className="text-button" onClick={row.open}>{row.name}</button> : row.name}{row.platform && <small>{platformName(row.platform)}</small>}</th><td>Ativo · exemplo</td><td>{money(row.budget ?? null)}</td><PerformanceCells data={onlyAds(data, row.adIds)} /></tr>)}
      </AdsTable> : <p className="empty">Nenhuma campanha com os filtros atuais.</p>}
    </section>
  );
}

function Sales({ events }) {
  const [unattributed, setUnattributed] = useState(false);
  const [query, setQuery] = useState("");
  const rows = events.filter((item) => item.status !== "checkout" && (!unattributed || !item.adId) &&
    [item.id, item.product, item.campaign, item.gateway].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <section className="panel">
      <div className="panel-head ads-table-tools">
        <div className="mode-switch ads-local-switch" role="group" aria-label="Origem das vendas"><button aria-pressed={!unattributed} onClick={() => setUnattributed(false)}>Todas</button><button aria-pressed={unattributed} onClick={() => setUnattributed(true)}>Sem origem</button></div>
        <input type="search" aria-label="Buscar vendas" placeholder="Buscar venda ou gateway" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {rows.length ? <AdsTable label="Vendas do período" headings={["Pedido", "Produto", "Data e hora", "Gateway", "Status", "Origem", "Valor"]}>
        {rows.map((row) => <tr key={row.id}><th scope="row">{row.id}</th><td>{row.product}</td><td>{formatDay(row.day)} · {String(row.hour).padStart(2, "0")}:00</td><td>{row.gateway}</td><td><span className={`entry-status ${row.status === "approved" ? "settled" : "pending"}`}>{statusLabels[row.status]}</span></td><td>{platformName(row.platform)}{row.adId && <small>{row.campaign} · {row.ad}</small>}</td><td>{money(row.status === "approved" ? row.cents : -row.cents)}</td></tr>)}
      </AdsTable> : <p className="empty">Nenhuma venda encontrada com os filtros atuais.</p>}
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

function CreativeBatches({ campaigns, data, offer }) {
  const [batch, setBatch] = useState("Leva 01");
  const entries = campaigns.flatMap((campaign) => campaign.groups.map(({ ad }) => ({ ...ad, platform: campaign.platform }))).filter((ad) => ad.batch === batch);
  const stats = summarizeAds(onlyAds(data, entries.map(({ id }) => id)));
  return (
    <section className="panel">
      <div className="panel-head"><div><h2>Levas de criativos</h2><p className="ads-note">{offer || "Todas as ofertas"} · {entries.length} anúncios · Investimento: {money(stats.cost)}</p></div>
        <select aria-label="Leva de criativos" value={batch} onChange={(e) => setBatch(e.target.value)}><option>Leva 01</option><option>Leva 02</option></select></div>
      {entries.length ? <AdsTable label="Indicadores dos criativos" headings={["Criativo", "Plataforma", "Gasto", "Vendas", "Faturamento", "CPA", "ROAS", "ROI", "Lucro"]}>
        {entries.map((ad) => <tr key={ad.id}><th scope="row">{ad.name}</th><td>{platformName(ad.platform)}</td><PerformanceCells data={onlyAds(data, [ad.id])} /></tr>)}
      </AdsTable> : <p className="empty">Nenhum criativo com os filtros atuais.</p>}
    </section>
  );
}

export function AdsMode({ Icon, dark, onToggleTheme }) {
  const [view, setView] = useState("dashboard");
  const [preset, setPreset] = useState("7");
  const [account, setAccount] = useState("");
  const [offer, setOffer] = useState("");
  const [today, setToday] = useState(todayInPanel);
  const [custom, setCustom] = useState(() => getPeriod(todayInPanel(), "7"));
  const [refreshMessage, setRefreshMessage] = useState("");
  const example = useMemo(() => buildExample(today), [today]);
  const period = getPeriod(today, preset, custom);
  const invalid = !period.start || !period.end || period.start > period.end;
  const data = invalid ? null : filterExample(example, period, account, offer);
  const campaigns = example.campaigns.filter((item) => (!account || item.platform === account) && (!offer || item.offer === offer));
  const currentTitle = navigation.find(([id]) => id === view)[1];

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
        <div className="page-heading"><div><h1>{view === "dashboard" ? "Central de ADS" : currentTitle}</h1><p>Prévia com dados de exemplo.</p></div><div className="ads-actions"><button className="secondary" aria-pressed={dark} onClick={onToggleTheme}>Tema escuro</button>{view !== "connections" && <button className="primary" onClick={refreshExample}>Atualizar prévia</button>}</div></div>
        {view !== "connections" && <>
          <AdsFilters {...{ preset, setPreset, custom, setCustom, account, setAccount, offer, setOffer }} campaigns={example.campaigns} />
          <p className="ads-note ads-source-note" role="status">Cotação: valores já em BRL · Sincronização real: pendente{refreshMessage && " · " + refreshMessage}</p>
        </>}
        {view === "connections" ? <Connections /> : invalid ? <p className="notice" role="alert">Escolha um intervalo válido.</p> : <>
          {view === "dashboard" && <AdsOverview data={data} previous={filterExample(example, previousPeriod(period), account, offer)} period={period} />}
          {view === "campaigns" && <Campaigns key={account + ":" + offer} campaigns={campaigns} data={data} />}
          {view === "sales" && <Sales events={data.events} />}
          {view === "creatives" && <CreativeBatches campaigns={campaigns} data={data} offer={offer} />}
        </>}
      </main>
    </>
  );
}
