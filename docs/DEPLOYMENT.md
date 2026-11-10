# MPMS deployment preparation

These files prepare an MPMS deployment; **MPMS is not deployed**. Publishing the source to [GitHub](https://github.com/tottifawwazr/manufacturing-monitor) and updating the personal portfolio do not deploy this backend. Hosting purchases and MPMS deployment still require separate owner authorization.

## Recommended approach and research

Use **one paid Render Docker web service with a 1 GB persistent disk**, serving the React build and ASP.NET Core API together. This minimizes services and origin configuration while preserving the existing EF Core SQLite provider. A small Linux VPS with Docker Compose is an alternative if you want to manage HTTPS, OS updates and backups yourself. Static hosting alone cannot run this API; an ephemeral function/container filesystem cannot provide durable SQLite storage.

.NET 10 is LTS through November 2028; keep its patches current. The Dockerfile uses official .NET 10 SDK/runtime images and Node 24 for the frontend build, so a host does not need a native .NET buildpack. [Microsoft support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [Render Docker support](https://render.com/docs/docker).

Budget approximately **US$7/month for the small compute plan plus US$0.25/month for 1 GB disk**, before taxes, bandwidth and optional services. This is a planning estimate checked November 10, 2026; confirm the checkout price before approving charges. The Blueprint uses the still-supported `starter` plan alias. [Render's current plan table](https://render.com/articles/set-up-self-hosted-github-actions-runners-on-render), [disk pricing](https://render.com/pricing?trk=article-ssr-frontend-pulse_little-text-block).

Only writes below the mounted disk path survive host redeploys. Disks require a paid service and limit it to one instance; disk-backed deploys can have downtime. Migrations/initialization must run where the disk is mounted, not in a build or pre-deploy environment. [Persistent disk requirements](https://render.com/docs/disks), [deploy behavior](https://render.com/docs/deploys).

## Configuration and safety

| Requirement | Prepared value |
| --- | --- |
| Production runtime | `ASPNETCORE_ENVIRONMENT=Production` |
| Internal HTTP port | `ASPNETCORE_HTTP_PORTS=8080`; Render `PORT=8080` |
| Database | `ConnectionStrings__DefaultConnection=Data Source=/var/lib/mpms/mpms-production.db` |
| Persistent mount | `/var/lib/mpms`, 1 GB or larger, one service instance |
| Allowed host | Exact `YOUR-SERVICE.onrender.com`, without scheme/path; add an approved custom hostname with `;` |
| Server mutation control | `Demo__ReadOnly=true` |
| Frontend | Docker builds with `VITE_API_BASE_URL=/api`, `VITE_DEMO_READ_ONLY=true` |
| CORS | No grant needed for same-origin hosting. For a separate frontend, set `Cors__AllowedOrigins__0=https://YOUR-FRONTEND.example` exactly |
| TLS | Render terminates TLS and redirects external HTTP. The app does not trust arbitrary forwarded headers or do a second redirect by default |
| Liveness | `/healthz/live` returns status only; use for initial Render health check |
| Readiness | `/healthz/ready` returns 503 until the configured database and schema are available |

Production refuses an unset, relative/in-memory, or content-root development connection path and wildcard AllowedHosts. It does not automatically detect whether a platform mount is persistent: attaching the disk is a mandatory operator step. The image excludes SQLite files, environment files, build/test output, and local credentials; publish exclusions also block databases and `.env` files. The application process runs as `app`; its root entrypoint prepares only the fixed mount directory before dropping privileges.

No startup command seeds automatically. `--seed-demo` remains Development-only. The separate `--initialize-production-demo` command is an explicit Production-only operation requiring read-only mode, a configured production path, and an **empty** records table. It applies migrations and generates 84 new, labeled synthetic records. It never copies the local database, and refuses to insert into an occupied production database.

The public build's UI flag is informational; the server enforces the write restriction. Do not disable server read-only mode on an unauthenticated public service. CORS is a browser policy, not access control. A separate frontend requires its public API URL at build time and an exact HTTPS CORS origin on the API. Never put secrets in Vite variables. [ASP.NET CORS](https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-10.0), [Vite environment variables](https://vite.dev/guide/env-and-mode.html).

## Local Docker check — owner action

Install Docker first; Docker was not available in this workspace, so these commands have not been executed locally. The CI container job is prepared to exercise them after an authorized push.

```sh
cp .env.production.example .env.production
docker compose build
docker compose run --rm --no-deps mpms --initialize-production-demo
docker compose up -d
curl --fail http://localhost:8080/healthz/ready
```

PowerShell uses `Copy-Item .env.production.example .env.production`. Open `http://localhost:8080` and `/production-logs`; confirm the read-only notice, 84 simulated records, filtered results, and disabled mutation actions. Restart with `docker compose restart`, then confirm the record count remains 84. A direct POST to `/api/productionlogs` must return 403. `docker compose down` retains the named volume; **do not use `down -v` if you want to retain its data**.

The production named volume is independent from `ManufacturingMonitor.Api/mpms.db`. Keep `.env.production` untracked. If a mounted disk already contains files with incorrect ownership, correct ownership during a deliberate maintenance window; the entrypoint only adjusts the mount directory, not arbitrary existing data.

## GitHub and Render — exact actions requiring the owner

1. Review [publication checks](GITHUB-PUBLICATION.md) and the source at `tottifawwazr/manufacturing-monitor`. Choose a license if reuse rights are intended, and review the exact commit you plan to deploy.
2. Run the CI workflow and confirm the Docker smoke job passes. It builds the image, initializes a disposable named volume, checks SPA/health/read-only behavior, restarts the container and verifies persistence.
3. Authorize a paid Render service and persistent disk, connect the reviewed GitHub repository, and create a Blueprint from `render.yaml`. Do not choose the free ephemeral instance. Verify the disk mount and single instance before proceeding.
4. Set `AllowedHosts` to the exact assigned Render hostname. If you chose a custom domain, configure its DNS/HTTPS and add its hostname. Include every verified custom domain: Render uses a verified custom domain as the health-check Host header when one exists, otherwise the assigned `onrender.com` hostname. Verify the environment values in the table. The Blueprint disables auto-deploys; no push should release without a manual decision. [Render health-check host behavior](https://render.com/docs/health-checks).
5. Trigger the first deployment. `/healthz/live` allows the process to become reachable while its new database is uninitialized. The UI/API is not ready for sharing until the next step and `/healthz/ready` succeeds.
6. In the service's own mounted-disk shell, run exactly:

   ```sh
   gosu app dotnet /app/ManufacturingMonitor.Api.dll --initialize-production-demo
   ```

   Run once. A second invocation refuses the occupied table; it is not a reset command. Do not use an unmounted one-off job or switch the production service to Development to seed.

7. Check both health endpoints; verify the dashboard, filtered API responses, `/production-logs` route refresh, all 84 simulated records, and a 403 response for mutations. Verify OpenAPI and QA-only endpoints are absent. Restart/redeploy once and verify persistence before sharing.
8. Record an initial SQLite backup, add the verified demo URL to README and portfolio, and only then share it with recruiters. The repository describes this as an independent simulated project, not a company system.

The Blueprint does not create a database automatically or run seed/migration commands. Its configuration follows [Render's Blueprint reference](https://render.com/docs/blueprint-spec). A local file/configuration review does not replace a real platform deployment test.

## Backups and future migrations

Use SQLite's online backup mechanism while the database is open; copying just the live `.db` file can miss WAL transactions. For example, from the service shell:

```sh
gosu app sqlite3 /var/lib/mpms/mpms-production.db ".backup '/tmp/mpms-demo-backup.db'"
```

Download the backup using the host's supported file-transfer workflow and store it outside the service, not in Git. Keep dated backups and test restore into a separate instance. Stop traffic/processes before a deliberate restore; never overwrite the current database as a routine release step. Disk snapshots are additional protection, not a substitute for a tested SQLite backup.

For a future schema change, back up first, generate/review an EF migration or deployment bundle, run it against the production connection on the mounted service during a maintenance window, then deploy/check readiness. Do not rerun the demo initializer against populated data or automatically migrate/seed on every startup. SQLite's single-instance/write-concurrency limit remains; move to a managed relational service before horizontal scaling.

## Verification limits

The Release publish, combined static hosting, Production settings, separate SQLite initialization, CORS behavior, read-only API/UI, health checks, and existing suites were verified locally. Docker/Compose image execution, Linux volume ownership, real Render provisioning, billing, DNS, TLS, and remote backup/restore still require the owner's container/hosting validation. No external deploy has occurred.
