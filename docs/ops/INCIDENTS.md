# Incident log

Customer-facing outages recorded by this repo's Upptime monitors, newest first. Times are UTC, taken from the opening and closing
of the Upptime issue. "Cause" is blank until a postmortem is written: nothing below is guessed. Internal and security incidents are
tracked privately, not here.

| # | Started (UTC) | Resolved (UTC) | Duration | Surface | Upptime issue | Cause | Postmortem |
|---|---|---|---|---|---|---|---|
| 3 | 2026-09-08 03:11 | 2026-09-08 10:04 | 6 h 53 min | Auctions data API | [#12](https://github.com/breverdbidder/status/issues/12) | not recorded | due |
| 2 | 2026-09-07 07:07 | 2026-09-07 07:32 | 25 min | Auctions data API | [#10](https://github.com/breverdbidder/status/issues/10) | not recorded | due |
| 1 | 2026-09-06 13:56 | 2026-09-06 14:19 | 23 min | Brevard county page | [#4](https://github.com/breverdbidder/status/issues/4) | not recorded | due |

Fact Finder (a WinnerData service on the same monitor) was down at the same times as incidents 2 and 3 (issues #9 and #11).
This suggests a shared dependency; that is an inference, not a finding.

## Rule (proposal)

Any incident longer than 15 minutes gets a postmortem within 5 business days, filed below with this template.

## Postmortem template

```
### <date> <surface>: <one-line summary>
Impact: who was affected, for how long (from Upptime)
Timeline (UTC): detected, acknowledged, mitigated, resolved
Root cause: what failed and why (evidence links)
What went well / what didn't
Actions: owner, due date, tracking issue
```
