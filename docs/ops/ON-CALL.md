# On-call route and alert rules

**Status: PROPOSAL** for Ariel (BUG-036, checkpoint REL-05 in breverdbidder/biddeed-monetization-engine). Ariel is the only
on-call person. Every alert below reaches Ariel with no new vendor; the faster push channels need one secret each, which Ariel adds.

## Alert rules

| Rule | Fires when | Where it is defined | Channel |
|---|---|---|---|
| Public surface down | Upptime check fails (web, county page, data API, MCP) | `.upptimerc.yml` | Upptime opens an issue in this repo |
| Stripe webhook stale | No processed event within 7 days ([ARIEL INPUT] in SLO.md) | `/health/deep?component=stripe` monitor (status PR #14, Worker BUG-033) | Upptime issue |
| Report generation stale or failing | No delivered report within 7 days, or a recent failed row | `/health/deep?component=report_queue` monitor (same PRs) | Upptime issue |
| County feed stale | An expected feed's last success is older than 48 h | `auction-scraper-playwright` `feed_freshness.yml` (BUG-047) | `freshness-alert` issue in that repo, plus a failed run |
| Data API error burst (**gap**) | Share of HTTP 5xx on the data API above a threshold in a 15-minute window ([ARIEL INPUT]) | Not defined yet. Upptime checks one URL every 15 minutes and missed the 2026-10-08 burst (1,012 errors, BUG-071, [INCIDENTS.md](INCIDENTS.md)). Options: a scheduled job reading the API gateway logs (needs a read-only logs credential Ariel creates), or an error counter in the Worker | Issue in this repo |

Spec 09 BUG-036 gives "> 24 h without a report success" as its example. With today's sales volume a 24 h rule would alert every day,
so these rules use the 7-day FIN-04 threshold until Ariel sets the value in [SLO.md](SLO.md).

## Route

1. **GitHub notifications (works today).** An issue opened by Upptime or by the freshness workflow notifies the repo owner by
   email and in the GitHub mobile app. Ariel watches `breverdbidder/status` and `breverdbidder/auction-scraper-playwright` with
   "All activity", or at least "Issues".
2. **Push (optional, one step for Ariel).** Upptime already passes every `NOTIFICATION_*` secret to its workflows
   (`.github/workflows/uptime.yml`, `SECRETS_CONTEXT`). To get Telegram messages, add the repo secrets `NOTIFICATION_TELEGRAM=true`,
   `NOTIFICATION_TELEGRAM_BOT_KEY` and `NOTIFICATION_TELEGRAM_CHAT_ID`. To get email instead, add the `NOTIFICATION_EMAIL_*` secrets.
   No code change is needed. Agents never handle these values.
3. **Acknowledge** by commenting on the issue. **Resolve** when the check passes again (Upptime and the freshness workflow close
   their issues automatically). **Postmortem** per [INCIDENTS.md](INCIDENTS.md) for anything over 15 minutes.

## Escalation

There is no second person yet. If Ariel is unreachable for 24 h during an outage that affects payments, the Pioneer offer and paid
promotions are paused (proposal, [ARIEL INPUT]).
