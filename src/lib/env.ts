/**
 * A positive number from the environment, or the default. A typo (`abc`, `0`, `-3`, `2.5` for a
 * whole number) falls back to the default instead of switching a limit off. Read at each call,
 * so the tests can set the environment and a change applies after a restart, never a rebuild.
 */
export function envNumber(name: string, fallback: number, whole = true): number {
  const value = Number(process.env[name])
  const valid = whole ? Number.isInteger(value) : Number.isFinite(value)
  return valid && value > 0 ? value : fallback
}
