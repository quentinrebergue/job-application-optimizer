import { logout } from '@/app/actions/auth'
import { buttonClasses } from '@/components/ui/Button'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
        Log out
      </button>
    </form>
  )
}
