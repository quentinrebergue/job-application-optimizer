import type { ChangeResult } from './credentials'

/** The page of /verify-email has a message for each result of a change of address. */
export function emailChangeStatus(result: ChangeResult): string {
  if (result === 'changed') return 'email-changed'
  if (result === 'taken') return 'email-taken'
  return result
}
