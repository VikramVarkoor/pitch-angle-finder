# Pitch Angle Finder

A small, working app that takes a plain-English description of a company or product and
returns 2-3 realistic PR pitch angles, each with a concrete explanation of why a journalist
would plausibly cover it.

This was built as an independent demo project to explore the "match a story to a newsworthy
angle" problem space in PR/media tech. **It is not affiliated with, built for, or a copy of
any specific company's product** - it's my own small implementation of a similar idea, built
to show real, working use of an LLM API, a Python backend, and a TypeScript frontend.

**Live app (Vercel):** https://pitch-angle-finder.vercel.app
**API (Render):** https://pitch-angle-finder-api.onrender.com (free tier - first request after a
period of idling can take 30-60s while it wakes up)

**Live app (Azure):** https://pafweb27309.z1.web.core.windows.net
**API (Azure):** https://pitch-angle-finder-api-vv2.azurewebsites.net

The Render/Vercel deployment above is the original and stays untouched. The Azure deployment
is a second, independent, fully-working copy of the same app, built specifically to get real
hands-on Azure experience (App Service + Blob Storage static hosting), documented in detail in
the "Azure deployment" section below.

## What it does

1. You type a description of a company or product into a text box.
2. The backend sends that description to a large model on Groq (`openai/gpt-oss-120b`) with a prompt that
   evaluates it against five concrete newsworthiness factors (timeliness, human interest,
   data/surprise factor, industry relevance, and conflict/tension).
3. The model returns 2-3 distinct pitch angles, each with a working headline, the angle
   itself, why it would work, which of the five factors it leans on, and what kind of
   reporter/outlet it would realistically go to.
4. The frontend renders them as cards.

Nothing here is templated or hardcoded - every result comes from a live call to Groq.

## Real stack (exactly what's used, nothing else)

- **LLM**: [Groq API](https://groq.com/), model `openai/gpt-oss-120b`, called directly via
  the official `groq` Python SDK. No other model provider is used anywhere in this project.
  (Originally built against `llama-3.3-70b-versatile`; Groq deprecated that model on
  2026-08-16, so this switched to their current large general-purpose model. The model is
  configurable via the `GROQ_MODEL` env var if Groq rotates models again -- see
  [console.groq.com/docs/deprecations](https://console.groq.com/docs/deprecations).)
- **Backend**: Python 3 + [FastAPI](https://fastapi.tiangolo.com/), one real endpoint
  (`POST /api/pitch-angles`) plus health/root endpoints. Deployed on **Render** (free tier)
  and on **Azure App Service** (free F1 plan).
- **Frontend**: [Next.js](https://nextjs.org/) (App Router) + TypeScript, a single page with a
  form and a results view. Deployed on **Vercel** (free tier) and as a static export on
  **Azure Blob Storage static website hosting**.
- Styling is Tailwind CSS. No database, no auth, no other services - this is intentionally
  small and demo-able in a few minutes.

## How the Groq API is actually used

The backend builds a system prompt that encodes an opinionated (and genuinely thought-through)
model of what makes a PR pitch newsworthy, then asks Groq to return structured JSON. The full
prompt lives in [`backend/app/prompts.py`](backend/app/prompts.py); a sanitized excerpt:

```
You are a sharp, experienced PR strategist who has spent 15 years pitching journalists
at outlets like TechCrunch, the Wall Street Journal, Axios, and trade press. You are
known for one thing: you never pitch angles that are just thinly veiled product
announcements...

For every company or product description you are given, evaluate it against these five
newsworthiness factors before proposing anything:

1. TIMELINESS - does the angle ride a live news cycle, seasonal moment, industry event,
   or an anniversary?
2. HUMAN INTEREST - is there a founder, employee, or customer story with a real,
   relatable stake?
3. DATA & SURPRISE FACTOR - is there a genuinely counterintuitive number or claim that
   reframes something readers think they already understand?
4. INDUSTRY RELEVANCE - does this speak directly to a beat a specific kind of reporter
   actually covers?
5. CONFLICT OR TENSION - is there a genuine debate or disruption, without manufacturing
   false controversy?

Given the company/product description, propose 2 to 3 distinct, specific, realistic PR
pitch angles... [full constraints in prompts.py] ...

Respond ONLY with valid JSON matching this exact shape:
{
  "angles": [
    {
      "headline": "...",
      "angle": "...",
      "why_it_works": "...",
      "newsworthy_hook": "one of: Timeliness, Human interest, Data & surprise factor, Industry relevance, Conflict or tension",
      "target_beat": "..."
    }
  ]
}
```

The call is made with `response_format={"type": "json_object"}` so Groq returns valid JSON,
which is then parsed and validated against a Pydantic schema before being sent to the
frontend. If Groq returns something that doesn't validate, the API returns a clear 502 error
instead of silently failing or faking a result.

## Project structure

```
pitch-angle-finder/
├── render.yaml            # Render blueprint (one-click backend deploy)
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app, CORS, the /api/pitch-angles endpoint
│   │   ├── prompts.py      # System prompt + user prompt builder
│   │   └── schemas.py      # Pydantic request/response models
│   ├── test_structural.py  # Endpoint/schema tests with a mocked Groq response
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/page.tsx     # The single-page UI (form + results)
    │   ├── app/layout.tsx
    │   └── lib/             # API client + shared types
    └── .env.local.example
```

## Running it locally

**Backend**

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your own GROQ_API_KEY (free at console.groq.com/keys)
uvicorn app.main:app --reload --port 8000
```

**Frontend** (in a separate terminal)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # defaults to http://localhost:8000
npm run dev
```

Then open `http://localhost:3000`.

**Tests**

```bash
cd backend
source venv/bin/activate
pip install pytest
pytest test_structural.py -v
```

These tests mock the Groq client so they verify the API contract (validation, error
handling, response shape) without needing a real API key or making network calls.

## Deployment

**Backend → Render**

The repo includes a [`render.yaml`](render.yaml) blueprint, so the easy path is:

1. Push this repo to GitHub (already done here).
2. In Render: **New +** → **Blueprint** → select the repo. Render reads `render.yaml` and
   pre-fills the build/start commands and plan.
3. It'll prompt for `GROQ_API_KEY` (marked as a secret, not committed) - paste your own key.
4. Click **Apply**. Render gives you a URL like `https://pitch-angle-finder-api.onrender.com`.

Without the blueprint, do it manually: **New Web Service** from the repo, root directory
`backend`, build command `pip install -r requirements.txt`, start command
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and set `GROQ_API_KEY` +
`ALLOWED_ORIGINS` (your Vercel frontend URL) as environment variables.

**Frontend → Vercel**

1. In Vercel, import the same repo, set the root directory to `frontend`.
2. Add environment variable `NEXT_PUBLIC_API_URL` set to your Render backend URL from above.
3. Deploy. Vercel gives you a URL like `https://pitch-angle-finder.vercel.app`.

Note the free tiers: Render's free web services spin down after inactivity, so the first
request after a period of idling can take 30-60 seconds while it wakes back up.

## Azure deployment (App Service + Blob Storage static website)

This is a second, real deployment of the same app on Microsoft Azure, done to get genuine
hands-on experience with Azure App Service, Azure Storage, and deploying through the Azure CLI.
It runs side by side with the Render/Vercel deployment above; nothing about the original
deployment was touched.

This app has been deployed to Azure twice. The first deployment (Sep 2026) ran on a free-trial
subscription that later expired and was deleted. The current one (Nov 2026) is a rebuild on an
Azure for Students subscription, and it hit a different set of problems. Both are documented
below.

### Current deployment (Nov 2026, Azure for Students)

**What's live:**

- Backend: [pitch-angle-finder-api-vv2.azurewebsites.net](https://pitch-angle-finder-api-vv2.azurewebsites.net)
  - Azure App Service (Linux, Python 3.11, free F1 plan, `uaenorth`)
- Frontend: [pafweb27309.z1.web.core.windows.net](https://pafweb27309.z1.web.core.windows.net)
  - static export of the Next.js app, served by Azure Storage static website hosting (`uaenorth`)

**How it's deployed (all through the Azure CLI, signed in as myself, no publish profile):**

```
# Backend
az group create -n pitch-angle-finder-rg -l centralus
az appservice plan create -g pitch-angle-finder-rg -n pitch-angle-finder-plan --is-linux --sku F1 -l uaenorth
az webapp create -g pitch-angle-finder-rg -p pitch-angle-finder-plan -n pitch-angle-finder-api-vv2 --runtime "PYTHON:3.11"
az webapp config set -g pitch-angle-finder-rg -n pitch-angle-finder-api-vv2 \
  --startup-file "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
az webapp config appsettings set -g pitch-angle-finder-rg -n pitch-angle-finder-api-vv2 --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true WEBSITES_PORT=8000 GROQ_MODEL=openai/gpt-oss-120b
# GROQ_API_KEY and ALLOWED_ORIGINS are set the same way, never committed to the repo
az webapp deploy -g pitch-angle-finder-rg -n pitch-angle-finder-api-vv2 --src-path backend.zip --type zip

# Frontend (static export, API URL is inlined at build time)
az storage account create -n <name> -g pitch-angle-finder-rg -l uaenorth --sku Standard_LRS --kind StorageV2
az storage blob service-properties update --account-name <name> --static-website --index-document index.html --404-document 404.html
NEXT_PUBLIC_API_URL=https://pitch-angle-finder-api-vv2.azurewebsites.net npm run build
az storage blob upload-batch --account-name <name> -s frontend/out -d '$web' --overwrite
```

**Real issues hit on the redeploy:**

1. **Region policy.** Student subscriptions only allow certain regions. Creating the App Service
   plan in `centralus` failed with `RequestDisallowedByAzure`, even though the resource group
   itself was created fine there. Trying candidate regions in a loop found that `uaenorth` is
   allowed for an F1 plan.
2. **Static Web Apps is not available on this subscription.** It can only be created in five
   regions (`westus2`, `centralus`, `eastus2`, `westeurope`, `eastasia`), and all five were refused
   by the same region policy. I moved the frontend to Azure Storage static website hosting in
   `uaenorth`, using the same static export with no code change.
3. **CORS.** The browser blocked the first API call from the new frontend, because the backend's
   `ALLOWED_ORIGINS` did not include the storage website URL. Setting it as an App Service
   application setting and restarting the app fixed it.
4. **App name reserved.** The original app name was still unavailable after the old subscription
   was deleted, so the backend has a `-vv2` suffix.

**CI/CD:** GitHub Actions deploys both halves on push to `main`. The backend workflow runs the tests, then deploys to App Service. The frontend workflow builds the Next.js static export and uploads it to the Blob static website. Both sign in to Azure with OIDC (federated credentials), so there is no stored Azure password or secret in the repo. The identity has only two scoped roles: Website Contributor on the web app and Storage Blob Data Contributor on the storage account.

### First deployment (Sep 2026, free trial, since torn down)

That deployment ran Azure App Service (Basic B1 plan, `centralus`) plus Azure Static Web Apps
(Free tier), with two GitHub Actions workflows:

- The backend workflow zipped the `backend/` folder and pushed it to App Service via
  `azure/webapps-deploy@v3` on every push that touched `backend/**`, authenticated with a publish
  profile stored as a repo secret.
- The Static Web Apps workflow was scaffolded by `az staticwebapp create --login-with-github`,
  with `NEXT_PUBLIC_API_URL` set as a build-time env var (Next static export inlines env vars at
  build time, not runtime).
- Both were confirmed push-triggered by pushing real commits and watching both pipelines run end
  to end via `gh run watch`. The workflow files were removed from the repo after the free-trial
  subscription expired; they are still in the git history.

**Real issues hit then and how they got resolved:**

1. **F1 (free tier) quota was 0 in `eastus` on a brand-new subscription.** `az appservice plan
   create --sku F1` failed with "Operation cannot be completed without additional quota" even
   though nothing had been deployed yet. Free-tier quota is granted per region, not account-wide.
   Switching the resource group's region to `centralus` resolved it, no support ticket needed.
2. **The App Service then hit `QuotaExceeded` and stopped itself** on the F1 plan shortly after
   creation. Free-tier App Service has a daily CPU-minute cap and new/trial subscriptions can hit
   it fast. Fix: upgraded the plan from F1 to B1 (Basic), covered by the free trial credit.
3. **`azure/webapps-deploy@v3` failed with "Publish profile is invalid for app-name and
   slot-name provided"** even with a correctly formatted, freshly downloaded publish profile.
   Root cause: Azure disables **Basic Auth publishing credentials** by default on new App
   Service resources. The SCM/Kudu endpoint that `webapps-deploy` authenticates against with the
   publish profile's username/password refuses Basic Auth until it's explicitly re-enabled. Fixed with:
   ```
   az resource update --resource-group pitch-angle-finder-rg --name scm \
     --namespace Microsoft.Web --resource-type basicPublishingCredentialsPolicies \
     --parent sites/pitch-angle-finder-api-vv --set properties.allow=true
   ```
   (and the same for `ftp`), then re-pulling a fresh publish profile, since the one generated
   while Basic Auth was off carried non-functional credentials.
4. **GitHub blocked the first push that added a workflow file** with "refusing to allow an OAuth
   App to create or update workflow `.github/workflows/azure-backend.yml` without `workflow`
   scope." The initial GitHub device-flow authorization was requested with only the `repo`
   scope; re-authorizing with `repo workflow` scope fixed it.

Each of these was a real failure with a real error message, reproduced and fixed against live
Azure resources.

## Known limitations

- No streaming - the UI waits for the full Groq response before showing anything.
- No persistence - nothing is saved between requests, there's no history or database.
- No auth or rate limiting, since this is a small demo, not a production product.
- Render's free tier cold-starts, as noted above. The Azure copy runs on the free F1 plan, which
  also cold-starts and has a daily CPU-minute cap.
- The model can occasionally produce angles that lean on the same newsworthy hook twice
  despite being told not to; the prompt asks for distinct angles but there's no hard
  programmatic dedup on hook type.
- The model sometimes invents specifics for the "human interest" angle (a founder backstory,
  a customer name) that weren't in the input, despite the prompt explicitly telling it not to
  fabricate facts. This is a real, observed failure mode, not a hypothetical one -- worth
  rereading the output before treating any angle as usable, and worth mentioning honestly
  rather than presenting the tool as fully reliable.
- Groq's JSON mode itself isn't perfectly reliable: on live testing it occasionally (a) returns
  only 1 angle despite the prompt asking for 2-3, or (b) fails outright to produce valid JSON
  for a given call. The backend now retries the Groq call up to 3 times when either of those
  happens before giving up and returning a 502 -- this is a real retry over the real API, not a
  cosmetic fix, and it's covered by a test (`test_pitch_angles_retries_when_too_few_angles`).
  It's still possible, if unlikely, to see a "something went wrong" error if all 3 attempts fail.
- Tests mock the Groq client, so they check the API contract, not the model's output quality.
