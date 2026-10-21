/**
 * Starts the AI gateway for the length of an evaluation (`--start-gateway`) and stops it after, so the evaluation
 * needs no second terminal. The gateway is built from services/ai-gateway and listens on a free port of this
 * machine; it answers with the model named by `--model`. Its key and its provider come from `.env.local`, under the
 * names the gateway itself reads (AI_TOKEN, AI_BASE_URL).
 */
import { spawn, execFile, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** The environment of the gateway: what `.env.local` gives it, the port chosen here, and the model asked for. */
export function gatewayEnvironment(env: Record<string, string | undefined>, port: number, model?: string): NodeJS.ProcessEnv {
  if (!env.AI_TOKEN) {
    throw new Error('--start-gateway needs AI_TOKEN (the key of the AI provider) in .env.local; AI_BASE_URL too unless you use the default provider.')
  }
  const own = Object.fromEntries(Object.entries(env).filter((e): e is [string, string] => e[1] !== undefined))
  return { ...(own as NodeJS.ProcessEnv), ADDR: `127.0.0.1:${port}`, ...(model ? { AI_MODEL: model } : {}) }
}

/** Calls `check` until it is true; stops with an error after `timeoutMs`, or as soon as `failed` says why it never will be. */
export async function waitUntil(
  check: () => Promise<boolean>,
  { timeoutMs, intervalMs, failed }: { timeoutMs: number; intervalMs: number; failed?: () => string | undefined },
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const why = failed?.()
    if (why) throw new Error(why)
    if (await check().catch(() => false)) return
    if (Date.now() >= deadline) throw new Error(`the gateway was not ready after ${Math.round(timeoutMs / 1000)} s`)
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
  })
}

export interface RunningGateway {
  url: string
  stop: () => Promise<void>
}

export async function startGateway(model?: string): Promise<RunningGateway> {
  const port = await freePort()
  const env = gatewayEnvironment(process.env, port, model)
  const source = path.resolve(process.cwd(), 'services/ai-gateway')
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-gateway-'))
  const binary = path.join(directory, 'ai-gateway')

  console.log('Building the AI gateway...')
  try {
    await run('go', ['build', '-o', binary, '.'], { cwd: source })
  } catch (error) {
    throw new Error(`The gateway did not build (is Go installed?): ${error instanceof Error ? error.message : error}`)
  }

  const child: ChildProcess = spawn(binary, [], { env, stdio: ['ignore', 'ignore', 'pipe'] })
  let output = ''
  let exited: string | undefined
  child.stderr?.on('data', (chunk: Buffer) => { output = (output + chunk.toString()).slice(-2000) })
  child.once('exit', (code, signal) => { exited = `the gateway stopped (${signal ?? `code ${code}`}): ${output.trim().split('\n').pop() ?? ''}` })

  const url = `http://127.0.0.1:${port}`
  const stop = async () => {
    if (exited === undefined) {
      child.kill('SIGTERM')
      await new Promise((resolve) => {
        const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(undefined) }, 5000)
        child.once('exit', () => { clearTimeout(timer); resolve(undefined) })
      })
    }
    fs.rmSync(directory, { recursive: true, force: true })
  }
  // Ctrl-C, or an exit of the evaluation that does not come back here (it calls process.exit on some errors), must not
  // leave the gateway running.
  process.once('SIGINT', () => { void stop().finally(() => process.exit(130)) })
  process.once('exit', () => { child.kill('SIGKILL'); fs.rmSync(directory, { recursive: true, force: true }) })

  try {
    await waitUntil(async () => (await fetch(`${url}/healthz`)).ok, { timeoutMs: 20_000, intervalMs: 200, failed: () => exited })
  } catch (error) {
    await stop()
    throw error
  }
  console.log(`AI gateway started on ${url}${model ? ` (${model})` : ''}.`)
  return { url, stop }
}
