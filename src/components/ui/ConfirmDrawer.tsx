'use client'

import { Button, buttonClasses } from './Button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle } from './Drawer'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  /** Label of the destructive button, e.g. "Delete" */
  confirmLabel: string
  onConfirm: () => void
}

/** Asks before a destructive action: what happens, Cancel, and the action in red. */
export function ConfirmDrawer({ open, onOpenChange, title, description, confirmLabel, onConfirm }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle>{title}</DrawerTitle>
        <DrawerDescription>{description}</DrawerDescription>
        <DrawerFooter>
          <DrawerClose className={buttonClasses({ variant: 'secondary' })}>Cancel</DrawerClose>
          <Button variant="danger" onClick={() => { onOpenChange(false); onConfirm() }}>{confirmLabel}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
