import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from './router';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
  href?: string;
}

/** An <a> that navigates in-app, supporting either `to` or `href`, and preserving modifier keys for new tabs. */
export function Link({ to, href, onClick, ...rest }: Props) {
  const dest = to ?? href ?? '/';
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (dest.startsWith('http://') || dest.startsWith('https://') || dest.startsWith('mailto:') || dest.startsWith('tel:') || dest.startsWith('#')) return;
    e.preventDefault();
    navigate(dest);
  };
  return <a href={dest} onClick={handle} {...rest} />;
}
