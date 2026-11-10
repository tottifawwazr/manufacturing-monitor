# Phase 5 verification — November 10, 2026

The source is prepared for public GitHub review and an owner-operated online demo. No service was purchased, no external deployment was performed, and nothing was pushed. The workspace has no root Git repository or remote; an isolated, ignored Git index was used solely to review the prospective publication contents.

## Executed checks

| Check | Actual result |
| --- | --- |
| Backend solution build | Passed, zero compiler warnings |
| Backend xUnit integration tests | **55 passed**; isolated SQLite databases |
| Frontend production build | Passed |
| ESLint and e2e TypeScript checks | Passed |
| Frontend logic/API tests | **19 passed** |
| Playwright suite | **14 passed**, seven flows each on desktop/mobile |
| Screenshot capture | Two additional responsive cases passed; six actual UI PNGs captured from the isolated QA database |
| Release API publish + production frontend build | Passed; combined published app exercised on a separate local port |
| Production configuration | Exact CORS, read-only API/UI, safe health output, missing-schema readiness, unavailable development/QA endpoints verified |
| Production demo initialization | Explicitly created a separate database with 84 simulated records; tests verify refusal to overwrite an occupied database |
| Published app routes and data | SPA `/production-logs`, all three dashboard endpoints, real KPIs and 403 mutation protection verified |
| Native production-process restart | Separate production file retained 84/84 simulated records; readiness Healthy after restart |
| Development data | All **84 records, including 83 simulated records, unchanged field-for-field** against the pre-work read-only snapshot |
| Fresh source checkout | Tools/dependencies restored, backend build + 55 tests, frontend build/lint + 19 tests passed; EF migration created an empty, separate local database |
| NuGet audit, direct and transitive | No known vulnerabilities reported across the solution |
| npm production audit | **0 vulnerabilities** |
| npm full dependency audit | **10 moderate development-only findings**, no high or critical findings |

The full npm findings share the known minimatch advisory in the development lint dependency tree. They were not resolved with a forced breaking dependency upgrade. Track compatible upstream patches and repeat the audit before publication. This is distinct from the production dependency result. [Advisory GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

The fresh-checkout check used only files admitted by the publication index, without copying any existing database, restored dependencies, build output or local environment values. Migrations generated the fresh database from source. Source review excluded database files, secrets/local environment files, dependency folders and test/build output; example environment files and six screenshots are intentional source artifacts. A common credential-pattern scan found no matches. These checks do not constitute a guarantee that arbitrary future files are safe to publish: review the final staged diff before committing.

## Files added or changed in Phase 5

| Area | Files |
| --- | --- |
| Production API | `ManufacturingMonitor.Api/Program.cs`, `Hosting/ProductionConfiguration.cs`, `Hosting/DatabaseReadinessCheck.cs`, `Data/ProductionDemoInitializer.cs` |
| API settings and publishing | `ManufacturingMonitor.Api/appsettings.json`, `appsettings.Development.json`, new `appsettings.Production.json`, `.env.example`, `ManufacturingMonitor.Api.csproj`, `ManufacturingMonitor.Api.http` |
| Backend verification | `ManufacturingMonitor.Api.Tests/ApiFactory.cs`, new `ProductionReadinessTests.cs` |
| Configurable frontend and demo controls | New `mpms-web/src/lib/apiConfig.ts`, `src/vite-env.d.ts`, `.env.example`; updated `src/lib/dashboardApi.ts`, `src/lib/productionLogsApi.ts`, `src/components/PageShell.tsx`, `src/pages/ProductionLogsPage.tsx`, `src/App.css` |
| Frontend verification and screenshots | New `mpms-web/tests/apiConfig.test.mjs`; updated `mpms-web/e2e/mpms.spec.ts`; six PNGs under `docs/screenshots/` |
| Deployment | New `Dockerfile`, `.dockerignore`, `compose.yaml`, `render.yaml`, `deploy/entrypoint.sh`, `.env.production.example` |
| Source and CI preparation | Updated `.gitignore`; new `.gitattributes`, `.config/dotnet-tools.json`, `.github/workflows/ci.yml` |
| Documentation | New root `README.md`, `docs/DEPLOYMENT.md`, `docs/GITHUB-PUBLICATION.md`, `docs/PORTFOLIO.md`, this report; updated `QA.md`, both project READMEs |
| Unused boilerplate removed | `ManufacturingMonitor.Api/WeatherForecast.cs`, `ManufacturingMonitor.Api/Controllers/WeatherForecastController.cs` |

No model/schema migration, existing record, dashboard calculation, CRUD contract, navigation redesign or new UI framework was introduced. Local CRUD remains available; only the public-demo configuration disables it.

## Remaining limits and owner actions

Docker is not installed here. The Dockerfile, Compose configuration, Render Blueprint and GitHub Actions workflow were prepared and reviewed, but **container image execution, Linux volume permissions, GitHub-hosted CI and a real Render deployment have not run**. The separate native published application check is evidence for application behavior, not a substitute for those checks. The CI container job is intended to build, initialize an isolated volume, verify routing/read-only behavior and confirm restart persistence.

Before sharing a live demo, the owner must review the repository name, username/demo placeholders and license choice; publish the reviewed source; pass the hosted CI/container job; authorize a paid single-instance host with a persistent disk; set exact production hosts/environment variables; explicitly initialize the fresh mounted database; verify health, filters, read-only protection and persistence; and test an off-host backup/restore. Follow the [exact deployment runbook](DEPLOYMENT.md). No local development database should be uploaded.

The application has no authentication, so the prepared public demo must remain read-only. SQLite is limited to a small single-instance deployment. Chromium desktop/mobile emulation is covered; other browser engines and physical devices are not. The simulated dataset and independent, unofficial portfolio status are disclosed in the UI and documentation. The demo URL remains a placeholder until a deployment is actually verified.
