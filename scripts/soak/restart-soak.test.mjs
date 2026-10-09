import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseArgs, summarize } from './restart-soak.mjs'

test('defaults to a dry run at 1 rps for 1 minute', () => {
  const o = parseArgs(['--url', 'https://example.com/health'])
  assert.equal(o.run, false); assert.equal(o.rps, 1); assert.equal(o.minutes, 1)
})
test('refuses plain http, missing urls and unsafe rates or durations', () => {
  assert.throws(() => parseArgs(['--url', 'http://example.com']), /https only/)
  assert.throws(() => parseArgs([]), /--url is required/)
  assert.throws(() => parseArgs(['--url', 'https://e.com', '--rps', '500']), /--rps/)
  assert.throws(() => parseArgs(['--url', 'https://e.com', '--minutes', '600']), /--minutes/)
  assert.throws(() => parseArgs(['--url', 'https://e.com', '--method', 'POST']), /unknown argument/)
})
test('summarize counts classes and percentiles', () => {
  const s = summarize([{ status: 200, ms: 10 }, { status: 200, ms: 30 }, { status: 503, ms: 20 }, { status: 0, ms: null }, { status: 404, ms: 5 }])
  assert.deepEqual(s, { requests: 5, ok_2xx_3xx: 2, http_4xx: 1, http_5xx: 1, network_errors: 1, p50_ms: 20, p95_ms: 30 })
})
