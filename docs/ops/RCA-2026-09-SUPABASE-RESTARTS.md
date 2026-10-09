# RCA: Supabase instance restarts every ~15 minutes (2026-09-02 → 2026-09-08)

Status: **root cause UNPROVEN**; restarts **stopped** 2026-09-08 16:45 UTC and have not recurred in 30 days.
Owner: Ariel. Tracking: cli-anything-biddeed#20090 (app-side retries), cli-anything-biddeed#20039 (load cuts), scorecard REL-03.
Evidence gathered 2026-10-09 04:12–04:25 UTC with read-only queries (no writes, no settings changed). Claim tags: [DATA] query
result, [OBSERVED] seen in an issue or log, [INFERRED] reasoning from data, [ARIEL INPUT] only Ariel can supply it.

## What happened

- [DATA] The `db-restart-watch` pg_cron job (every 10 minutes) logged **537 restarts** of the database compute between 2026-09-02
  05:47 and 2026-09-08 16:45 UTC: 72, 96, 95, 96, 102, 40 and 36 per day (09-02 is a partial day; the watcher misses a restart when
  two land in one 10-minute window).
- [OBSERVED] Postgres, PgBouncer, PostgREST and GoTrue restarted in the same second each time (cli-anything-biddeed#20090).
- [DATA] The gap between restarts was **almost exactly 15 minutes**: p10 / p50 / p90 = 14.6 / 15.0 / 15.4 minutes before the
  2026-09-05 load cuts (326 gaps), 10.8 / 15.0 / 15.6 minutes after (208 gaps).
- [OBSERVED] Upptime incidents #10 (2026-09-07, 25 min) and #12 (2026-09-08, 6 h 53 min) on the auctions data API fall inside the
  restart period. Whether the restarts caused them is not established.

## What it was not (ruled out at the time, cli-anything-biddeed#20090 / #20039)

- [OBSERVED] Connection exhaustion: 18 of 160 connections in use.
- [OBSERVED] Replication-slot or WAL build-up: no slots.
- [OBSERVED] Table bloat or database growth: negligible dead tuples, size stable.
- [OBSERVED] An OOM or panic visible in Postgres's own logs: none found across several restarts.
- [DATA] Our scheduled load as the driver: the 2026-09-05 cuts (pg_cron stagger 754 → ~517 runs/hour, GitHub Actions schedules
  moved off :00/:15/:30/:45, parcel-centroid matrix 8 → 2) left the 15.0-minute median unchanged.

## When it stopped

- [DATA] Last restart: postmaster start **2026-09-08 16:45:13 UTC**. `pg_postmaster_start_time()` read the same value on
  2026-10-09 04:12 UTC, i.e. 30 days 11 hours of continuous uptime.
- [DATA] The watcher is alive: 432 of 432 runs succeeded in the 72 hours before the check, so the empty log is not a broken watcher.
- [DATA] `max_connections` is 160 now and was 160 on 2026-09-07, so the compute size did not change [INFERRED from that setting].
- [DATA] Three memory-reduction changes were applied on 2026-09-08 (migration versions at 02:55, 10:00 and 17:27 UTC). Restarts
  continued after the first two and stopped before the third, so none of them lines up with the stop.

## Root cause: hypotheses

| # | Hypothesis | For | Against |
|---|---|---|---|
| H1 | Platform-side fault on the compute host (health check or supervisor restarting the stack on a fixed cycle), fixed by Supabase | Whole stack restarts in the same second; a fixed 15.0-min period that load cuts did not move; no in-database signal; stop not aligned with any change of ours | Not confirmed by Supabase in writing |
| H2 | Memory pressure at a periodic peak of our own jobs (host OOM, invisible to Postgres logs) | Memory-reduction work on 09-08; quarter-hour alignment of most restarts after 09-05 | Period unchanged by the 09-05 load cuts; restarts continued after two memory reductions and stopped before the third |

[INFERRED] H1 is the better fit. It becomes the root cause only when Supabase support's resolution note for the ticket referenced in
cli-anything-biddeed#20090 is on file **[ARIEL INPUT]**: agents do not contact vendors.

## Current load (for the soak target)

- [DATA] API gateway requests, 24 h to 2026-10-09 04:13 UTC: 139,378 (average 97/min, peak **1,902/min** at 2026-10-08 16:16 UTC).
- [DATA] pg_cron: about 5,000 runs/day, 0 failed runs in the last 3 days.
- So the REL-03 acceptance ("1 hour at 2× peak, zero restarts") means about **3,800 requests/min** in total for an hour.

## Closing REL-03

1. **Root cause** (acceptance item 0): Ariel obtains Supabase's resolution note and records it here (replace "UNPROVEN").
2. **Fix verified under load** (acceptance item 1): Ariel approves and runs `scripts/soak/restart-soak.mjs` (read-only GETs) for
   60 minutes at a rate that brings total traffic to about 2× peak, then runs the query below and pastes both outputs here.
   The 30 days of zero restarts at real load are supporting evidence, not the acceptance test.

```sql
-- restarts during the soak window (expect 0 rows and an unchanged postmaster start time)
select observed_at, postmaster_start_time from public.db_restart_log
where observed_at between '<soak start>' and '<soak end>' + interval '10 minutes';
select pg_postmaster_start_time();
```

## Actions

| Action | Owner | Status |
|---|---|---|
| Get Supabase's written resolution for the restart ticket | Ariel | open [ARIEL INPUT] |
| Run the 1-hour soak and record the result here | Ariel (approves load on production) | open |
| Keep `db-restart-watch` running; alert on any new row (REL-05 alert rules) | engineering | proposal |
| Keep the app-side retry wrapper from #20090 | engineering | in place |
