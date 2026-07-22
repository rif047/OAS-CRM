#!/usr/bin/env node
require('dotenv').config();

const mongoose = require('mongoose');

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, ...v] = arg.replace(/^--/, '').split('=');
    return [k, v.join('=') || 'true'];
  })
);

const config = {
  uri: process.env.MONGO_URI,
  iterations: Number(args.iterations || process.env.BENCH_ITERATIONS || 200),
  readLimit: Number(args.readLimit || process.env.BENCH_READ_LIMIT || 100),
  status: args.status || process.env.BENCH_STATUS || 'Pending',
};

if (!config.uri) {
  console.error('Missing MONGO_URI in environment.');
  process.exit(1);
}

const nowMs = () => Number(process.hrtime.bigint() / 1000000n);
const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

function printMetric(name, values) {
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  console.log(`${name.padEnd(24)} avg=${avg.toFixed(2)}ms p95=${percentile(values, 95).toFixed(2)}ms p99=${percentile(values, 99).toFixed(2)}ms n=${values.length}`);
}

async function benchReads(db) {
  const leads = db.collection('leads');
  const times = [];

  for (let i = 0; i < config.iterations; i++) {
    const t0 = nowMs();
    await leads
      .find({ status: config.status })
      .sort({ createdAt: -1 })
      .limit(config.readLimit)
      .toArray();
    times.push(nowMs() - t0);
  }

  return times;
}

async function benchWrites(db) {
  const col = db.collection('_perf_benchmark_tmp');
  const insertTimes = [];
  const updateTimes = [];
  const readTimes = [];
  const deleteTimes = [];

  for (let i = 0; i < config.iterations; i++) {
    const doc = {
      run: i,
      kind: 'benchmark',
      createdAt: new Date(),
      payload: { text: 'sample', value: i, active: true },
    };

    let t0 = nowMs();
    const inserted = await col.insertOne(doc);
    insertTimes.push(nowMs() - t0);

    t0 = nowMs();
    await col.updateOne({ _id: inserted.insertedId }, { $set: { 'payload.value': i + 1 } });
    updateTimes.push(nowMs() - t0);

    t0 = nowMs();
    await col.findOne({ _id: inserted.insertedId });
    readTimes.push(nowMs() - t0);

    t0 = nowMs();
    await col.deleteOne({ _id: inserted.insertedId });
    deleteTimes.push(nowMs() - t0);
  }

  return { insertTimes, updateTimes, readTimes, deleteTimes };
}

async function main() {
  await mongoose.connect(config.uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
  });

  const db = mongoose.connection.db;
  console.log('\n=== Mongo Benchmark ===');
  console.log(`DB Name        : ${db.databaseName}`);
  console.log(`Iterations     : ${config.iterations}`);
  console.log(`Read limit     : ${config.readLimit}`);
  console.log(`Read status    : ${config.status}`);

  const collectionNames = await db.listCollections().toArray();
  if (!collectionNames.some((c) => c.name === 'leads')) {
    console.log('Collection "leads" not found. Skipping lead read benchmark.');
  } else {
    const leadReadTimes = await benchReads(db);
    printMetric('Lead list read', leadReadTimes);
  }

  const { insertTimes, updateTimes, readTimes, deleteTimes } = await benchWrites(db);
  printMetric('Temp insert', insertTimes);
  printMetric('Temp update', updateTimes);
  printMetric('Temp read', readTimes);
  printMetric('Temp delete', deleteTimes);

  await db.collection('_perf_benchmark_tmp').deleteMany({});
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Mongo benchmark failed:', error?.message || error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
