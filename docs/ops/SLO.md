# BidDeed.AI service level objectives

**Status: PROPOSAL.** The targets below take effect when Ariel approves them (BUG-038, checkpoint REL-02 in
breverdbidder/biddeed-monetization-engine). Measured values come from this repo's Upptime data (`history/summary.json`,
checks every 15 minutes since 2026-09-05) and are the only numbers here that describe the past.

## Surfaces, measurements and proposed targets

| Surface | How it is measured | Measured since 2026-09-05 (Upptime) | Proposed SLO [ARIEL INPUT] |
|---|---|---|---|
| Web app (`biddeed.ai/api/health`) | Upptime, 200 + body `ok` | uptime 100.00%, avg response 946 ms | 99.5% monthly availability; avg response < 1,500 ms |
| Public county page (`/county/brevard`) | Upptime, 200 | uptime 99.95%, avg response 763 ms | 99.5% monthly availability |
| Auctions data API (`auctions_summary_ssot` RPC) | Upptime, 200 | uptime 99.09%, avg response 217 ms | 99.5% monthly availability |
| MCP server (`mcp.biddeed.ai`) | Upptime, OAuth resource 200 and `/api/mcp` 401 | uptime 100.00%, avg response 982 ms | 99.5% monthly availability |
| Stripe webhook | `biddeed.ai/status` and `/health/deep?component=stripe` (BUG-033) | not yet measured | a processed event within 7 days (FIN-04) |
| Report generation | `/status` and `/health/deep?component=report_queue` | not yet measured | a delivered report within 7 days (FIN-04) |
| County auction feeds | `auction-scraper-playwright` freshness check (BUG-047) | 75 of 75 expected feeds fresh on 2026-10-09 | every expected feed refreshed within 48 h |

Why these proposals: each availability target sits below what the surface has already delivered, so meeting it needs no new
work, and it still gives an error budget (99.5% is about 3 h 39 min of downtime in a 30-day month). Upptime records average
response time, not percentiles, so the latency target is an average until a p95 source exists.

## Error budget policy (proposal)

- A surface that uses more than its monthly budget gets no new feature work until the cause is fixed and written up in
  [INCIDENTS.md](INCIDENTS.md).
- The money-path and feed objectives are freshness rules: a breach opens an alert (the Upptime issue for the component or
  the `freshness-alert` issue) the same day.

## Monthly report

On the first business day of each month, copy each surface's monthly uptime and response time from `history/summary.json`
into a dated row below, and list the month's incidents.

| Month | Web | County page | Data API | MCP | Incidents |
|---|---|---|---|---|---|
| 2026-10 | (first report due 2026-11-02) | | | | |
