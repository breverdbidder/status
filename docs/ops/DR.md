# Disaster recovery runbook

Status: **PROPOSAL** for Ariel (BUG-035, scorecard REL-04 "Backups and DR with restore drill", acceptance item 2 "DR doc").
Inventory read 2026-10-09 with read-only catalog queries. Claim tags: [DATA] query result, [INFERRED] reasoning or vendor docs
not yet proven here, [ARIEL INPUT] only Ariel can supply it. Secrets appear only as environment-variable names.

## 1. What has to come back

| Asset | Size / count [DATA] | Source of truth | How it comes back |
|---|---|---|---|
| Postgres (production project) | 74 GB, 41 schemas, 1,091 applied migrations, 90 active pg_cron jobs | Supabase backups / PITR | Supabase restore (§4) |
| Largest tables | `fl_parcels_stage` 15 GB, `zw_parcels` 13 GB, `fl_parcels` 12 GB, `fl_parcel_assessments` 6.9 GB, `sunbiz_entities` 4.4 GB | Public-record imports | Restore, or re-import later; never block the money path on them |
| Customer and money tables | small | Supabase backups; Stripe for billing | Restore first (§5 order), then reconcile with Stripe |
| Storage | 27 buckets (14 public), 6,694 objects, 7.4 GB | Supabase Storage | **Not in database backups** [INFERRED from Supabase docs]: no copy exists today |
| Vault | 72 secrets | Supabase Vault (encrypted with the project's key) | Same-project restore keeps them; a restore into another project needs every secret re-created from its owner [INFERRED, prove in the drill] |
| Extensions | btree_gin, btree_gist, citext, http, pg_cron, pg_graphql, pg_net, pg_stat_statements, pg_trgm, pgcrypto, pgsodium, plpgsql, postgis, supabase_vault, uuid-ossp, vector | Supabase | Enabled before data restore into a new project |
| Edge functions | `cli-anything-biddeed/supabase/functions` | GitHub | Redeploy from the repo |
| Worker and web app | `cli-anything-biddeed`, `biddeed-web` | GitHub + Cloudflare | `wrangler rollback` / Cloudflare rollback for a bad deploy; redeploy for project loss |
| App secrets | names in each repo's `.env.example` and `wrangler.toml` | Cloudflare secrets, GitHub Actions secrets | Re-set by Ariel (`wrangler secret put`); agents never handle values |
| Billing | Stripe | Stripe | Re-send webhook events from Stripe after restore; reconcile subscriptions |
| DNS | Cloudflare | Cloudflare | Unchanged for a same-project restore; an export kept by Ariel [ARIEL INPUT] |

## 2. Targets (proposal)

| | Target | Needs |
|---|---|---|
| RPO (data loss) | 15 minutes | Point-in-time recovery on the Supabase plan [ARIEL INPUT]; without it, RPO is the daily backup age (up to 24 h) |
| RTO (web + data API + checkout back) | 4 hours | A drill that proves it (§6); the 74 GB restore time is unknown until measured |
| RTO (all reference data back) | 24 hours | Reference tables may come back after the money path |

## 3. Backups today

- Supabase plan, PITR on/off, backup retention: **unknown to agents** [ARIEL INPUT] (scorecard item A-08).
- Storage objects: no backup known. Proposal: a nightly copy of the private buckets to Cloudflare R2 (existing vendor; Ariel approves the bucket and its cost).
- Code, migrations and workflows: GitHub (every product repo).
- Status history: this repo.

## 4. Restore procedures

Always restore into a **branch or scratch project first**, verify (§5), and only then decide what touches production.

**A. Bad migration or deleted data (project still up).**
1. Stop writers that would make it worse: pause the relevant pg_cron jobs and GitHub Actions schedules (list them in the incident).
2. With PITR: restore a copy to a point before the change, then copy the affected tables back with `pg_dump --table` / `psql`, inside a transaction.
3. Without PITR: the same from the latest daily backup; accept and record the data loss window.
4. Fix forward with a new migration through a PR (never edit applied migrations).

**B. Project lost or unusable.**
1. Create the restore target from the latest backup (or a PITR point) through Supabase's restore flow.
2. Enable the extensions in §1 if the target is a new project, then restore.
3. Re-create the vault secrets (names from the vault inventory, values from their owners) and the app secrets; rotate any that may have leaked.
4. Redeploy the edge functions; point the Worker, biddeed-web and the MCP server at the restored project by updating `SUPABASE_URL` and the key variables (values set by Ariel).
5. Re-enable pg_cron jobs in priority order; leave heavy imports for last.
6. Have Stripe re-send events since the backup point; reconcile (§5).

**C. Bad Worker or web deploy.** `npx wrangler rollback` (Worker) or the Cloudflare dashboard rollback (web); then revert the PR.

## 5. Restore order and smoke tests

Order: customers and entitlements → subscriptions, purchases and Stripe event tables → reports and report jobs → leads and consent →
alerts and watches → auctions → reference data (parcels, zoning, entities).

Smoke tests (record pass/fail and the time of each):
1. `/health/deep?component=db|stripe|report_queue|mcp|worker` all return 200 (status PR #14 monitors).
2. Sign-in, the auctions list, one report page and a test-mode checkout on staging.
3. Row counts of the money tables match the pre-incident snapshot taken during the incident.
4. Every subscription active in Stripe is active in the database, and the reverse.
5. `pg_postmaster_start_time()` and the restart watcher behave normally for one hour (RCA in status#17).

## 6. Restore drill (quarterly)

Run on a scratch or branch project, never production. Log each drill in `docs/ops/DR-DRILLS.md`:

```
### <date> drill: <scenario A/B/C>
Backup point used:             <timestamp>          Data loss window (RPO): <minutes>
Started / restored / verified: <UTC times>          Time to restore (RTO):  <minutes>
Smoke tests 1-5:               <pass/fail each>
Vault and secrets re-created:  <yes/no, gaps>
Storage objects:               <restored from / missing>
Problems and follow-ups:       <issue links>
Run by:                        <name>
```

## 7. Known gaps

- Storage objects (7.4 GB) have no backup.
- PITR status is unknown, so RPO may be 24 h today.
- Restore time for 74 GB is unmeasured; the reference tables dominate it.
- Vault behaviour on a cross-project restore is unproven.
- The 2026-09 restart storm (status#17) shows platform-side faults happen; this runbook does not depend on its cause.
