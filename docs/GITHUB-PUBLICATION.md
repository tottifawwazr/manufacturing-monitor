# GitHub publication checklist

Publication target: **[tottifawwazr/manufacturing-monitor](https://github.com/tottifawwazr/manufacturing-monitor)**, production source branch `main`. The owner explicitly authorized GitHub publication. MPMS backend deployment and hosting purchases remain outside this publication; the personal portfolio links to the source only.

## Before publishing

- Review the README, deployment limitations, actual test results, screenshot content, and the independent-project / simulated-data disclosures.
- Confirm the repository URL and author identity. Add a demo URL only after an actual MPMS deployment. No license was selected on the owner's behalf; the source is published without a reuse license unless the owner adds one.
- Keep databases, WAL/SHM files, backups, `.env` values, private keys, user-secrets, personal IDE state, build output, test traces and `.artifacts` out of the repository. The root and frontend ignore files cover these; `.env.example` templates are intentionally included.
- Review `.github/workflows/ci.yml`: actions are pinned, token permissions are read-only, and there is no deploy/publish step or service secret. A GitHub push will run verification, not create hosting services.
- Review `Dockerfile`, `.dockerignore`, `compose.yaml` and `render.yaml`. A Blueprint file is not a deployment; importing it into a paid account requires a separate owner decision.
- Run the full verification commands in README. The Docker job still requires Docker-capable execution, because the local machine did not have Docker installed.
- Review the known development-only audit finding rather than using `npm audit fix --force`.

## Git workflow

For the initial publication, review the intended contents before committing. The commands below document the workflow, not instructions to reset an existing repository:

```sh
git init -b main
git add .
git status --short
git diff --cached --stat
git diff --cached --check
git diff --cached --name-only
```

The staged list must contain source, migrations, tests, documentation, screenshots, examples and configuration, with **no actual databases, credentials, local environment files or build/dependency directories**. Ignoring a file does not untrack it if it was committed previously; review any existing repository history separately before making it public.

After reviewing the staged diff, commit and push to the intended repository:

```sh
git commit -m "Prepare MPMS manufacturing portfolio application"
git remote add origin https://github.com/tottifawwazr/manufacturing-monitor.git
git push -u origin main
```

Do not paste access tokens into commands, repository files, or chat. Use your normal GitHub credential manager/SSH setup. Confirm CI results, then authorize hosting separately using the deployment runbook.

Suggested repository description: **Independent manufacturing production reporting MVP with ASP.NET Core, React/TypeScript, EF Core, SQLite, and automated integration/browser tests. Uses simulated data.**

Suggested topics: `csharp`, `aspnet-core`, `entity-framework-core`, `sqlite`, `react`, `typescript`, `manufacturing`, `dashboard`, `xunit`, `playwright`, `portfolio-project`.
