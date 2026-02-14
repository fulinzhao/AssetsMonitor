const PROXY_BASE_URL = import.meta.env.VITE_QUOTE_PROXY_BASE_URL?.trim();
const DEMO_BASELINE = {
  btc: 68000,
  eth: 3600,
  xauusd: 2300,
  spx: 5200,
  ndx: 18500,
};
const demoState = {};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function normalizeQuote(payload) {
  const price = toNumber(payload?.price);
  const change = toNumber(payload?.change);
  const changePct = toNumber(payload?.changePct);
  const asOf = toNumber(payload?.asOf);

  if (!Number.isFinite(price)) {
    throw new Error("Invalid proxy payload");
  }

  return {
    price,
    change,
    changePct,
    asOf: Number.isFinite(asOf) ? asOf : Date.now(),
    sourceTag: payload?.sourceTag || "QuoteProxy",
    demoSource: Boolean(payload?.demoSource),
  };
}

async function fetchProxyQuote(symbol) {
  if (!PROXY_BASE_URL) {
    throw new Error("Missing VITE_QUOTE_PROXY_BASE_URL");
  }

  const url = `${PROXY_BASE_URL.replace(/\/$/, "")}/quote?symbol=${encodeURIComponent(symbol.id)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status}`);
  }

  const payload = await response.json();
  return normalizeQuote(payload);
}

function fetchDemoQuote(symbol) {
  const previous = demoState[symbol.id] ?? DEMO_BASELINE[symbol.id] ?? 100;
  const driftPct = (Math.random() - 0.5) * 0.8;
  const nextPrice = previous * (1 + driftPct / 100);
  const change = nextPrice - previous;

  demoState[symbol.id] = nextPrice;

  return {
    price: nextPrice,
    change,
    changePct: driftPct,
    asOf: Date.now(),
  };
}

export async function fetchQuote(symbol) {
  try {
    return await fetchProxyQuote(symbol);
  } catch {
    const quote = fetchDemoQuote(symbol);
    return {
      ...quote,
      sourceTag: "DemoFeed",
      demoSource: true,
    };
  }
}
