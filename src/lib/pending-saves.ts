/**
 * The saves waiting for their delay, one per field (a later keystroke replaces the one before it). Kept apart from the
 * React hook so that what happens when someone leaves can be tested: `flush` runs every waiting save at once instead
 * of dropping it, which is what a dialog closed in the 0.8 s after the last keystroke needs.
 */
export class PendingSaves<F extends string> {
  private timers = new Map<F, ReturnType<typeof setTimeout>>()
  private values = new Map<F, string>()

  /** Saves `value` for `field` in `delay` ms, in place of the save already waiting for that field. */
  schedule(field: F, value: string, delay: number, run: (field: F, value: string) => void): void {
    this.cancel(field)
    this.values.set(field, value)
    this.timers.set(
      field,
      setTimeout(() => {
        this.timers.delete(field)
        this.values.delete(field)
        run(field, value)
      }, delay),
    )
  }

  /** Drops the save waiting for a field (it did not pass validation, or a new value replaces it). */
  cancel(field: F): void {
    clearTimeout(this.timers.get(field))
    this.timers.delete(field)
    this.values.delete(field)
  }

  /** True while a save is waiting for its delay. */
  get waiting(): boolean {
    return this.timers.size > 0
  }

  /** Runs every waiting save now. */
  flush(run: (field: F, value: string) => void): void {
    for (const [field, value] of [...this.values]) {
      this.cancel(field)
      run(field, value)
    }
  }
}
