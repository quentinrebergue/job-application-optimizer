'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button'
import { Card, cardClasses } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Field } from '@/components/ui/Field'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { eyebrow } from '@/components/ui/styles'
import { page } from '@/components/ui/styles'
import { cn } from '@/lib/cn'

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger']
const BUTTON_SIZES: ButtonSize[] = ['md', 'sm']
// The roles of globals.css, in the order of the table of docs/design/identity.md; a test fails if one is missing here.
// Written out whole: Tailwind only generates the classes it finds in the source as they are.
const TEXT_CLASS = {
  'title': 'text-title', 'heading': 'text-heading', 'section': 'text-section', 'subsection': 'text-subsection', 'item': 'text-item',
  'display': 'text-display', 'statement': 'text-statement', 'pitch': 'text-pitch', 'lead': 'text-lead',
  'body': 'text-body', 'small': 'text-small', 'small-strong': 'text-small-strong', 'caption': 'text-caption', 'label': 'text-label',
} as const
const SPACING_ROLES = ['label', 'field', 'stack', 'actions', 'inline', 'heading', 'section', 'panel', 'card', 'row', 'dialog', 'gutter', 'control', 'button', 'bar', 'footer', 'centered', 'nav', 'links', 'indent', 'band', 'hero', 'chapter', 'columns', 'showcase'] as const

/** An example and the value it has at this width, read from the page itself (so it never drifts from globals.css). */
function Measured({ className, style, children, read }: {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  read: (style: CSSStyleDeclaration) => string
}) {
  // A state, not a ref object: the value is drawn once the element exists.
  const [el, setEl] = useState<HTMLSpanElement | null>(null)
  return (
    <>
      <span ref={setEl} className={className} style={style}>{children}</span>
      <span className="tabular-nums text-ink-muted">{el ? read(getComputedStyle(el)) : ''}</span>
    </>
  )
}

const BADGE_VARIANTS: BadgeVariant[] = ['neutral', 'muted', 'accent', 'info', 'success', 'warning', 'danger']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-stack border-b-2 border-ink pb-section">
      <h2 className={eyebrow}>{title}</h2>
      {children}
    </section>
  )
}

export function UiCatalogue() {
  const [tab, setTab] = useState<'all' | 'saved' | 'applied'>('all')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className={cn(page, 'flex flex-col gap-columns')}>
      <PageHeader title="UI catalogue" subtitle="Every primitive in src/components/ui and its variants. Development only." />

      <Section title="Button">
        {BUTTON_SIZES.map((size) => (
          <div key={size} className="flex flex-wrap items-center gap-inline">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} size={size}>
                {variant} {size}
              </Button>
            ))}
            <Button size={size} disabled>disabled</Button>
          </div>
        ))}
      </Section>

      <Section title="Text styles">
        <p className="text-small text-ink-muted">One class per role: size, line height, weight and tracking. The sizes are those of this width: reload after resizing.</p>
        <div className="flex flex-col gap-row">
          {(Object.keys(TEXT_CLASS) as (keyof typeof TEXT_CLASS)[]).map((role) => (
            <div key={role} className="flex flex-wrap items-baseline gap-x-inline gap-y-1 border-b border-line pb-row">
              <span className="w-36 shrink-0 text-label text-ink-muted">text-{role}</span>
              <Measured className={TEXT_CLASS[role]} read={(style) => `${style.fontSize} / ${style.fontWeight}`}>Fast resume for every offer</Measured>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing">
        <p className="text-small text-ink-muted">One value per role, from the scale 4 8 12 16 24 32 48 64 px. The bar is the role&apos;s value at this width.</p>
        <div className="flex flex-col gap-row">
          {SPACING_ROLES.map((role) => (
            <div key={role} className="flex items-center gap-inline">
              <span className="w-36 shrink-0 text-label text-ink-muted">{role}</span>
              <Measured
                className="block h-3 rounded-control border-2 border-ink bg-accent"
                style={{ width: `var(--spacing-${role})`, minWidth: 4 }}
                read={(style) => `${Math.round(parseFloat(style.width))} px`}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          {BADGE_VARIANTS.map((variant) => <Badge key={variant} label={variant} variant={variant} />)}
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-stack sm:grid-cols-2">
          <Card>
            <p className="font-extrabold">Static card</p>
            <p className="text-small text-ink-muted">White sticker, ink stroke, hard shadow.</p>
          </Card>
          <a href="#" className={cardClasses({ interactive: true })}>
            <p className="font-extrabold">Interactive card</p>
            <p className="text-small text-ink-muted">Moves onto its shadow on hover, focus ring on keyboard.</p>
          </a>
        </div>
      </Section>

      <Section title="Field, Input, Textarea, Select">
        <div className="grid gap-stack sm:grid-cols-2">
          <Field label="Job title" hint="As written in the offer.">
            <Input placeholder="Software Engineer" />
          </Field>
          <Field label="Company" error="Company is required.">
            <Input defaultValue="" />
          </Field>
          <Field label="Status">
            <Select defaultValue="saved">
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
            </Select>
          </Field>
          <Field label="Disabled">
            <Input disabled defaultValue="Read only" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea placeholder="Paste the job description" />
          </Field>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          label="Filter by status"
          items={[
            { value: 'all', label: 'All', count: 39 },
            { value: 'saved', label: 'Saved', count: 8 },
            { value: 'applied', label: 'Applied', count: 17 },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Section>

      <Section title="Modal">
        <div>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example dialog">
          <div className="flex flex-col gap-stack p-panel">
            <p className="text-small text-ink-muted">Escape, the close button or a click on the backdrop closes it. Focus stays inside.</p>
            <div className="flex gap-inline">
              <Button onClick={() => setModalOpen(false)}>Confirm</Button>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      </Section>
    </div>
  )
}
