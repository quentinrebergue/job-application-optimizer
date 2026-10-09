/** Where the money goes: the cost of a ranking split between the prompt and the answer, and between their parts. */

/** The average share (0 to 1) of each part, every case counting the same, biggest first. */
export function averageShares(cases: Record<string, number>[]): [string, number][] {
  const totals = new Map<string, number>()
  let counted = 0
  for (const sizes of cases) {
    const all = Object.values(sizes).reduce((sum, size) => sum + size, 0)
    if (!all) continue
    counted++
    for (const [name, size] of Object.entries(sizes)) totals.set(name, (totals.get(name) ?? 0) + size / all)
  }
  return [...totals].map(([name, sum]) => [name, sum / Math.max(1, counted)] as [string, number]).sort((a, b) => b[1] - a[1])
}

interface Input {
  model?: string
  /** Euros per million tokens, or null when the model is not in the price table. */
  price: { input: number; output: number } | null
  promptTokens: number
  completionTokens: number
  inputShares: [string, number][]
  outputShares: [string, number][]
  /** How many rankings the figures are given for. */
  rankings?: number
}

/** The table, as text. With no price, only the tokens are shown. */
export function formatMoney({ model, price, promptTokens, completionTokens, inputShares, outputShares, rankings = 1000 }: Input): string {
  const euros = (tokens: number, per: number | undefined) => (per === undefined ? 0 : (tokens * per * rankings) / 1e6)
  const totalEuros = euros(promptTokens, price?.input) + euros(completionTokens, price?.output)
  const row = (indent: string, label: string, tokens: number, per: number | undefined) => {
    const money = price ? `${euros(tokens, per).toFixed(2).padStart(7)} EUR ${`${Math.round((euros(tokens, per) / totalEuros) * 100)}%`.padStart(4)}` : ''
    return `${indent}${label.padEnd(22 - indent.length)} ${String(Math.round(tokens)).padStart(6)} tokens ${money}`.trimEnd()
  }
  const lines = [
    price
      ? `Where the money goes, for ${rankings} rankings (${model}: ${price.input} in, ${price.output} out, EUR per million tokens):`
      : `Where the tokens go, per ranking (give --model to see the money):`,
    row('  ', 'INPUT (the prompt)', promptTokens, price?.input),
    ...inputShares.map(([name, share]) => row('    ', name, share * promptTokens, price?.input)),
    row('  ', 'OUTPUT (the answer)', completionTokens, price?.output),
    ...outputShares.map(([name, share]) => row('    ', name, share * completionTokens, price?.output)),
  ]
  if (price) lines.push(`  TOTAL ${totalEuros.toFixed(2)} EUR for ${rankings} rankings, ${(totalEuros / rankings).toFixed(4)} EUR each`)
  return lines.join('\n')
}
