# Cloudflare Worker Quote Proxy

This worker provides a unified quote API for the frontend dashboard:

- `GET /quote?symbol=btc`
- `GET /quote?symbol=eth`
- `GET /quote?symbol=xauusd`
- `GET /quote?symbol=spx`
- `GET /quote?symbol=ndx`

## Deploy

1. Install dependencies:

```bash
npm install
```

2. Login Cloudflare:

```bash
npx wrangler login
```

3. Deploy:

```bash
npm run deploy
```

4. Copy the Worker URL (example: `https://assets-monitor-worker.<subdomain>.workers.dev`)

5. In frontend project root, create `.env`:

```bash
VITE_QUOTE_PROXY_BASE_URL=https://assets-monitor-worker.<subdomain>.workers.dev
```

6. Rebuild and push frontend:

```bash
npm run build
git add .
git commit -m "Use Cloudflare Worker quote proxy"
git push
```
