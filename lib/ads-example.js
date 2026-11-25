export const adsTimeZone = "America/Sao_Paulo";

export const platforms = [
  { id: "meta", name: "Meta Ads", detail: "Facebook e Instagram" },
  { id: "tiktok", name: "TikTok Ads", detail: "Relatórios de anúncios" },
  { id: "google", name: "Google Ads", detail: "Relatórios de campanhas" },
  { id: "chatgpt", name: "ChatGPT Ads", detail: "OpenAI Advertiser API" },
];

export const gateways = ["Cakto", "Asaas", "Kiwify"];
export const exampleOffers = ["Oferta Exemplo A", "Oferta Exemplo B"];

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
    name: ["Prospecção Brasil", "Vídeos de descoberta", "Pesquisa de marca", "Descoberta no ChatGPT"][index],
    account: "Conta Exemplo · " + platform.name,
    offer: exampleOffers[index % exampleOffers.length],
    budget: [14000, 11000, 12500, 8000][index],
    groups: ["Público amplo", "Retargeting"].map((name, groupIndex) => ({
      id: platform.id + "-g" + groupIndex,
      name,
      ad: { id: platform.id + "-a" + groupIndex, name: groupIndex ? "Demonstração curta" : "Benefício em 15 s", batch: groupIndex ? "Leva 02" : "Leva 01" },
    })),
  }));
  const spend = [];
  const events = [];

  for (let offset = 0; offset < 60; offset++) {
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
          product: "Produto Exemplo",
          step: "principal",
          cents: 9900 + (signal % 3) * 2000,
        };
        if (signal % 3 !== 0) {
          events.push({ ...event, id: event.id + "-C", status: "checkout", cents: null });
          events.push({ ...event, status: "approved" });
          if (signal % 8 === 1) {
            events.push({ ...event, id: event.id + "-U1", product: "Upsell 1 Exemplo", step: "upsell1", cents: 4900, status: "approved" });
            if (signal % 16 === 1) events.push({ ...event, id: event.id + "-U2", product: "Upsell 2 Exemplo", step: "upsell2", cents: 2900, status: "approved" });
          }
          if (signal % 11 === 1) events.push({ ...event, id: event.id + "-R", status: signal % 2 ? "refunded" : "chargeback" });
        } else if (signal % 5 === 0) {
          events.push({ ...event, status: "checkout", cents: null });
        }
      });
    });
    if (offset % 3 === 0) {
      const event = { id: "EX-SEM-" + offset, day, hour: 17, gateway: gateways[(offset / 3) % 3], adId: null, platform: null, offer: exampleOffers[0], product: "Produto Exemplo", step: "principal" };
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
  const principalSales = orders.filter(({ step }) => step === "principal").length;
  const totalCents = (rows) => rows.reduce((sum, row) => sum + row.cents, 0);
  const cost = spend.length ? totalCents(spend) : null;
  const revenue = events.length ? totalCents(orders) - totalCents(refunds) - totalCents(chargebacks) : null;
  return {
    cost,
    revenue,
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

export function onlyAds(data, adIds) {
  const ids = new Set(adIds);
  return {
    spend: data.spend.filter(({ adId }) => ids.has(adId)),
    events: data.events.filter(({ adId }) => ids.has(adId)),
  };
}
