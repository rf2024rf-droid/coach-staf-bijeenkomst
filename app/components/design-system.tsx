import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailsHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type Tone = "zinc" | "black" | "emerald" | "amber" | "rose" | "sky";

const badgeToneClass: Record<Tone, string> = {
  zinc: "bg-white/[0.07] text-zinc-200 ring-white/10",
  black: "bg-black/45 text-white ring-white/15",
  emerald: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/25",
  amber: "bg-amber-300/15 text-amber-100 ring-amber-200/25",
  rose: "bg-rose-400/15 text-rose-200 ring-rose-300/25",
  sky: "bg-sky-400/15 text-sky-200 ring-sky-300/25",
};

const buttonVariantClass = {
  primary: "bg-white/[0.13] text-white hover:bg-white/[0.19] border-white/20",
  success: "bg-emerald-400 text-black hover:bg-emerald-300 border-emerald-300/60",
  live: "bg-emerald-400 text-black hover:bg-emerald-300 border-emerald-300/60",
  warning: "bg-amber-300 text-black hover:bg-amber-200 border-amber-200/60",
  info: "bg-sky-300 text-black hover:bg-sky-200 border-sky-200/60",
  secondary: "bg-white/[0.065] text-zinc-100 hover:bg-white/[0.11] border-white/15",
  danger: "bg-rose-400/10 text-rose-200 hover:bg-rose-400/18 border-rose-300/25",
  ghost: "bg-transparent text-zinc-300 hover:bg-white/[0.07] border-transparent",
};

const buttonSizeClass = {
  sm: "min-h-9 px-3 py-2 text-sm",
  md: "min-h-10 px-3 py-2.5 text-sm",
  lg: "min-h-12 px-4 py-3 text-base",
  icon: "h-10 w-10 p-0",
};

type ActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
    className?: string;
    external?: boolean;
    href?: string;
    icon?: ReactNode;
    trailingIcon?: ReactNode;
    size?: keyof typeof buttonSizeClass;
    variant?: keyof typeof buttonVariantClass;
  };

export function ActionButton({
  children,
  className,
  disabled,
  external,
  href,
  icon,
  rel,
  size = "md",
  target,
  trailingIcon,
  type = "button",
  variant = "secondary",
  ...props
}: ActionButtonProps) {
  const classes = cn(
    "liquid-button inline-flex items-center justify-center gap-2 rounded-lg border font-black disabled:cursor-not-allowed disabled:opacity-45",
    buttonVariantClass[variant],
    buttonSizeClass[size],
    className
  );
  const content = (
    <>
      {icon}
      {children}
      {trailingIcon}
    </>
  );

  if (href) {
    return (
      <a
        className={cn(classes, disabled && "pointer-events-none opacity-50")}
        href={href}
        rel={external ? rel ?? "noreferrer" : rel}
        target={external ? target ?? "_blank" : target}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button className={classes} disabled={disabled} type={type} {...props}>
      {content}
    </button>
  );
}

export function DangerButton(props: ActionButtonProps) {
  return <ActionButton {...props} variant="danger" />;
}

export function IconButton({ className, ...props }: ActionButtonProps) {
  return <ActionButton {...props} className={cn("shrink-0", className)} size="icon" />;
}

export function Badge({
  children,
  className,
  tone = "zinc",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-black ring-1 ring-inset", badgeToneClass[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({
  children,
  className,
  tone = "zinc",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return <Badge className={className} tone={tone}>{children}</Badge>;
}

export function MetricBadge({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.055] px-2 py-1 text-xs font-semibold text-zinc-300">
      {label}
      <strong className="font-black text-white">{value}</strong>
    </span>
  );
}

export function Panel({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("glass-surface rounded-lg p-3 md:p-5", className)} {...props}>
      {children}
    </section>
  );
}

export function PageHeader({
  actions,
  children,
  className,
  eyebrow,
  metrics,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  eyebrow?: string;
  metrics?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className={cn("glass-surface rounded-lg p-3 md:p-5", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-black uppercase text-emerald-300">{eyebrow}</p> : null}
          <h1 className="mt-1 break-words text-2xl font-black leading-tight md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-300 md:text-base">{subtitle}</p> : null}
          {metrics ? <div className="mt-2 flex flex-wrap gap-1.5">{metrics}</div> : null}
          {children}
        </div>
        {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}

export function SectionHeader({
  actions,
  className,
  eyebrow,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-white/10 pb-3 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-black uppercase text-emerald-300">{eyebrow}</p> : null}
        <h2 className="mt-1 text-lg font-black md:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-semibold leading-6 text-zinc-300">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function CompactRow({
  actions,
  children,
  className,
  leading,
  meta,
  title,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  leading?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}) {
  return (
    <article className={cn("glass-row grid gap-3 border-x-0 border-t-0 p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center", className)}>
      <div className="flex min-w-0 gap-3">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-black leading-snug">{title}</h3>
          {meta ? <div className="mt-2 flex flex-wrap gap-1.5">{meta}</div> : null}
          {children}
        </div>
      </div>
      {actions ? <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">{actions}</div> : null}
    </article>
  );
}

export function OverflowMenu({
  children,
  className,
  label = "Meer acties",
  summary,
  ...props
}: DetailsHTMLAttributes<HTMLDetailsElement> & {
  children: ReactNode;
  label?: string;
  summary?: ReactNode;
}) {
  return (
    <details className={cn("relative", className)} {...props}>
      <summary className="liquid-button grid h-10 min-w-10 cursor-pointer list-none place-items-center rounded-lg border border-white/15 bg-white/[0.065] px-3 text-zinc-100 hover:bg-white/[0.11] [&::-webkit-details-marker]:hidden">
        {summary}
        <span className="sr-only">{label}</span>
      </summary>
      <div className="glass-modal absolute right-0 z-20 mt-2 grid min-w-48 gap-1 rounded-lg p-2">
        {children}
      </div>
    </details>
  );
}

export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cn("grid min-h-48 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-6 text-center", className)}>
      <div>
        {icon ? <div className="mx-auto mb-3 grid h-10 w-10 place-items-center text-zinc-500">{icon}</div> : null}
        <h3 className="text-xl font-black text-white">{title}</h3>
        {description ? <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-zinc-300">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function FieldLabel({ children, className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-bold text-zinc-200", className)} {...props}>
      {children}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "glass-field min-h-11 w-full rounded-lg px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/15",
        className
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "glass-field min-h-28 w-full resize-y rounded-lg px-3 py-2.5 text-sm font-semibold leading-6 outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/15",
        className
      )}
      {...props}
    />
  );
}

export function SelectInput({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "glass-field min-h-11 w-full rounded-lg px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/15",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FormField({
  children,
  className,
  error,
  hint,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {label ? <div className="text-sm font-bold text-zinc-200">{label}</div> : null}
      {children}
      {error ? <p className="text-xs font-bold text-rose-200">{error}</p> : null}
      {!error && hint ? <p className="text-xs font-semibold leading-5 text-zinc-400">{hint}</p> : null}
    </div>
  );
}
