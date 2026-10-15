'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Drawer, DrawerContent, DrawerTitle } from './Drawer'
import { Modal } from './Modal'

/** A dialog is too cramped on a phone and a drawer too wide on a computer: this is where one turns into the other. */
const WIDE = '(min-width: 768px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const isWide = () => window.matchMedia(WIDE).matches
const never = () => () => {}

interface Props {
  open: boolean
  onClose: () => void
  title: string
  /** `wide` for a dialog that lists things (from 768 px of width). */
  size?: 'narrow' | 'wide'
  children: React.ReactNode
}

/**
 * A narrow dialog from 768 px of width, a drawer (the bottom sheet, which scrolls) below. Nothing is drawn before the
 * page is on the screen: which of the two it is depends on the width, which the server does not know.
 */
export function ResponsiveDialog({ open, onClose, title, size = 'narrow', children }: Props) {
  const mounted = useSyncExternalStore(never, () => true, () => false)
  const wide = useSyncExternalStore(subscribe, isWide, () => true)
  // A drawer that is drawn already open does not slide in: it is drawn closed, then opened a moment later.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 20)
    return () => clearTimeout(timer)
  }, [])
  if (!mounted) return null

  if (wide) {
    return (
      <Modal open={open && entered} onClose={onClose} title={title} className={size === 'wide' ? 'max-w-3xl' : 'max-w-lg'}>
        <div className="flex flex-col gap-stack p-dialog">{children}</div>
      </Modal>
    )
  }
  return (
    <Drawer open={open && entered} onOpenChange={(next) => { if (!next) onClose() }}>
      <DrawerContent className="max-h-[90dvh] overflow-y-auto">
        {/* Named for assistive technology only: on a narrow screen the room goes to the fields. */}
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        {children}
      </DrawerContent>
    </Drawer>
  )
}
