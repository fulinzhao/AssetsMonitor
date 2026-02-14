const BINANCE_BASE_URL = "https://api.binance.com/api/v3";
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const YAHOO_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const PROXY_URL = "https://api.allorigins.win/raw?url=";
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

async function fetchBinanceQuote(symbol) {
  const url = `${BINANCE_BASE_URL}/ticker/24hr?symbol=${encodeURIComponent(symbol.sourceSymbol)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Binance request failed: ${response.status}`);
  }

  const data = await response.json();
  const price = toNumber(data.lastPrice);
  const change = toNumber(data.priceChange);
  const changePct = toNumber(data.priceChangePercent);

  if (!Number.isFinite(price)) {
    throw new Error("Invalid Binance payload");
  }

  return {
    price,
    change,
    changePct,
    asOf: Date.now(),
  };
}

async function fetchYahooViaProxyQuote(symbol) {
  const rawUrl = `${YAHOO_CHART_BASE_URL}/${encodeURIComponent(
    symbol.sourceSymbol
  )}?interval=1m&range=1d`;
  const proxiedUrl = `${PROXY_URL}${encodeURIComponent(rawUrl)}`;
  const response = await fetch(proxiedUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Yahoo proxy request failed: ${response.status}`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  const indicators = result?.indicators?.quote?.[0];
  const closes = indicators?.close || [];

  const latestClose = closes.filter((item) => Number.isFinite(item)).at(-1);
  const price = Number.isFinite(meta?.regularMarketPrice)
    ? meta.regularMarketPrice
    : latestClose;
  const previousClose = Number.isFinite(meta?.previousClose)
    ? meta.previousClose
    : NaN;
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
  };
}

async function fetchCoinGeckoQuote(coinId) {
  const url = `${COINGECKO_BASE_URL}/simple/price?ids=${encodeURIComponent(
    coinId
  )}&vs_currencies=usd&include_24hr_change=true`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status}`);
  }

  const data = await response.json();
  const row = data?.[coinId];
  const price = toNumber(row?.usd);
  const changePct = toNumber(row?.usd_24h_change);
  const previousPrice =
    Number.isFinite(price) && Number.isFinite(changePct)
      ? price / (1 + changePct / 100)
      : NaN;
  const change =
    Number.isFinite(previousPrice) && Number.isFinite(price) ? price - previousPrice : NaN;

  if (!Number.isFinite(price)) {
    throw new Error("Invalid CoinGecko payload");
  }

  return {
    price,
    change,
    changePct,
    asOf: Date.now(),
  };
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
  let quote;
  let sourceTag = symbol.sourceTag;
  let demoSource = Boolean(symbol.demoSource);

  try {
    if (symbol.sourceType === "binance") {
      try {
        quote = await fetchBinanceQuote(symbol);
      } catch (error) {
        if (!symbol.fallbackCoinId) {
          throw error;
        }

        quote = await fetchCoinGeckoQuote(symbol.fallbackCoinId);
        sourceTag = "CoinGecko";
        demoSource = true;
      }
    } else if (symbol.sourceType === "yahoo_proxy") {
      quote = await fetchYahooViaProxyQuote(symbol);
    } else {
      throw new Error(`Unsupported sourceType: ${symbol.sourceType}`);
    }
  } catch {
    quote = fetchDemoQuote(symbol);
    sourceTag = "DemoFeed";
    demoSource = true;
  }

  return {
    ...quote,
    sourceTag,
    demoSource,
  };
}
