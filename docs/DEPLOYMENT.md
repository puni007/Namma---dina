# Production Deployment Guide

Namma Dina is configured for production deployment across:
- **Frontend / PWA:** [Vercel](https://vercel.com)
- **API Server:** [Render](https://render.com) (Infrastructure-as-Code via `render.yaml`)
- **Database:** [Neon PostgreSQL](https://console.neon.tech/app/projects/winter-dream-77402694/) (Project: `winter-dream-77402694` in AWS Singapore)
- **Domain Structure:** Same-site custom domain (e.g. `app.yourdomain.com` and `api.yourdomain.com`)

---

## 1. Render Backend Deployment (1-Click Blueprint)

The repository includes a ready-to-use [`render.yaml`](../render.yaml) blueprint configured for Node in the Singapore region (`singapore`) to achieve single-digit millisecond latency with Neon.

### Option A: Using the Render Blueprint (Recommended)
1. In your [Render Dashboard](https://dashboard.render.com), click **New +** > **Blueprint**.
2. Select your `Namma Dina` Git repository.
3. Render automatically reads `render.yaml` and configures:
   - **Service:** `namma-dina-api` (Web Service, Node runtime, Singapore region)
   - **Build Command:** `npm install && npm run build -w server`
   - **Start Command:** `npm run start -w server`
   - **Health Check Path:** `/api/health`
   - **Automated Secrets:** `JWT_SECRET` and `SESSION_SECRET` are generated automatically.
4. Fill in the prompted environment variables:
   - `DATABASE_URL`: Your Neon connection string (from `.env` or Neon Console)
   - `DATABASE_URL_UNPOOLED`: Your Neon direct connection string
   - `CLIENT_ORIGIN`: Your frontend URL (e.g. `https://namma-dina.vercel.app` or `https://app.yourdomain.com`)
5. Click **Apply**. Render will build and deploy your API.

### Option B: Manual Web Service Setup
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your repository and configure:
   - **Root Directory:** `.`
   - **Build Command:** `npm install && npm run build -w server`
   - **Start Command:** `npm run start -w server`
   - **Health Check Path:** `/api/health`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: (Neon pooled connection string)
   - `DATABASE_URL_UNPOOLED`: (Neon direct connection string)
   - `CLIENT_ORIGIN`: `https://app.yourdomain.com`
   - `JWT_SECRET`: Generate via `node scripts/generate-secrets.mjs`
   - `SESSION_SECRET`: Generate via `node scripts/generate-secrets.mjs`

---

## 2. Vercel Frontend Deployment

The frontend includes [`client/vercel.json`](../client/vercel.json) and [`vercel.json`](../vercel.json) configured for Vite with SPA routing rewrites, PWA service worker cache invalidation, and immutable static asset caching.

### Deploying to Vercel:
1. In your [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** > **Project**.
2. Import your Git repository.
3. If setting Root Directory to `client`:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. If leaving Root Directory as `.`:
   - Vercel automatically uses root `vercel.json` (`npm run build -w client` -> `client/dist`).
5. Add Environment Variable:
   - `VITE_API_BASE_URL`: The URL of your deployed Render backend (e.g. `https://namma-dina-api.onrender.com/api` or `https://api.yourdomain.com/api`).
6. Click **Deploy**.

---

## 3. Custom Domain Configuration (Same-Site)

For optimal cookie security and performance, point both front-end and back-end to subdomains of the same domain:

| Domain | DNS Record Type | Target / Value | Purpose |
| :--- | :---: | :--- | :--- |
| `app.yourdomain.com` | `CNAME` | `cname.vercel-dns.com` | React Web / PWA Client |
| `api.yourdomain.com` | `CNAME` | `your-service.onrender.com` | Express Backend API |

Once configured:
- Update `CLIENT_ORIGIN` in Render to `https://app.yourdomain.com`.
- Update `VITE_API_BASE_URL` in Vercel to `https://api.yourdomain.com/api`.
