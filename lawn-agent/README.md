# Lawn Agent

AI agent that scans satellite imagery for dead, brown front lawns across **Brisbane & Gold Coast, QLD**, renders a photoreal "lush and green" restoration, and automates a postcard mail campaign — a lead-gen system for lawn care and landscaping companies.

> Every step from satellite to mailbox is automated: address sourcing → satellite pull → AI lawn detection → ranking → photoreal render → owner lookup → postcard generation → mail dispatch → log.

## Pipeline

```
Schedule Trigger
      │
      ▼
1. Fetch Address List       (CSV / Apify property scrape, QLD only)
      │
      ▼
2. In-Zone Gate             (Brisbane + Gold Coast postcode filter — data/qld-zones.json)
      │
      ▼
3. Fetch Satellite Image    (Mapbox Static Images API — satellite layer)
      │
      ▼
4. AI Lawn Classifier       (vision model scores: lawn condition, house quality)
      │
      ▼
5. Rank & Select            (owner-occupied + nicer home + dead lawn = top priority)
      │
      ▼
6. AI Lawn Render           (image edit model: dead lawn → lush green, same house)
      │
      ▼
7. Owner Lookup             (NSW free title search where applicable / fallback sources)
      │
      ▼
8. Postcard Generator       (before/after + QR code template)
      │
      ▼
9. Mail Dispatch            (PostGrid AU postcard API)
      │
      ▼
10. Log to Sheet
```

A ready-to-import n8n workflow is in [`workflows/lawn-agent.n8n.json`](./workflows/lawn-agent.n8n.json). Standalone Node.js scripts for each pipeline stage are in [`scripts/`](./scripts) if you'd rather run it outside n8n or test stages individually.

## Why Brisbane + Gold Coast first

These two QLD regions give the best cost/coverage tradeoff to start:

- Dense, high-value suburban housing stock with visible front lawns (unlike inner-city apartments)
- Good Mapbox/satellite resolution coverage in metro areas
- Defined, mailable postcode ranges (see `data/qld-zones.json`) to keep the campaign tightly geo-targeted instead of scanning all of QLD

## API stack & costs

| Stage | API | Free tier / cost |
|---|---|---|
| Satellite imagery | [Mapbox Static Images API](https://docs.mapbox.com/api/maps/static-images/) (satellite style) | **50,000 images/month free** — this is the entire reason the MVP is viable at $0 |
| Lawn condition vision scoring | OpenRouter (Gemini 2.5 Flash or GPT-4o vision) | ~$0.001–0.005 per image |
| Photoreal lawn render | OpenAI `gpt-image-1` (or equivalent inpainting model) | ~$0.02–0.07 per render — **only run this on the top-ranked address**, not every scan |
| Owner name | NSW Registrar General free title search (NSW only) / Domain or realestate.com.au listing data fallback (QLD has no free equivalent — flagged below) | Free (NSW) / scrape (QLD) |
| Postcard print + mail | [PostGrid](https://www.postgrid.com/) (confirmed AU postcard support) | ~$1–2 AUD per postcard, varies by volume |

**Honest cost note:** imagery, AI scoring, and rendering can run near-$0 thanks to Mapbox's free tier. The real per-lead cost is the **postcard print + postage** (~$1–2/card) and, for QLD specifically, **owner-name sourcing** — Queensland has no free public title-owner lookup like NSW's. Budget for either a paid title search (~$15–20/property via Landgate-equivalent QLD services) on your top 5–10 ranked leads only, or build the owner field from real estate listing data instead.

## Legal note

This pipeline combines public satellite imagery with property ownership records to send unsolicited mail. That's legal in principle in Australia (public imagery + public title records), but be deliberate about how you frame it for landscaping clients — it touches the Privacy Act and Spam Act in spirit even though postal mail (not email/SMS) is the actual channel used here, which keeps it outside most digital spam regulation. Always include an easy opt-out and never store scraped personal data longer than the campaign requires.

## Setup

```bash
npm install
cp .env.example .env   # fill in your API keys
node scripts/pipeline.js --region brisbane   # or --region gold-coast
```

See `.env.example` for required keys: `MAPBOX_TOKEN`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `POSTGRID_API_KEY`.

## Project structure

```
lawn-agent/
├── data/
│   └── qld-zones.json        # Brisbane + Gold Coast postcode ranges (In-Zone Gate)
├── lib/
│   ├── mapbox.js              # satellite image fetch
│   ├── vision.js               # AI lawn condition classifier
│   ├── imageEdit.js            # photoreal lawn render
│   └── postgrid.js             # postcard generation + mail dispatch
├── scripts/
│   ├── 01-fetch-addresses.js
│   ├── 02-fetch-satellite.js
│   ├── 03-classify-lawn.js
│   ├── 04-rank-leads.js
│   ├── 05-render-lawn.js
│   ├── 06-lookup-owner.js
│   ├── 07-generate-postcard.js
│   ├── 08-send-postcard.js
│   └── pipeline.js             # runs the full chain end-to-end
├── workflows/
│   └── lawn-agent.n8n.json     # importable n8n workflow
└── output/                     # generated renders + postcards land here
```

## Status

Built as a CodeVantage internal proof-of-concept, designed to be demoed to lawn care and landscaping clients as a done-for-you recurring lead-gen channel.
