const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=5",
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

async function fetchOkx(instId) {
  const url = `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(instId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OKX ${res.status}`);

  const payload = await res.json();
  const row = payload?.data?.[0];
  const price = toNumber(row?.last);
  const open24h = toNumber(row?.open24h);
  const change = Number.isFinite(open24h) ? price - open24h : NaN;
  const changePct =
    Number.isFinite(open24h) && open24h !== 0 ? (change / open24h) * 100 : NaN;

  if (!Number.isFinite(price)) throw new Error("Invalid OKX payload");

  return { price, change, changePct, asOf: Date.now(), sourceTag: "OKX" };
}

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);

  const payload = await res.json();
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const latestClose = closes.filter((v) => Number.isFinite(v)).at(-1);
  const price = Number.isFinite(meta?.regularMarketPrice)
    ? meta.regularMarketPrice
    : latestClose;
  const previousClose = Number.isFinite(meta?.previousClose) ? meta.previousClose : NaN;
  const change = Number.isFinite(previousClose) ? price - previousClose : NaN;
  const changePct =
    Number.isFinite(previousClose) && previousClose !== 0
      ? (change / previousClose) * 100
      : NaN;

  if (!Number.isFinite(price)) throw new Error("Invalid Yahoo payload");

  return {
    price,
    change,
    changePct,
    asOf: Number.isFinite(meta?.regularMarketTime) ? meta.regularMarketTime * 1000 : Date.now(),
    sourceTag: "Yahoo",
  };
}

function fetchDemo(symbol) {
  const baseline = { btc: 68000, eth: 3600, xauusd: 2300, spx: 5200, ndx: 18500 };
  const previous = baseline[symbol] ?? 100;
  const driftPct = (Math.random() - 0.5) * 0.8;
  const price = previous * (1 + driftPct / 100);
  return {
    price,
    change: price - previous,
    changePct: driftPct,
    asOf: Date.now(),
    sourceTag: "DemoFeed",
    demoSource: true,
  };
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).set(CORS_HEADERS).end();
  }

  // Set CORS on all responses
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const symbol = (req.query.symbol || "").toLowerCase();
  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol" });
  }

  try {
    let data;
    if (symbol === "btc") data = await fetchOkx("BTC-USDT");
    else if (symbol === "eth") data = await fetchOkx("ETH-USDT");
    else if (symbol === "xauusd") data = await fetchYahoo("GC=F");
    else if (symbol === "spx") data = await fetchYahoo("^GSPC");
    else if (symbol === "ndx") data = await fetchYahoo("^NDX");
    else return res.status(400).json({ error: "Unsupported symbol" });

    return res.status(200).json(data);
  } catch {
    return res.status(200).json(fetchDemo(symbol));
  }
}
