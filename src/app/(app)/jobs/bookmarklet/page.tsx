'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'

const BOOKMARKLET_MINI =
  `javascript:(function(){var t='',c='',d='';` +
  `var h=document.querySelector('h1.job-details-jobs-unified-top-card__job-title')||document.querySelector('h1');` +
  `if(h)t=h.innerText.trim();` +
  `var co=document.querySelector('.job-details-jobs-unified-top-card__company-name')||document.querySelector('.jobs-unified-top-card__company-name');` +
  `if(co)c=co.innerText.trim();` +
  `var de=document.querySelector('#job-details')||document.querySelector('.jobs-description__content');` +
  `if(de)d=de.innerText.trim().slice(0,4000);` +
  `window.open('http://localhost:3000/jobs/new?'+new URLSearchParams({title:t,company:c,url:location.href,description:d}).toString(),'_blank');` +
  `})();`

const BOOKMARKLET_SRC = `(function () {
  var t = '', c = '', d = '';

  // Job title
  var h = document.querySelector('h1.job-details-jobs-unified-top-card__job-title')
       || document.querySelector('h1');
  if (h) t = h.innerText.trim();

  // Company name
  var co = document.querySelector('.job-details-jobs-unified-top-card__company-name')
        || document.querySelector('.jobs-unified-top-card__company-name');
  if (co) c = co.innerText.trim();

  // Job description (first 4 000 chars)
  var de = document.querySelector('#job-details')
        || document.querySelector('.jobs-description__content');
  if (de) d = de.innerText.trim().slice(0, 4000);

  window.open(
    'http://localhost:3000/jobs/new?' +
    new URLSearchParams({ title: t, company: c, url: location.href, description: d }).toString(),
    '_blank'
  );
})();`

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(BOOKMARKLET_MINI)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl flex flex-col gap-10">
      <PageHeader
        title="LinkedIn Bookmarklet"
        subtitle="One-click import of any LinkedIn job listing into Job Tracker."
      />

      {/* Install */}
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-slate-900">Install</h2>
        <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
          <li>Make sure your browser&apos;s bookmarks bar is visible <span className="text-slate-400">(⌘ + Shift + B in Chrome/Edge)</span>.</li>
          <li>Drag the button below onto your bookmarks bar.</li>
          <li>Alternatively, copy the code and create a new bookmark — paste the code as the URL.</li>
        </ol>

        <div className="flex items-center gap-4 mt-2">
          {/* Draggable bookmarklet link */}
          { }
          <a
            href={BOOKMARKLET_MINI}
            onClick={(e) => e.preventDefault()}
            draggable
            className="select-none rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-grab active:cursor-grabbing"
          >
            + Save to JobOptimizer
          </a>
          <span className="text-xs text-slate-400">← drag this to your bookmarks bar</span>
        </div>

        <button
          onClick={handleCopy}
          className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy bookmarklet code'}
        </button>
      </section>

      {/* How to use */}
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-slate-900">How to use</h2>
        <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
          <li>
            Open any LinkedIn job listing —{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
              linkedin.com/jobs/view/…
            </code>
          </li>
          <li>Click <strong>&quot;+ Save to JobOptimizer&quot;</strong> in your bookmarks bar.</li>
          <li>A new tab opens at <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">localhost:3000/jobs/new</code> with the form pre-filled.</li>
          <li>Review the description, adjust if needed, and hit <strong>Save</strong>.</li>
        </ol>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <strong>What gets scraped:</strong> job title, company name, page URL, and up to 4 000 characters of the job description. LinkedIn sometimes changes its page structure — if fields are blank, paste them manually.
        </div>
      </section>

      {/* Source */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-900">Source</h2>
        <pre className="rounded-xl bg-slate-900 text-slate-100 text-xs p-5 overflow-x-auto leading-relaxed whitespace-pre">
          <code>{BOOKMARKLET_SRC}</code>
        </pre>
      </section>
    </div>
  )
}
