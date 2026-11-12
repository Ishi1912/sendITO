export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-mist-100">{label}</span>
      )}
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-mist-400">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-status-coral">{error}</span>}
    </label>
  );
}

const baseInput =
  "w-full rounded-lg border border-ink-500 bg-ink-900/60 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-400 outline-none transition-colors focus:border-signal-violet";

// Callers often pass their own `className` (e.g. extra left padding for a
// search icon, or a fixed width for a compact filter). That className must be
// appended to the base theme classes, never swapped in for them - otherwise
// the field silently loses its dark background/text/border and falls back to
// the browser's default (white) control styling.
export function Input({ className = "", ...props }) {
  return <input className={`${baseInput} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }) {
  return <textarea className={`${baseInput} resize-y leading-relaxed ${className}`} {...props} />;
}

export function Select({ children, className = "", ...props }) {
  return (
    <select className={`${baseInput} appearance-none cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  );
}
