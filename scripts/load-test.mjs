#!/usr/bin/env node

const url = process.env.LOAD_TEST_URL ?? 'http://localhost:3000/health';
const requests = Number(process.env.LOAD_TEST_REQUESTS ?? 1000);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? 50);
const headers = process.env.LOAD_TEST_TOKEN
  ? { authorization: `Bearer ${process.env.LOAD_TEST_TOKEN}` }
  : {};

let completed = 0;
let failed = 0;
let next = 0;
const durations = [];
const startedAt = Date.now();

async function runOne() {
  const started = performance.now();
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) failed += 1;
  } catch {
    failed += 1;
  } finally {
    durations.push(performance.now() - started);
    completed += 1;
  }
}

async function worker() {
  while (next < requests) {
    next += 1;
    await runOne();
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

durations.sort((a, b) => a - b);
const elapsedSeconds = (Date.now() - startedAt) / 1000;
const percentile = (p) => durations[Math.floor((durations.length - 1) * p)] ?? 0;

console.log(
  JSON.stringify(
    {
      url,
      requests,
      concurrency,
      completed,
      failed,
      elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
      requestsPerMinute: Number(((completed / elapsedSeconds) * 60).toFixed(2)),
      p50Ms: Number(percentile(0.5).toFixed(2)),
      p95Ms: Number(percentile(0.95).toFixed(2)),
      p99Ms: Number(percentile(0.99).toFixed(2)),
    },
    null,
    2,
  ),
);
