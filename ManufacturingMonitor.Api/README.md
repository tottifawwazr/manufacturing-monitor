# MPMS API — development demo data

Automated backend and browser verification is documented in [the Phase 4 QA guide](../QA.md). Integration tests apply the real migrations to isolated in-memory databases; they never seed, reset, or modify this project's development database.

For current installation, production environment variables, health checks and deployment, see the [root README](../README.md) and [deployment guide](../docs/DEPLOYMENT.md). The public production configuration is read-only by default. The instructions below describe the separate Development database and seeder.

Normal API startup never seeds records. Run the seeder explicitly from this directory:

```sh
dotnet run --launch-profile http -- --seed-demo
```

The `http` profile selects **Development**. The command inserts eligible records, prints inserted/skipped counts, and exits without starting a web server. Seeding outside Development is rejected before any database work. Apply existing migrations first if the database has not been initialized; the seeder does not create, reset, or migrate the database.

The dataset is **simulated manufacturing data**, not factory telemetry. It deterministically generates 84 candidate records across October 28–November 10, 2026 (14 inclusive days ending November 10), three lines, and Morning/Afternoon shifts:

- Line A — Robotic Stamping: generally the strongest output and lowest defect rate.
- Line B — Laser Welding: intermediate output and quality.
- Line C — Surface Treatment: lower output, more defects, and more downtime.

Targets are 1,800–2,600 units per shift; actual output is approximately 85–103% of target. Defects normally range from 0.5–3% of actual units. Downtime normally ranges from 0–45 minutes with occasional 60–85 minute interruptions. Underperforming shifts include process-specific explanatory remarks. The arithmetic generator uses no clock or runtime random-number implementation, so the same version always produces the same candidates.

Existing records are never updated or deleted. A transaction protects the slot check and insert. An occupied `(production date, line, shift)` slot is skipped, including existing non-demo records; consequently the number inserted may be below 84. Comparison trims line/shift names and ignores case. A versioned marker in Notes also identifies a seeded record moved to another slot. Re-running the command inserts zero records when all slots are occupied. Editing Notes can remove the simulated badge, but an occupied slot is still protected from re-insertion. Deliberately deleting a demo record makes its slot eligible on the next explicit seed run.

Every inserted Notes field starts with `[SIMULATED MPMS-DEMO-20261110-v1:`. Dashboard summary adds `simulatedRecordCount` so the UI can identify selections containing this data. No schema or migration change is needed; production-line API values remain `Line A`, `Line B`, and `Line C` for compatibility with CRUD and filters.

All dashboard endpoints accept the same optional `startDate`, `endDate`, and `productionLine` query parameters. Date boundaries are inclusive. Reversed ranges return HTTP 400. Summary, trend, and per-line results use sums from the matching database records; achievement and defect rate are ratios of sums, not averages of per-record percentages. Zero actual production returns `defectRate: null`, displayed as N/A by the frontend. Aggregates use 64-bit totals.

```sh
dotnet build
dotnet run --launch-profile http
python scripts/verify-manufacturing-data.py --database mpms.db --base-url http://localhost:5084
```

The read-only verification script compares summary, daily trend, and per-line results against SQLite aggregates for multiple inclusive date/line combinations, validates the simulated dataset's bounds, and checks invalid date ranges. Restart a running API after backend source changes.

## Running an older API binary

Newly seeded SQLite records are visible even to an API process running older controller code. If `/api/dashboard/summary` omits `simulatedRecordCount`, or `/api/dashboard/lines?productionLine=Line%20B` returns other lines, stop the existing API process, build this project, then restart it:

```sh
dotnet build
dotnet run --no-build --launch-profile http
```

Do not rerun seeding to fix a response-contract mismatch. The controller source and running binary must match. On Windows, the old API process may also lock its executable and prevent a normal build until it is stopped. The frontend accepts missing simulation metadata and derives its label count from stored records, while retaining strict validation of all core KPI values.
