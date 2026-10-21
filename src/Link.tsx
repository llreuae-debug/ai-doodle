import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from './router';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
}

/** An <a> that navigates in-app, but still opens in a new tab with a modifier key. */
export function Link({ to, onClick, ...rest }: Props) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
