import { forwardRef, type InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

/**
 * A labeled input with an inline validation message. Wrapped in forwardRef
 * because React Hook Form's `register(name)` returns a `ref` callback that
 * must reach the real <input> DOM node — without forwardRef, a plain
 * function component silently drops any `ref` passed to it (React can't
 * know what to attach it to), and the field would never actually register
 * with the form.
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, name, error, ...inputProps },
  ref,
) {
  const errorId = `${name}-error`;

  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p className="form-field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
