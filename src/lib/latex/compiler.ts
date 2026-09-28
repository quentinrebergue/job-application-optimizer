import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

// pdflatex may not be on the Node.js PATH; use the known absolute location.
const PDFLATEX = process.env.PDFLATEX_PATH ?? '/Library/TeX/texbin/pdflatex'

export async function compilePDF(texPath: string, outputDir: string): Promise<string> {
  const pdfPath = path.join(outputDir, path.basename(texPath, '.tex') + '.pdf')

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(PDFLATEX, [
      '-interaction=nonstopmode',
      `-output-directory=${outputDir}`,
      texPath,
    ])

    let stdout = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) { resolve(); return }
      // pdflatex exits with code 1 for recoverable errors; check if PDF was produced.
      const firstError = stdout.split('\n').find((l) => l.startsWith('!')) ?? `exit code ${code}`
      reject(new Error(`pdflatex exited with code ${code}:\n${firstError}`))
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to start pdflatex: ${err.message}`))
    })
  }).catch(async (err: Error) => {
    // If the PDF was produced despite errors, treat as success (recoverable LaTeX errors).
    const exists = await fs.access(pdfPath).then(() => true).catch(() => false)
    if (!exists) throw err
  })

  return pdfPath
}
