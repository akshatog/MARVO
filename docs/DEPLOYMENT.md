# Render backend and Vercel frontend

The frontend is a static Vite build on Vercel. The FastAPI backend runs as one Docker web service on Render. Browsers call the Render API directly, including streaming chat and voice uploads. Vercel does not proxy API requests or run Python functions.

Use a Render workspace with free instance hours remaining, or a paid compute plan. A new service in the exhausted workspace shares the same exhausted allowance.

## 1. Deploy the backend to Render

Push the deployment changes to the GitHub branch you intend to deploy. In the intended Render account/workspace, create a **new Web Service** from that repository and branch:

| Setting | Value |
| --- | --- |
| Runtime / Language | Docker |
| Root Directory | `backend` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Compute plan | Free, or the paid plan you choose |
| Health Check Path | `/api/health` |

The Dockerfile starts one Uvicorn worker and uses Render's `PORT`. One worker matches the existing in-memory voyage/session store and background scheduler.

Alternatively, create a **new Blueprint**, select the deployment branch, and set its Blueprint Path to `render.backend.yaml`. Do not select the original `render.yaml`, which builds the combined frontend/backend image.

Set these Render environment variables:

| Variable | Starting value |
| --- | --- |
| `MARVO_DATA_MODE` | `DEMO` |
| `MARVO_USE_LLM` | `0` for template explanations; `1` with provider keys for LLM features |
| `MARVO_MOSDAC_ENABLED` | `0` unless authenticated satellite access is configured |
| `MARVO_CORS_ORIGINS` | Your exact Vercel production origin, e.g. `https://your-project.vercel.app` |

If the frontend has not been created yet, use the intended frontend origin temporarily, then replace it with the actual Vercel production URL in step 3. This does not prevent Render health checks or direct API requests.

Copy the backend URL shown by Render; do not assume it matches the service name. Confirm that `https://YOUR-RENDER-HOST/api/health` returns JSON with `status: ok`, and `/docs` opens the API reference.

The backend image only copies `requirements.txt`, `app/`, and `config/`. Local `.env` files, virtual environments, frontend assets, and tests are excluded.

## 2. Deploy the frontend to Vercel

Import the same GitHub repository into Vercel using the intended account/team and deployment branch.

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`frontend/vercel.json` supplies the build settings, SPA fallback, and cache headers for the entry document and service worker.

Set these frontend environment variables before building:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://YOUR-RENDER-HOST/api` **including `/api`** |
| `VITE_MAPBOX_TOKEN` | Your Mapbox **public** token (`pk...`) |

Apply these variables to Production and any Preview environments you intend to test. They are embedded in the browser bundle at build time; changes require a new Vercel deployment. Mapbox token URL restrictions must allow the actual Vercel origin.

Do not put Groq, Cerebras, Gemini, Sarvam, or MOSDAC credentials in Vercel `VITE_` variables. Those credentials belong only in Render's backend environment.

## 3. Connect the two deployments

Copy the stable Vercel **production** origin and set `MARVO_CORS_ORIGINS` on Render to that value. It must contain only scheme and hostname: no `/api`, path, or query. Multiple origins are comma-separated, e.g. a production URL and a custom domain. Add exact Preview origins individually if needed; do not allow every `*.vercel.app` deployment.

Save and let Render redeploy. Ensure `VITE_API_BASE_URL` on Vercel contains the actual Render URL and `/api`, then redeploy Vercel if that value changed.

## 4. Verify the public deployment

1. Open the Vercel production URL in a fresh browser session. Confirm the landing page, map tiles, and mobile view load.
2. In browser developer tools, confirm `/api/health` and other API requests go to the Render hostname and return JSON with no CORS errors.
3. Ask a question and confirm chat streams a response. Check the forecast and map layers.
4. Switch DEMO to LIVE and back, confirming the health endpoint reports the selected mode. The toggle changes the shared backend mode for all visitors; Render restarts restore `MARVO_DATA_MODE`. Public LIVE sources may work without keys; authenticated providers require their respective credentials.
5. If voice is configured, verify a recording upload and spoken response. Browser speech fallbacks depend on browser support.
6. Reload the page and open a deep link such as `/?tab=ask`. Confirm the UI and API still load.

## Free plan behavior

- Render grants 750 free instance hours per workspace per calendar month, shared across free web services. Keep unused services suspended. A single continuously running service fits within that allowance; bandwidth and other limits still apply.
- The existing scheduler self-pings Render every 10 minutes, which is intended to keep the API active and consumes running hours. This split deployment does not change that behavior or add an external uptime monitor.
- Vercel serves the frontend separately, so Render suspension does not prevent the static UI from loading. API features still depend on Render being available. A sleeping backend can take time to wake, and a suspended backend requires its Render usage issue to be resolved.
- Render's filesystem and the existing in-memory voyage/session state are ephemeral. Restarting or redeploying can reset them.
- Starting in DEMO does not disable all scheduled provider requests. For a blank-key demonstration, leave provider credentials unset; do not treat `MARVO_USE_LLM=0` as a switch for every provider call.

## Existing combined deployment and local development

Leave `VITE_API_BASE_URL` blank to retain the original `/api` behavior. Vite's local proxy and the combined root Dockerfile continue to work. The original `render.yaml` is unchanged. Backend CORS defaults allow `http://localhost:5173` and `http://127.0.0.1:5173`; requests from the same origin as the backend do not require CORS.

References: [Render Docker deployment](https://render.com/docs/docker), [Render free limits](https://render.com/docs/free), [Render Blueprint configuration](https://render.com/docs/blueprint-spec), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
