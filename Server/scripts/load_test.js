#!/usr/bin/env node
require('dotenv').config();

const nowMs = () => Number(process.hrtime.bigint() / 1000000n);

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, ...v] = arg.replace(/^--/, '').split('=');
    return [k, v.join('=') || 'true'];
  })
);

const config = {
  baseUrl: args.baseUrl || process.env.BENCH_BASE_URL || process.env.VITE_SERVER_URL || 'http://localhost:9000',
  endpoint: args.endpoint || process.env.BENCH_ENDPOINT || '/api/leads?status=Pending',
  method: (args.method || process.env.BENCH_METHOD || 'GET').toUpperCase(),
  durationSec: Number(args.duration || process.env.BENCH_DURATION_SEC || 20),
  concurrency: Number(args.concurrency || process.env.BENCH_CONCURRENCY || 20),
  timeoutMs: Number(args.timeout || process.env.BENCH_TIMEOUT_MS || 12000),
  body: args.body ? JSON.parse(args.body) : undefined,
  token: args.token || process.env.BENCH_TOKEN || '',
  loginUrl: args.loginUrl || process.env.BENCH_LOGIN_URL || '/login',
  username: args.username || process.env.BENCH_USERNAME || '',
  password: args.password || process.env.BENCH_PASSWORD || '',
};

const percent = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

async function getTokenIfNeeded() {
  if (config.token) return config.token;
  if (!config.username || !config.password) return '';

  const res = await fetch(`${config.baseUrl}${config.loginUrl}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: config.username, password: config.password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed (${res.status})`);
  }

  const json = await res.json();
  return json?.token || '';
}

async function oneRequest(authToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const started = nowMs();

  try {
    const headers = { Accept: 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    if (config.body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${config.baseUrl}${config.endpoint}`, {
      method: config.method,
      headers,
      body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      signal: controller.signal,
    });

    const elapsed = nowMs() - started;
    return { ok: res.ok, status: res.status, elapsed };
  } catch (error) {
    const elapsed = nowMs() - started;
    return { ok: false, status: 'ERR', elapsed, error: error?.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  const token = await getTokenIfNeeded();
  const stopAt = Date.now() + config.durationSec * 1000;

  let total = 0;
  let success = 0;
  const latencies = [];
  const statusCounts = new Map();

  async function worker() {
    while (Date.now() < stopAt) {
      const result = await oneRequest(token);
      total += 1;
      if (result.ok) success += 1;
      latencies.push(result.elapsed);
      statusCounts.set(String(result.status), (statusCounts.get(String(result.status)) || 0) + 1);
    }
  }

  const startedAt = Date.now();
  await Promise.all(Array.from({ length: config.concurrency }, () => worker()));
  const actualDurationSec = (Date.now() - startedAt) / 1000;

  const failed = total - success;
  const rps = total / Math.max(actualDurationSec, 0.001);
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  console.log('\n=== Load Test Result ===');
  console.log(`Target        : ${config.method} ${config.baseUrl}${config.endpoint}`);
  console.log(`Duration      : ${actualDurationSec.toFixed(2)} sec`);
  console.log(`Concurrency   : ${config.concurrency}`);
  console.log(`Requests      : ${total}`);
  console.log(`Success       : ${success}`);
  console.log(`Failed        : ${failed}`);
  console.log(`RPS           : ${rps.toFixed(2)}`);
  console.log(`Latency avg   : ${avg.toFixed(2)} ms`);
  console.log(`Latency p50   : ${percent(latencies, 50).toFixed(2)} ms`);
  console.log(`Latency p95   : ${percent(latencies, 95).toFixed(2)} ms`);
  console.log(`Latency p99   : ${percent(latencies, 99).toFixed(2)} ms`);

  console.log('\nStatus breakdown:');
  for (const [status, count] of [...statusCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${status}: ${count}`);
  }
}

run().catch((error) => {
  console.error('Load test failed:', error?.message || error);
  process.exit(1);
});
