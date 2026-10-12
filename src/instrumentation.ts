// Runs once when the server starts (a Next.js convention). It must not wait: the server is not ready before it ends.
export async function register() {
  // Only the Node.js server has the database: the Edge runtime is not given the cleanup (and could not load `pg`).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startMaintenance } = await import('@/lib/maintenance')
  startMaintenance()
}
