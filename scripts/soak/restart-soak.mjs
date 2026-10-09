#!/usr/bin/env node
// REL-03 soak test: read-only GET load against public endpoints for a fixed time, with a per-minute report.
// It never writes, never authenticates and never reads secrets. Dry run unless --run is passed.
//
//   node scripts/soak/restart-soak.mjs --url https://example/api/health --url https://example/api/auctions \
//        --rps 5 --minutes 60 --run
//
// Ariel approves the target URLs and rate before any run against production (see docs/ops/RCA-2026-09-SUPABASE-RESTARTS.md).
// Output: one JSON line per minute and a summary; paste the summary and the restart query result into the RCA.

const MAX_RPS = 70 // ~2x the observed 1,902 req/min peak if run alone; anything above needs a code change on purpose

export function parseArgs(argv) {
  const o = { urls: [], rps: 1, minutes: 1, run: false, timeoutMs: 5000 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--url') o.urls.push(argv[++i])
    else if (a === '--rps') o.rps = Number(argv[++i])
    else if (a === '--minutes') o.minutes = Number(argv[++i])
    else if (a === '--timeout-ms') o.timeoutMs = Number(argv[++i])
    else if (a === '--run') o.run = true
    else throw new Error(`unknown argument ${a}`)
  }
  if (!o.urls.length) throw new Error('at least one --url is required')
  for (const u of o.urls) if (new URL(u).protocol !== 'https:') throw new Error(`https only: ${u}`)
  if (!(o.rps > 0 && o.rps <= MAX_RPS)) throw new Error(`--rps must be in (0, ${MAX_RPS}]`)
  if (!(o.minutes > 0 && o.minutes <= 120)) throw new Error('--minutes must be in (0, 120]')
  return o
}

export function summarize(samples) {
  const lat = samples.filter((s) => s.ms != null).map((s) => s.ms).sort((a, b) => a - b)
  const q = (p) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] : null)
  const by = (f) => samples.filter(f).length
  return {
    requests: samples.length,
    ok_2xx_3xx: by((s) => s.status >= 200 && s.status < 400),
    http_4xx: by((s) => s.status >= 400 && s.status < 500),
    http_5xx: by((s) => s.status >= 500),
    network_errors: by((s) => s.status === 0),
    p50_ms: q(0.5),
    p95_ms: q(0.95),
  }
}

async function hit(url, timeoutMs) {
  const t0 = performance.now()
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'biddeed-rel03-soak/1' } })
    await res.arrayBuffer()
    return { status: res.status, ms: Math.round(performance.now() - t0) }
  } catch {
    return { status: 0, ms: null }
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2))
  const total = Math.round(o.rps * o.minutes * 60)
  console.log(JSON.stringify({ plan: { urls: o.urls, rps: o.rps, minutes: o.minutes, requests: total, started: new Date().toISOString() } }))
  if (!o.run) { console.log('dry run: add --run to send requests'); return }
  const all = []
  let minute = []
  const gap = 1000 / o.rps
  const start = performance.now()
  const inflight = new Set()
  for (let i = 0; i < total; i++) {
    const due = start + i * gap
    const wait = due - performance.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    const p = hit(o.urls[i % o.urls.length], o.timeoutMs).then((s) => { all.push(s); minute.push(s); inflight.delete(p) })
    inflight.add(p)
    if ((i + 1) % Math.round(o.rps * 60) === 0) {
      console.log(JSON.stringify({ minute: Math.round((i + 1) / (o.rps * 60)), at: new Date().toISOString(), ...summarize(minute) }))
      minute = []
    }
  }
  await Promise.all(inflight)
  console.log(JSON.stringify({ summary: summarize(all), finished: new Date().toISOString() }))
  if (all.some((s) => s.status >= 500 || s.status === 0)) process.exitCode = 1
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(2) })
