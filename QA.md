# Phase 4 quality assurance

This is the historical Phase 4 report. See [Phase 5 verification](docs/PHASE5-VERIFICATION.md) for the current production preparation checks and expanded test counts.

## Verification results — November 10, 2026

| Check | Result |
| --- | --- |
| Backend solution build | Passed; no compiler warnings |
| xUnit integration suite | 45 test cases |
| Frontend production build and ESLint | Passed |
| Frontend logic/API tests | 17 passed |
| Playwright browser suite | 14 cases passed: seven flows on desktop and mobile |
| Development data integrity | All 84 original records preserved field-for-field |
| NuGet vulnerability review | No known vulnerable direct or transitive packages reported |
| Production npm vulnerability review | No known vulnerabilities reported |
| Full npm dependency review | 10 moderate development dependency findings associated with one minimatch advisory; see below |

## Isolation and repeatability

`ManufacturingMonitor.Api.Tests` uses xUnit, `Microsoft.AspNetCore.Mvc.Testing`, and `WebApplicationFactory<Program>` to execute the real application pipeline. Each test owns a uniquely named in-memory SQLite database. A keeper connection preserves it while separate EF scopes use their own connections, matching normal request isolation. Test startup explicitly replaces the development DbContext configuration and verifies `Mode=Memory` before applying the actual migrations. No tests connect to `mpms.db`.

`ManufacturingMonitor.Api.Tests/BrowserHost` is a separate QA executable using the real API controllers, EF model, migrations, and JSON serialization. It accepts no development database configuration and always creates process-local, shared-cache in-memory SQLite. It generates its own simulated fixtures in that database only. Its loopback health endpoint identifies it as a test-only in-memory host. It is not mapped in the normal API.

Playwright runs serially against this host on 5187 through a dedicated Vite proxy on 5186; it refuses to reuse existing servers. It verifies the health response before each test and removes its own temporary CRUD rows afterward. The database disappears when the QA host stops. There are no production reset endpoints. `e2e/start-api.mjs` retains QA host logs under `.artifacts/phase4/browser-host/` for diagnosis.

The development database was read through a read-only SQLite connection before and after verification. All record IDs and fields were compared, including Notes and the simulated markers; all 84 records were unchanged. The development seeder was not rerun against that database. Seed repeatability is tested entirely in an isolated database.

## Backend coverage

- POST/GET/list/PUT/DELETE round trips, generated IDs, `Location`, route-ID update behavior, persistence, sorting, optional Notes, and valid zero values.
- Missing IDs for read/update/delete, malformed/null/empty request bodies, invalid dates, omitted dates, required and length-limited strings, nonnegative unit limits, fractional/overflow numeric input, and defects exceeding actual production. Invalid updates leave the stored record unchanged.
- Dashboard totals, ratio-of-sums calculations, daily grouping/order, line grouping, simulated counts, inclusive/open-ended dates, production-line filtering and whitespace, unknown lines, invalid/reversed dates, zero production, empty results, and 64-bit aggregate totals.
- A SQL-like line value returns no records; LINQ filters remain parameterized.
- Deterministic 84-record generator, documented ranges, unique slots, line performance differences, Notes labels, occupied slot preservation, repeat seeding with zero duplicates, non-Development rejection, and no seeding during normal Development startup.

## Frontend coverage

Logic tests cover required values, integer and Notes limits, calendar dates, null rates, ID/notes search, combined inclusive filters, sorting, status thresholds, API response validation, missing simulation metadata, and consistent query parameters.

Playwright exercises the real backend on both 1440×1000 desktop and 390×844 mobile viewports:

1. Required/inline validation, create and edit persistence, computed status badges, literal script-like Notes, Cancel and confirmed Delete, and refreshed dashboard totals after each mutation.
2. Search by ID/Notes, combined dates/line/shift, 10-row pagination, last page, page reset after filtering, and Clear Filters.
3. Dashboard filters, Refresh, API-derived KPI values, chart/table consistency, empty selections, N/A rates, and invalid ranges.
4. Initial loading, initial API errors, stale data on failed Refresh, Retry recovery, and empty Logs responses.
5. Submission loading, disabled controls, blocked duplicate submission/dismissal, and retained input after an API failure.
6. Server field-validation errors, failed deletion without row loss, native modal focus restoration, and Escape dismissal.
7. Viewport fit, horizontal scrolling for wide tables, and drawer fit. Every browser case fails on an uncaught page exception.

Failed browser runs retain screenshots and traces in `mpms-web/test-results`; the HTML report is in `mpms-web/playwright-report`. These are ignored generated artifacts. The runner type-checks its TypeScript tests before launching browsers.

## Fix discovered

A missing `productionDate` previously defaulted to `0001-01-01` and was accepted by the API. `ProductionLog` now validates this default sentinel using `IValidatableObject`, returning HTTP 400 with a field-level error. The frontend rejects the same sentinel and aligns its date input minimum. The existing schema, CRUD response fields, and UI layout are unchanged. No migration is needed.

The public partial `Program` declaration exists only to let `WebApplicationFactory` use the real entry point. It adds no endpoint or startup behavior.

## Dependency/security review

The production npm dependency audit and NuGet direct/transitive audit reported no known vulnerabilities. Full npm audit reported 10 moderate dependency-chain entries stemming from **one** development-only minimatch denial-of-service advisory, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). It affects glob preprocessing, not the application's production UI/API package set. The installed lint tool chain depends on the affected major line; npm's proposed fixes include major-version downgrades, and the advisory's patched minimatch release is 11.0.1. No forced upgrades, overrides across major versions, or lint-tool downgrades were applied. Review a compatible upstream lint dependency release when available. Audit results describe the advisory feeds at the verification date, not a guarantee about undisclosed vulnerabilities.

Input is checked by API model validation, range/length attributes, cross-field defect checks, and inline client validation. Existing entity IDs cannot redirect updates or control assigned create IDs. React renders text values without raw HTML. Database queries use EF parameters. Failed saves/deletes preserve form or table state. Optional simulation metadata is derived from matching persisted records rather than guessed.

This remains a local portfolio MVP: authentication, authorization, multi-user conflict resolution, rate limiting, and deployment hardening were not added. Backend tests cover the real host pipeline; the dedicated browser host focuses on real controller/database interactions. Browser verification covers Chromium/Chrome desktop and mobile emulation, not Firefox, WebKit, physical devices, or a deployed environment. It does not claim a formal accessibility or penetration-testing certification.

## Files changed

- Root: `MPMS.sln`, `.gitignore`, `README.md`, `QA.md`.
- Backend: `ManufacturingMonitor.Api/Program.cs`, `ManufacturingMonitor.Api/Models/ProductionLog.cs`; documentation links to this guide.
- xUnit: `ManufacturingMonitor.Api.Tests/{ManufacturingMonitor.Api.Tests.csproj,ApiFactory.cs,ProductionLogsTests.cs,DashboardTests.cs,SeederTests.cs}`.
- Browser API: `ManufacturingMonitor.Api.Tests/BrowserHost/{BrowserHost.csproj,Program.cs}`.
- Browser tooling: `mpms-web/playwright.config.ts`, `tsconfig.e2e.json`, `e2e/{mpms.spec.ts,start-api.mjs,vite.config.ts}`.
- Frontend: `package.json`, `package-lock.json`, `.gitignore`, `src/lib/productionLogs.ts`, `src/components/production-logs/RecordForm.tsx`, `tests/productionLogs.test.mjs`, and README.
- Removed unused Vite assets: `src/assets/{hero.png,react.svg,vite.svg}` and `public/{favicon.svg,icons.svg}`. The MPMS favicon is retained. Removed obsolete duplicate Phase 3 build outputs; retained database backups. Build/dependency/test output directories are ignored.

The integration setup follows [ASP.NET Core integration-testing guidance](https://learn.microsoft.com/en-us/aspnet/core/testing/integration-testing) and [Playwright's web-server workflow](https://playwright.dev/docs/test-webserver).
