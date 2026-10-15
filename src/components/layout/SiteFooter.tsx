import { cn } from '@/lib/cn'
import { pageFrame } from '@/components/ui/styles'
import { LegalLinks } from './LegalLinks'
import { Wordmark } from './Wordmark'

/**
 * Footer of every page: who it is from, and the legal links. No navigation: the top bar is always on the screen and has
 * the pages of the app (or the way in), so a second row of the same links only made the footer taller.
 */
export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-canvas py-footer">
      <div className={cn(pageFrame, 'flex flex-col gap-1.5')}>
        <Wordmark />
        <p className="text-small text-ink-muted">
          <span className="font-extrabold text-ink">One job. One resume. Three clicks.</span>{' '}
          Free, not for profit, hosted in France. Built by Quentin Rebergue.
        </p>
      </div>
      <div className={cn(pageFrame, 'mt-inline flex flex-col gap-1 border-t border-line pt-2 text-small text-ink-muted sm:flex-row sm:items-center sm:justify-between')}>
        <p>© 2026 FastResume · Hosted on OVHcloud in France</p>
        <LegalLinks />
      </div>
    </footer>
  )
}
