'use client'

import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { jobsHref, matchesQuery, type StatusFilter } from '@/lib/job-filter'
import { Plus, Search } from 'lucide-react'
import { JobCard } from '@/components/jobs/JobCard'
import { SEARCH_FIELD_ID, SearchField, SearchToggle } from '@/components/jobs/JobSearch'
import { FilterBar } from '@/components/ui/FilterBar'
import { Button, buttonClasses } from '@/components/ui/Button'
import type { JobOffer } from '@/types'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/config'
import { page } from '@/components/ui/styles'

const TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  ...APPLICATION_STATUSES.map((s) => ({ label: APPLICATION_STATUS_LABELS[s], value: s })),
]

interface Props {
  initialJobs: JobOffer[]
  initialFilter: StatusFilter
  /** The search of the address (?q=), if any. */
  initialQuery: string
}

export function JobsClient({ initialJobs, initialFilter, initialQuery }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<StatusFilter>(initialFilter)
  // The search is local state: the list follows every key typed, no request. The address keeps it (?q=) so that it
  // survives a visit to a job, without asking the server for the page again.
  const [query, setQuery] = useState(initialQuery)
  // On a phone the field is opened by the magnifier; a search already in the address opens it.
  const [searchOpen, setSearchOpen] = useState(initialQuery !== '')
  const searchRef = useRef<HTMLInputElement>(null)

  function changeFilter(value: StatusFilter) {
    setTab(value)
    router.replace(jobsHref(value, query), { scroll: false })
  }

  function changeQuery(value: string) {
    setQuery(value)
    window.history.replaceState(null, '', jobsHref(tab, value))
  }

  function toggleSearch() {
    if (searchOpen) {
      changeQuery('')
      setSearchOpen(false)
      return
    }
    // The field is drawn and focused inside the tap itself: a phone only opens its keyboard for a focus taken there.
    flushSync(() => setSearchOpen(true))
    searchRef.current?.focus()
  }

  function escapeSearch() {
    changeQuery('')
    setSearchOpen(false)
  }

  // The counts of the filter are those of the search: what each status would show.
  const searched = initialJobs.filter((j) => matchesQuery(j, query))
  const filtered = tab === 'all' ? searched : searched.filter((j) => j.status === tab)

  return (
    <div className={page}>
      {/* The page starts with its controls; the title is for screen readers. From 825 px the search and Add job are
          segments at the end of the bar of statuses, in its own look; below 825 px, the menu of statuses, the magnifier and
          Add job, as tall as the menu. The search field opens under all of them. */}
      <h1 className="sr-only">Job Tracker</h1>
      <div className="mb-section grid grid-cols-[minmax(0,1fr)_auto_auto] items-stretch gap-inline min-[825px]:grid-cols-1">
        <div className="min-w-0">
          <FilterBar
            label="Filter by status"
            options={TABS.map((t) => ({
              ...t,
              count: t.value === 'all' ? searched.length : searched.filter((j) => j.status === t.value).length,
            }))}
            value={tab}
            onChange={changeFilter}
            // Eight segments need 825 px: below, the menu of statuses with the magnifier and Add job beside it.
            segmentsClassName="hidden min-[825px]:flex"
            selectClassName="min-[825px]:hidden"
            actions={[
              { key: 'search', icon: <Search size={16} aria-hidden="true" />, ariaLabel: searchOpen ? 'Close the search' : 'Search jobs', expanded: searchOpen, controls: SEARCH_FIELD_ID, onClick: toggleSearch },
              { key: 'add', icon: <Plus size={16} aria-hidden="true" />, label: 'Add job', href: '/jobs/new', accent: true },
            ]}
          />
        </div>
        <SearchToggle open={searchOpen} onToggle={toggleSearch} />
        <Link href="/jobs/new" className={buttonClasses({ className: 'h-auto shrink-0 min-[825px]:hidden' })}>
          <Plus size={16} aria-hidden="true" />
          Add job
        </Link>
        <div className={searchOpen ? 'col-span-3 min-[825px]:col-span-1 min-[825px]:flex' : 'hidden'}>
          <SearchField value={query} onChange={changeQuery} onEscape={escapeSearch} inputRef={searchRef} />
        </div>
      </div>

      <p role="status" className="sr-only">{query.trim() ? `${filtered.length} ${filtered.length === 1 ? 'job matches' : 'jobs match'} your search.` : ''}</p>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-control border-2 border-dashed border-ink p-10 text-center">
          {query.trim() ? (
            <>
              <p className="mb-stack text-ink-muted">
                No {tab === 'all' ? '' : `${APPLICATION_STATUS_LABELS[tab].toLowerCase()} `}job matches &ldquo;{query.trim()}&rdquo;.
              </p>
              <Button variant="secondary" onClick={escapeSearch}>Clear the search</Button>
            </>
          ) : tab === 'all' ? (
            <>
              <p className="mb-stack text-ink-muted">No jobs yet.</p>
              <Link href="/jobs/new" className={buttonClasses()}>
                <Plus size={15} aria-hidden="true" />
                Add your first job
              </Link>
            </>
          ) : (
            <p className="text-ink-muted">No {APPLICATION_STATUS_LABELS[tab].toLowerCase()} jobs.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-stack sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  )
}
