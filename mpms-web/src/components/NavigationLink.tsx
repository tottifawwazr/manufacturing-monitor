import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from '../lib/navigation'

export function NavigationLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank') return
    event.preventDefault()
    navigate(href)
  }

  return <a {...props} href={href} onClick={handleClick}>{children}</a>
}
