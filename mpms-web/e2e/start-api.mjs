import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createWriteStream } from 'node:fs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(root, '.artifacts/phase4/browser-host')
const build = spawn('dotnet', ['build', resolve(root, 'ManufacturingMonitor.Api.Tests/BrowserHost/BrowserHost.csproj'), '--output', output, '-p:UseAppHost=false'], { cwd: root, stdio: 'inherit', windowsHide: true })
const exitCode = await new Promise((done, fail) => { build.on('exit', done); build.on('error', fail) })
if (exitCode !== 0) process.exit(exitCode ?? 1)
const api = spawn('dotnet', [resolve(output, 'BrowserHost.dll')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
const log = createWriteStream(resolve(output, 'browser-host.log'), { flags: 'w' })
api.stdout.on('data', (data) => { log.write(data); process.stdout.write(data) })
api.stderr.on('data', (data) => { log.write(data); process.stderr.write(data) })
api.on('error', (error) => { console.error(error); process.exitCode = 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => api.kill(signal))
api.on('exit', (code) => { log.end(); process.exitCode = code ?? 0 })
