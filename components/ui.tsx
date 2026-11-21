"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "kc-btn kc-btn-primary",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? "Memproses..." : children}
    </button>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="kc-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="kc-muted">{hint}</p>}
      {error && <p className="kc-error">{error}</p>}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  actions,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="kc-card p-5">
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="kc-muted mt-0.5">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ variant, children }: { variant: "active" | "blocked"; children: React.ReactNode }) {
  const cls = variant === "active" ? "kc-badge kc-badge-active" : "kc-badge kc-badge-blocked";
  return <span className={cls}>{children}</span>;
}
