export const ROTATE_INTERVAL_MS = 10_000;

/**
 * 资产列表
 *
 * 所有行情数据统一通过 Cloudflare Worker 代理获取（/quote?symbol=<id>）。
 * Worker 根据 id 路由到不同的上游数据源：
 *   - OKX          加密货币（BTC、ETH）
 *   - Yahoo Finance 传统金融资产（XAU/USD、SPX、NDX）
 *
 * 当上游请求失败时，Worker 自动降级返回 DemoFeed 模拟数据。
 *
 * source        — 上游数据源名称（仅做文档标注，不参与运行逻辑）
 * upstream      — 上游 API 使用的交易对 / ticker 标识符
 */
export const SYMBOLS = [
  {
    id: "btc",
    label: "BTC",
    pair: "USD",
    name: "Bitcoin",
    source: "OKX",
    upstream: "BTC-USDT",
  },
  {
    id: "eth",
    label: "ETH",
    pair: "USD",
    name: "Ethereum",
    source: "OKX",
    upstream: "ETH-USDT",
  },
  {
    id: "xauusd",
    label: "XAU",
    pair: "USD",
    name: "London Gold",
    source: "Yahoo Finance",
    upstream: "GC=F",
  },
  {
    id: "spx",
    label: "SPX",
    pair: "USD",
    name: "S&P 500",
    source: "Yahoo Finance",
    upstream: "^GSPC",
  },
  {
    id: "ndx",
    label: "NDX",
    pair: "USD",
    name: "NASDAQ 100",
    source: "Yahoo Finance",
    upstream: "^NDX",
  },
];
