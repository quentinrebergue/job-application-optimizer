import { cn } from '@/lib/cn'

interface Props extends React.ComponentProps<'h2'> {
  /** The heading element: the one that fits the outline of the page. */
  as?: 'h2' | 'h3' | 'h4'
  /** `page`: a section of a page (Profile, Library). `sub`: a part inside a panel or a card (Template, Password). */
  level?: 'page' | 'sub'
}

/** The title of a section: one size and weight per level, so the same kind of title looks the same everywhere. */
export function SectionTitle({ as: Tag = 'h2', level = 'sub', className, ...props }: Props) {
  return <Tag className={cn(level === 'page' ? 'text-section' : 'text-subsection', className)} {...props} />
}
