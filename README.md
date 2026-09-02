# Pitch Angle Finder

A small, working app that takes a plain-English description of a company or product and
returns 2-3 realistic PR pitch angles, each with a concrete explanation of why a journalist
would plausibly cover it.

This was built as an independent demo project to explore the "match a story to a newsworthy
angle" problem space in PR/media tech. **It is not affiliated with, built for, or a copy of
any specific company's product** — it's my own small implementation of a similar idea, built
to show real, working use of an LLM API, a Python backend, and a TypeScript frontend.

**Live app:** https://pitch-angle-finder.vercel.app
**API:** https://pitch-angle-finder-api.onrender.com (free tier — first request after a period
of idling can take 30-60s while it wakes up)

## What it does

1. You type a description of a company or product into a text box.
2. The backend sends that description to a large model on Groq (`openai/gpt-oss-120b`) with a prompt that
   evaluates it against five concrete newsworthiness factors (timeliness, human interest,
   data/surprise factor, industry relevance, and conflict/tension).
3. The model returns 2-3 distinct pitch angles, each with a working headline, the angle
   itself, why it would work, which of the five factors it leans on, and what kind of
   reporter/outlet it would realistically go to.
4. The frontend renders them as cards.

Nothing here is templated or hardcoded — every result comes from a live call to Groq.

## Real stack (exactly what's used, nothing else)

- **LLM**: [Groq API](https://groq.com/), model `openai/gpt-oss-120b`, called directly via
  the official `groq` Python SDK. No other model provider is used anywhere in this project.
  (Originally built against `llama-3.3-70b-versatile`; Groq deprecated that model on
  2026-08-16, so this switched to their current large general-purpose model. The model is
  configurable via the `GROQ_MODEL` env var if Groq rotates models again -- see
  [console.groq.com/docs/deprecations](https://console.groq.com/docs/deprecations).)
- **Backend**: Python 3 + [FastAPI](https://fastapi.tiangolo.com/), one real endpoint
  (`POST /api/pitch-angles`) plus health/root endpoints. Deployed on **Render** (free tier).
- **Frontend**: [Next.js](https://nextjs.org/) (App Router) + TypeScript, a single page with a
  form and a results view. Deployed on **Vercel** (free tier).
- Styling is Tailwind CSS. No database, no auth, no other services — this is intentionally
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
3. It'll prompt for `GROQ_API_KEY` (marked as a secret, not committed) — paste your own key.
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

## Known limitations

- No streaming — the UI waits for the full Groq response before showing anything.
- No persistence — nothing is saved between requests, there's no history or database.
- No auth or rate limiting, since this is a small demo, not a production product.
- Render's free tier cold-starts, as noted above.
- The model can occasionally produce angles that lean on the same newsworthy hook twice
  despite being told not to; the prompt asks for distinct angles but there's no hard
  programmatic dedup on hook type.
