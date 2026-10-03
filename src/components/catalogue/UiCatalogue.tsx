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

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger']
const BUTTON_SIZES: ButtonSize[] = ['md', 'sm']
const BADGE_VARIANTS: BadgeVariant[] = ['neutral', 'muted', 'accent', 'info', 'success', 'warning', 'danger']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b-2 border-ink pb-8">
      <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">{title}</h2>
      {children}
    </section>
  )
}

export function UiCatalogue() {
  const [tab, setTab] = useState<'all' | 'saved' | 'applied'>('all')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex max-w-4xl flex-col gap-8 p-4 md:p-8">
      <PageHeader title="UI catalogue" subtitle="Every primitive in src/components/ui and its variants. Development only." />

      <Section title="Button">
        {BUTTON_SIZES.map((size) => (
          <div key={size} className="flex flex-wrap items-center gap-3">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} size={size}>
                {variant} {size}
              </Button>
            ))}
            <Button size={size} disabled>disabled</Button>
          </div>
        ))}
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          {BADGE_VARIANTS.map((variant) => <Badge key={variant} label={variant} variant={variant} />)}
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="font-semibold">Static card</p>
            <p className="text-sm text-ink-muted">White sticker, ink stroke, hard shadow.</p>
          </Card>
          <a href="#" className={cardClasses({ interactive: true })}>
            <p className="font-semibold">Interactive card</p>
            <p className="text-sm text-ink-muted">Moves onto its shadow on hover, focus ring on keyboard.</p>
          </a>
        </div>
      </Section>

      <Section title="Field, Input, Textarea, Select">
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="flex flex-col gap-4 p-5">
            <p className="text-sm text-ink-muted">Escape, the close button or a click on the backdrop closes it. Focus stays inside.</p>
            <div className="flex gap-3">
              <Button onClick={() => setModalOpen(false)}>Confirm</Button>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      </Section>
    </div>
  )
}
