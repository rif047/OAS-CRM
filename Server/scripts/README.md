# Performance Scripts

## 1) API Load Test
Run:

```bash
cd Server
npm run bench:load -- --endpoint=/api/leads?status=Pending --concurrency=20 --duration=30
```

With login auto-token:

```bash
cd Server
npm run bench:load -- --endpoint=/api/leads?status=Pending --username=YOUR_USERNAME --password=YOUR_PASSWORD
```

With direct token:

```bash
cd Server
npm run bench:load -- --endpoint=/api/leads?status=Pending --token=YOUR_JWT_TOKEN
```

Notes:
- Default target: `http://localhost:9000`
- If you hit many `429`, global rate-limit is blocking high RPS. Use realistic concurrency, or benchmark on a staging profile.

## 2) Mongo Benchmark
Run:

```bash
cd Server
npm run bench:mongo -- --iterations=200 --readLimit=100 --status=Pending
```

Requirements:
- `MONGO_URI` must be present in `.env`
- Script uses a temp collection: `_perf_benchmark_tmp`
- Existing business data is not modified.
