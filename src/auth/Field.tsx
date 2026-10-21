import type { ReactNode } from 'react';

interface Props {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

/** Label, control and an inline error. Give the control aria-describedby={`${id}-error`} when invalid. */
export function Field({ id, label, error, children }: Props) {
  return (
    <div className="field-group">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
