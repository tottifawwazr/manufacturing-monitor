# MPMS frontend — Phases 1–3

Production dashboard and production logs management built with React, TypeScript, Vite, Recharts, lucide-react, and plain CSS.

## Run locally

Start the existing ASP.NET backend at `http://localhost:5084`, then run from `mpms-web`:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The existing `/api` proxy forwards dashboard requests to the backend. In PowerShell environments that block `npm.ps1`, use `npm.cmd`.

```sh
npm run build
```

The production build is written to `dist/`. A production host must route `/api` to the backend and serve `index.html` for frontend routes such as `/production-logs`; Vite's development proxy is not included in the static build.

## Dashboard data and behavior

- Start Date, End Date, and Production Line automatically filter all dashboard values together. Both date boundaries are inclusive; either boundary may be left blank. Clear Filters restores all recorded data. Refresh reloads the current selection.
- `GET /api/dashboard/summary` supplies all four KPIs.
- `GET /api/dashboard/trend` supplies daily output and targets, plus the expandable daily data table.
- `GET /api/dashboard/lines` supplies the grouped output chart, defect distribution **by production line**, and line performance table. The API does not provide defect categories.
- Initial load, valid filter changes, and manual Refresh request all three endpoints concurrently with identical query parameters. The displayed data updates only when the complete set succeeds. Reversed/invalid dates are rejected before fetching.
- Filter changes clear the old selection's results while loading. Obsolete requests are canceled and their responses ignored, including rapid changes between lines. Failed refreshes of the same selection retain the last successful data and timestamp. Initial errors show a retry action without fabricated KPI values. Requests time out after 15 seconds and are canceled on cleanup.
- Empty records, empty chart series, zero defects, and nullable defect rates have explicit states. A null defect rate is shown as **N/A**, indicating no actual production.
- Achievement is `sum(actual) / sum(target) × 100`; defect rate is `sum(defects) / sum(actual) × 100`; downtime is `sum(downtimeMinutes)`. These are ratios of database totals, not averages of per-record percentages.
- The summary's additive `simulatedRecordCount` identifies selections containing development fixtures. The wire interface accepts older summaries without this metadata; in that case the API service loads stored Production Logs and derives the count using the same inclusive date/line filters. Core KPI fields remain required and come directly from the summary response. No simulation count or KPI value is guessed. Such selections show a simulated-data notice. Production Logs also marks individual seeded rows with a SIM badge based on their versioned Notes prefix.
- “Updated” is the local time of the last successful fetch. This dashboard reports production logs; it does not provide streaming telemetry or OEE.
- Overview and Production Logs share the sidebar. Dashboard section links appear only when those sections are available.
- Charts load in a separate JavaScript chunk. Tables scroll horizontally on smaller screens; reduced motion and keyboard navigation are supported.
- Inter is loaded through Google Fonts with system sans-serif fallbacks.

## Production logs

- `/` is the existing dashboard. `/production-logs` supports direct entry, sidebar navigation, and browser Back/Forward without adding a routing dependency. Returning to the dashboard mounts it again and fetches fresh statistics.
- `GET /api/productionlogs` loads the complete records list. ID/notes search, inclusive date filters, line/shift filters, and pagination at 10 rows per page run in the browser. Filtering resets pagination. Records sort by date descending, then ID descending.
- Add opens an empty drawer. Edit first calls `GET /api/productionlogs/{id}` to load current persisted values. Existing line or shift values outside the predefined choices are preserved when editing.
- `POST /api/productionlogs` creates records and returns the persisted record. `PUT /api/productionlogs/{id}` updates records and returns 204. Save success immediately updates the row, then reloads the persisted records list, clears filters, navigates to the saved record's page, and highlights it. Form data is retained after a failed save.
- All numeric values must be whole numbers within the backend's 32-bit integer range. Targets must be positive, actual/defect/downtime values nonnegative, and defects cannot exceed actual units. Notes are optional and limited to 500 characters. Required fields and server validation errors appear inline.
- Achievement is calculated as `actualUnits / targetUnits * 100`. Status is a **frontend reporting policy**, not an API field: **On Target ≥100%**, **At Risk ≥90% and <100%**, **Below Target <90%**. Thresholds use the unrounded percentage. Legacy records without a positive target display `—` and **No target**.
- Delete requires an explicit confirmation identifying the record and warning that deletion is permanent. The table removes the record only after `DELETE /api/productionlogs/{id}` succeeds, then reloads the persisted list. Pagination automatically clamps after a deletion.
- The drawer and delete dialog use native modal dialogs for focus containment, Escape dismissal, and background isolation. Focus returns to the trigger after closing, or the main content if that row was removed. Dismissal and repeat submissions are blocked during writes.
- Loading, empty results, invalid date ranges, API failures, and retry are handled without fabricated records or counts. Failed refreshes retain the last successful list. Requests time out after 20 seconds; mutations are never automatically retried.

## Checks

```sh
npm run build
npm run lint
npm test
npm run test:e2e
```

The 17 logic tests use Node's built-in test runner and TypeScript stripping (Node 22.6+; this implementation was verified on Node 24). They cover validation boundaries, calendar dates, notes limits, status thresholds, filtering, sorting, edit conversion, shared dashboard queries, null defect rates, and simulated-data identification. Dashboard API regression cases cover older summaries without simulation metadata, current summaries without unnecessary extra requests, strict core-field validation, empty results, and rejecting changed record selections during metadata lookup.

Phase 4 adds 14 Playwright browser cases (seven flows on desktop and mobile) against a dedicated API with a fresh in-memory SQLite dataset, never the development database. Install Chromium once with `npx playwright install chromium`, or set `MPMS_TEST_BROWSER=chrome` to use installed Chrome. The runner type-checks the browser tests and starts isolated servers on 5186/5187; the ordinary proxy configuration is unchanged. See [the QA guide](../QA.md) for complete results, isolation details, remaining development-only audit findings, and limitations.

## Dashboard API version mismatch

If Production Logs shows newly seeded records but the dashboard reports an unexpected summary response, inspect the running `/api/dashboard/summary` response as well as the controller source. An API process started before Phase 3 can still serve older controller code while reading all 84 current SQLite records. In the observed failure, the running binary omitted `simulatedRecordCount` and its `/lines` endpoint ignored `productionLine`; the updated source already supported both.

Stop the old API process, run `dotnet build` from `ManufacturingMonitor.Api`, and restart with `dotnet run --no-build --launch-profile http`. Confirm `/summary` returns `simulatedRecordCount` and `/lines?productionLine=Line%20B` returns only Line B. The frontend's metadata fallback preserves compatibility with older summary shapes, but the updated API is still needed for consistent endpoint filtering. This repair does not require seeding, migrations, or any database edits.

## Development-only manufacturing dataset

From `ManufacturingMonitor.Api`, explicitly run:

```sh
dotnet run --launch-profile http -- --seed-demo
```

This command seeds and exits; normal API startup never seeds. It is rejected outside Development. The versioned generator plans 84 simulated records for October 28–November 10, 2026, across Line A (Robotic Stamping), Line B (Laser Welding), Line C (Surface Treatment), and Morning/Afternoon shifts. Existing slots are skipped without changing or deleting any records, so the insertion count may be lower than 84. Re-running inserts no duplicates.

Restart a previously running API after pulling these backend changes, then run it normally at port 5084. The Vite proxy remains unchanged. See [the API README](../ManufacturingMonitor.Api/README.md) for ranges, idempotency details, and the read-only database verification command:

```sh
python scripts/verify-manufacturing-data.py --database mpms.db --base-url http://localhost:5084
```

Run that command from `ManufacturingMonitor.Api` after seeding and starting the updated API. It checks initial demo bounds, original slot coverage, SQLite aggregates, consistent filtering, invalid range responses, and the shared records dataset.

## Browser CRUD check

1. Start the backend and Vite, then open `/production-logs`. Confirm the persisted records and total count load. Try search, date/line/shift filters, Clear Filters, and pagination when more than 10 records exist.
2. Select **Add Production Record**. Submit empty fields to check inline validation, then enter a date, line, shift, positive target, nonnegative actual/defect/downtime values, and optional notes. Defects must not exceed actual units. Select **Save Record** and confirm the new row and success message.
3. Search for the saved record ID or its notes. Reload the page to verify persistence.
4. Select that row's **Edit** action. Confirm the drawer prefills current data, change output or notes, and save. Confirm the updated row, achievement, and calculated status.
5. Select **Overview** and confirm the dashboard reflects the shared backend data. Return to **Production Logs**.
6. Select the row's **Delete** action. **Cancel** first to confirm the row remains. Open confirmation again, verify the identifier, and select **Delete Record**. Confirm removal and the updated total; return to Overview to check refreshed statistics.

Phase 3 added the explicit development seeder and consistent `productionLine` filtering on `/api/dashboard/lines`. Phase 5 adds configurable `VITE_API_BASE_URL` (defaults to `/api`) and `VITE_DEMO_READ_ONLY` for a public demonstration build. These are public build-time variables; use no secrets. The server independently enforces production read-only behavior. See [.env.example](.env.example), the [root README](../README.md), and [deployment guide](../docs/DEPLOYMENT.md). Local CRUD and the Vite proxy continue to work as before.
