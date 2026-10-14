import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge knows Tailwind's default scale; our own tokens from globals.css
// must be declared so that, e.g., `rounded-control` and `rounded-none` conflict.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control'],
      container: ['page', 'measure'],
      // The text styles of globals.css: `text-small` replaces `text-caption`, and neither replaces a colour like `text-ink`.
      text: ['body', 'title', 'heading', 'section', 'subsection', 'item', 'small', 'small-strong', 'caption', 'label'],
      shadow: ['hard'],
      // The spacing roles of globals.css: `p-panel` replaces `p-card`, `gap-field` replaces `gap-4`.
      spacing: ['press', 'label', 'field', 'stack', 'actions', 'inline', 'heading', 'section', 'panel', 'card', 'row', 'dialog', 'gutter', 'control', 'button', 'bar', 'footer', 'centered', 'nav', 'links', 'indent'],
    },
  },
})

/** Joins class names; when two classes set the same property, the last one wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
