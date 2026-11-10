# Portfolio, CV and interview material

All text below describes an **independent portfolio project** using simulated manufacturing records. It must not be presented as an official Astra Otoparts application, company internship deliverable, or real factory integration.

## Portfolio website description

**Manufacturing Production Monitoring System (MPMS)** — Built a C# / ASP.NET Core REST API with Entity Framework Core and SQLite, connected to a React + TypeScript production dashboard and production-log management UI. The application aggregates output, targets, defects and downtime, supports date/line filters and validated CRUD, and identifies its synthetic manufacturing dataset. Reliability checks include xUnit integration tests and Playwright desktop/mobile browser tests. A persistent-storage deployment configuration and read-only public-demo mode are prepared; the online demo has not yet been deployed.

Suggested short card text: **A full-stack manufacturing reporting MVP with ASP.NET Core, React/TypeScript, SQLite, validated production-log CRUD, API-driven KPI analytics, and automated integration/browser tests. Uses simulated data.**

## ATS-friendly CV bullets

- Developed a C# / ASP.NET Core 10 REST API with Entity Framework Core and SQLite for production-log CRUD, input validation, and aggregated manufacturing KPIs with date-range and production-line filtering.
- Built a responsive React and TypeScript dashboard with Recharts visualizations, searchable production tables, pagination, and Add/Edit record drawers with confirmation and error states.
- Implemented 55 xUnit integration cases, 19 frontend logic/API tests, and 14 Playwright desktop/mobile cases using isolated test databases; prepared Docker, persistent-storage configuration, and CI verification for a portfolio demo.

These are project bullets, not employment claims. Do not add unmeasured efficiency improvements, user counts, live telemetry, OEE, company usage, or a deployment URL until verified. Update test counts if the suite changes.

## Suggested screenshots

| Image | What it demonstrates |
| --- | --- |
| `screenshots/dashboard-desktop.png` | Stored-data KPIs, simulated-data disclosure, output/trend/donut charts and line summary |
| `screenshots/production-logs-desktop.png` | Manufacturing record structure, search/filters, status badges and pagination |
| `screenshots/production-record-drawer-desktop.png` | Compact Add Record form, required fields, and Save/Cancel controls |
| `screenshots/dashboard-mobile.png` | Responsive cards/charts without page overflow |
| `screenshots/production-record-drawer-mobile.png` | Mobile form layout and persistent action footer |

These are actual captures from a separate in-memory QA dataset with 84 generated records; the local development database was not used. Show a filtered Line B/Line C view and inline validation during a live local walkthrough if useful. For the public read-only demo, explain why mutation actions are disabled and demonstrate CRUD locally instead.

To regenerate the captures from `mpms-web`, using installed Chrome in PowerShell:

```powershell
$env:MPMS_TEST_BROWSER = 'chrome'
$env:MPMS_CAPTURE_SCREENSHOTS = 'true'
npm.cmd run test:e2e -- --grep 'desktop and mobile fit'
```

Use Playwright's installed Chromium by omitting `MPMS_TEST_BROWSER`. The capture flag only writes screenshots; it does not connect to development data. Review screenshots before publishing and never include credentials, private records or company branding.

## Short interview explanation

“I built MPMS as an independent manufacturing reporting project. The ASP.NET Core API validates production records and persists them through Entity Framework Core to SQLite. The React client manages records and requests summary, daily-trend and per-line aggregates using the same filters. Achievement and defect rate are ratios of database totals, and zero production returns an N/A defect rate rather than an invalid percentage. I tested the real API with xUnit and isolated SQLite databases, then exercised CRUD and dashboard updates with Playwright on desktop and mobile layouts. For deployment, I prepared a single Docker service with a persistent database volume and a read-only public-demo mode. All manufacturing data is simulated; there is no factory connection or OEE calculation.”

Technical follow-up topics: server versus client validation; why SQLite tests use separate scoped connections; EF parameterization; canceling stale filter requests; safe persistent storage; why CORS is not authentication; and the difference between a locally verified publish and a completed cloud deployment.
