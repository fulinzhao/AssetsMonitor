function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "public, max-age=5",
    },
  });
}

async function fetchOkx(instId) {
  const url = `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(instId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OKX request failed: ${response.status}`);
  }

  const payload = await response.json();
  const row = payload?.data?.[0];
  const price = toNumber(row?.last);
  const open24h = toNumber(row?.open24h);
  const change = Number.isFinite(open24h) ? price - open24h : NaN;
  const changePct =
    Number.isFinite(open24h) && open24h !== 0 ? (change / open24h) * 100 : NaN;

  if (!Number.isFinite(price)) {
    throw new Error("Invalid OKX payload");
  }

  return {
    price,
    change,
    changePct,
    asOf: Date.now(),
    sourceTag: "OKX",
  };
}

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1m&range=1d`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`Yahoo request failed: ${response.status}`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const latestClose = closes.filter((item) => Number.isFinite(item)).at(-1);
  const price = Number.isFinite(meta?.regularMarketPrice)
    ? meta.regularMarketPrice
    : latestClose;
  const previousClose = Number.isFinite(meta?.previousClose) ? meta.previousClose : NaN;
  const change = Number.isFinite(previousClose) ? price - previousClose : NaN;
  const changePct =
    Number.isFinite(previousClose) && previousClose !== 0
      ? (change / previousClose) * 100
      : NaN;

  if (!Number.isFinite(price)) {
    throw new Error("Invalid Yahoo payload");
  }

  return {
    price,
    change,
    changePct,
    asOf: Number.isFinite(meta?.regularMarketTime)
      ? meta.regularMarketTime * 1000
      : Date.now(),
    sourceTag: "Yahoo",
  };
}

function fetchDemo(symbol) {
  const baseline = {
    btc: 68000,
    eth: 3600,
    xauusd: 2300,
    spx: 5200,
    ndx: 18500,
  };
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

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/quote") {
      return json({ error: "Not found" }, 404);
    }

    const symbol = (url.searchParams.get("symbol") || "").toLowerCase();
    if (!symbol) {
      return json({ error: "Missing symbol" }, 400);
    }

    try {
      if (symbol === "btc") return json(await fetchOkx("BTC-USDT"));
      if (symbol === "eth") return json(await fetchOkx("ETH-USDT"));
      if (symbol === "xauusd") return json(await fetchYahoo("GC=F"));
      if (symbol === "spx") return json(await fetchYahoo("^GSPC"));
      if (symbol === "ndx") return json(await fetchYahoo("^NDX"));

      return json({ error: "Unsupported symbol" }, 400);
    } catch {
      return json(fetchDemo(symbol));
    }
  },
};
