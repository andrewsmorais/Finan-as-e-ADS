export const adsTimeZone = "America/Sao_Paulo";

export const platforms = [
  { id: "meta", name: "Meta Ads", detail: "Facebook e Instagram" },
  { id: "tiktok", name: "TikTok Ads", detail: "Relatórios de anúncios" },
  { id: "google", name: "Google Ads", detail: "Relatórios de campanhas" },
  { id: "chatgpt", name: "ChatGPT Ads", detail: "OpenAI Advertiser API" },
  { id: "pinterest", name: "Pinterest Ads", detail: "Relatórios de campanhas" },
];

export const ownedChannels = [
  { id: "whatsapp", name: "WhatsApp" },
  { id: "email", name: "E-mail" },
  { id: "organic", name: "Orgânico" },
];
export const gateways = ["Cakto", "Asaas", "Kiwify"];
export const exampleOffers = ["Oferta Exemplo A", "Oferta Exemplo B"];
export const exampleProducts = ["Curso Exemplo", "Kit Exemplo"];
export const paymentNames = { pix: "Pix", card: "Cartão", boleto: "Boleto" };

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: adsTimeZone });

export function todayInPanel() {
  return dayFormatter.format(new Date());
}

export function shiftDay(day, delta) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function getPeriod(today, preset, custom) {
  if (preset === "custom") return custom;
  if (preset === "yesterday") return { start: shiftDay(today, -1), end: shiftDay(today, -1) };
  if (preset === "6m" || preset === "12m") {
    const date = new Date(today + "T00:00:00Z");
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - parseInt(preset, 10) + 1, 0));
    target.setUTCDate(Math.min(date.getUTCDate(), target.getUTCDate()));
    return { start: shiftDay(target.toISOString().slice(0, 10), 1), end: today };
  }
  return { start: shiftDay(today, 1 - Number(preset)), end: today };
}

export function previousPeriod({ start, end }) {
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  return { start: shiftDay(start, -days), end: shiftDay(start, -1) };
}

export function buildExample(today) {
  const campaigns = platforms.map((platform, index) => ({
    id: platform.id,
    platform: platform.id,
    name: ["Prospecção Brasil", "Vídeos de descoberta", "Pesquisa de marca", "Descoberta no ChatGPT", "Inspiração e descoberta"][index],
    account: "Conta Exemplo · " + platform.name,
    offer: exampleOffers[index % exampleOffers.length],
    budget: [14000, 11000, 12500, 8000, 9000][index],
    groups: ["Público amplo", "Retargeting"].map((name, groupIndex) => ({
      id: platform.id + "-g" + groupIndex,
      name,
      ad: { id: platform.id + "-a" + groupIndex, name: groupIndex ? "Demonstração curta" : "Benefício em 15 s", batch: groupIndex ? "Leva 02" : "Leva 01" },
    })),
  }));
  const spend = [];
  const events = [];

  for (let offset = 0; offset < 732; offset++) {
    const day = shiftDay(today, -offset);
    campaigns.forEach((campaign, index) => {
      campaign.groups.forEach(({ ad }, groupIndex) => {
        const signal = offset * 3 + index * 5 + groupIndex;
        const adId = ad.id;
        spend.push({ day, adId, platform: campaign.platform, offer: campaign.offer, cents: 900 + (signal % 9) * 275 + index * 350 });
        const event = {
          id: "EX-" + offset + "-" + (index + 1) + (groupIndex + 1),
          day,
          hour: 8 + signal % 15,
          gateway: gateways[signal % gateways.length],
          adId,
          platform: campaign.platform,
          offer: campaign.offer,
          campaign: campaign.name,
          ad: ad.name,
          product: exampleProducts[index % exampleProducts.length],
          payment: ["pix", "card", "boleto"][Math.floor(signal / 2) % 3],
          placement: [["Feed", "Stories"], ["Para Você", "Feed"], ["Pesquisa", "Rede de Display"], ["ChatGPT", "ChatGPT"], ["Pesquisa do Pinterest", "Feed inicial"]][index][groupIndex],
          utm: true,
          step: "principal",
          cents: 9900 + (signal % 3) * 2000,
        };
        if (signal % 3 !== 0) {
          events.push({ ...event, id: event.id + "-C", status: "checkout", cents: null });
          events.push({ ...event, buyerId: event.id, status: "approved" });
          if (signal % 8 === 1) {
            events.push({ ...event, id: event.id + "-U1", buyerId: event.id, product: "Upsell 1 Exemplo", step: "upsell1", cents: 4900, status: "approved" });
            if (signal % 16 === 1) events.push({ ...event, id: event.id + "-U2", buyerId: event.id, product: "Upsell 2 Exemplo", step: "upsell2", cents: 2900, status: "approved" });
          }
          if (signal % 11 === 1) events.push({ ...event, id: event.id + "-R", status: signal % 2 ? "refunded" : "chargeback" });
        } else if (signal % 5 === 0) {
          events.push({ ...event, id: event.id + "-C", status: "checkout", cents: null });
          if (event.payment === "pix" || event.payment === "boleto") events.push({ ...event, status: "pending" });
        }
      });
    });
    if (offset % 3 === 0) {
      const index = Math.floor(offset / 3);
      const origin = ownedChannels[index % 4] ?? null;
      const id = "EX-DIR-" + offset;
      const event = { id, buyerId: id, day, hour: 17, gateway: gateways[index % 3], adId: null, platform: null, origin: origin?.id, campaign: ["Lista de transmissão", "Boletim de novidades", "Conteúdo e busca"][index % 4], utm: !!origin && origin.id !== "organic", offer: exampleOffers[0], product: exampleProducts[0], payment: ["pix", "card", "boleto"][index % 3], step: "principal" };
      events.push({ ...event, id: event.id + "-C", cents: null, status: "checkout" });
      events.push({ ...event, cents: 11900, status: "approved" });
    }
  }
  return { campaigns, spend, events };
}

export function filterExample(example, period, account, offer) {
  const within = (row) => row.day >= period.start && row.day <= period.end &&
    (!account || row.platform === account) && (!offer || row.offer === offer);
  return { spend: example.spend.filter(within), events: example.events.filter(within) };
}

export function summarizeAds({ spend, events }) {
  const orders = events.filter(({ status }) => status === "approved");
  const refunds = events.filter(({ status }) => status === "refunded");
  const chargebacks = events.filter(({ status }) => status === "chargeback");
  const pending = events.filter(({ status }) => status === "pending");
  const principalSales = orders.filter(({ step }) => step === "principal").length;
  const totalCents = (rows) => rows.reduce((sum, row) => sum + row.cents, 0);
  const cost = spend.length ? totalCents(spend) : null;
  const revenue = events.length ? totalCents(orders) - totalCents(refunds) - totalCents(chargebacks) : null;
  const reversals = [...refunds, ...chargebacks];
  const fees = (rows) => rows.reduce((total, row) => total + Math.round(row.cents * 0.05), 0);
  const netRevenue = revenue === null ? null : revenue - fees(orders) + fees(reversals);
  const buyers = new Set(orders.map(({ buyerId, id }) => buyerId || id)).size;
  const utmOrders = orders.filter(({ utm }) => utm);
  return {
    cost,
    revenue,
    netRevenue,
    pendingAmount: events.length ? totalCents(pending) : null,
    refundedAmount: events.length ? totalCents(refunds) : null,
    chargebackAmount: events.length ? totalCents(chargebacks) : null,
    arpu: buyers ? netRevenue / buyers : null,
    utmSales: events.length ? utmOrders.length : null,
    utmRevenue: events.length ? totalCents(utmOrders) - totalCents(reversals.filter(({ utm }) => utm)) : null,
    utmCampaigns: events.length ? new Set(events.filter((row) => row.utm && row.campaign && ["approved", "checkout"].includes(row.status)).map((row) => [row.platform || row.origin, row.campaign].join(":"))).size : null,
    sales: events.length ? orders.length : null,
    roas: revenue !== null && cost > 0 ? revenue / cost : null,
    cpa: cost !== null && principalSales > 0 ? cost / principalSales : null,
    ticket: revenue !== null && orders.length ? revenue / orders.length : null,
    attribution: orders.length ? orders.filter(({ adId }) => adId).length / orders.length : null,
    checkout: events.filter(({ status }) => status === "checkout").length,
    principalSales,
    upsell1: orders.filter(({ step }) => step === "upsell1").length,
    upsell2: orders.filter(({ step }) => step === "upsell2").length,
    refunds: refunds.length,
    chargebacks: chargebacks.length,
  };
}

export function adsProfit(stats, expenses) {
  const revenueTax = expenses?.revenueTax ?? null;
  const adTax = expenses?.adTax ?? null;
  const perSale = expenses?.perSale ?? null;
  const tax = stats.revenue === null || revenueTax === null ? null : Math.round(Math.max(0, stats.revenue) * revenueTax / 100);
  if (stats.netRevenue === null || stats.cost === null || tax === null || adTax === null || perSale === null) {
    return { tax, profit: null, roi: null, margin: null };
  }
  const adTaxCents = Math.round(stats.cost * adTax / 100);
  const profit = stats.netRevenue - stats.cost - adTaxCents - tax - perSale * stats.principalSales;
  return {
    tax,
    profit,
    roi: stats.cost > 0 ? profit / stats.cost : null,
    margin: stats.netRevenue > 0 ? profit / stats.netRevenue : null,
  };
}

export function onlyAds(data, adIds) {
  const ids = new Set(adIds);
  return {
    spend: data.spend.filter(({ adId }) => ids.has(adId)),
    events: data.events.filter(({ adId }) => ids.has(adId)),
  };
}
