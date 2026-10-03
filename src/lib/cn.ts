import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge knows Tailwind's default scale; our own tokens from globals.css
// must be declared so that, e.g., `rounded-control` and `rounded-none` conflict.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control'],
      shadow: ['hard'],
      spacing: ['press'],
    },
  },
})

/** Joins class names; when two classes set the same property, the last one wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
