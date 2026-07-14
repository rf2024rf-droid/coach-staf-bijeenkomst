import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailsHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type Tone = "zinc" | "black" | "emerald" | "amber" | "rose" | "sky";

const badgeToneClass: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  black: "bg-zinc-950 text-white ring-zinc-950",
  emerald: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  rose: "bg-rose-100 text-rose-900 ring-rose-200",
  sky: "bg-sky-100 text-sky-900 ring-sky-200",
};

const buttonVariantClass = {
  primary: "bg-zinc-950 text-white hover:bg-zinc-800 border-zinc-950",
  success: "bg-emerald-800 text-white hover:bg-emerald-900 border-emerald-800",
  live: "bg-emerald-800 text-white hover:bg-emerald-900 border-emerald-800",
  warning: "bg-amber-700 text-white hover:bg-amber-800 border-amber-700",
  info: "bg-sky-800 text-white hover:bg-sky-900 border-sky-800",
  secondary: "bg-white text-zinc-800 hover:bg-zinc-50 border-zinc-300",
  danger: "bg-rose-50 text-rose-800 hover:bg-rose-100 border-rose-200",
  ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100 border-transparent",
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
    "inline-flex items-center justify-center gap-2 rounded-lg border font-black transition disabled:cursor-not-allowed disabled:opacity-50",
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
    <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-black ring-1", badgeToneClass[tone], className)}>
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
    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-600">
      {label}
      <strong className="font-black text-zinc-950">{value}</strong>
    </span>
  );
}

export function Panel({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-lg border border-zinc-300 bg-white p-3 shadow-sm md:p-5", className)} {...props}>
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
    <header className={cn("rounded-lg border border-zinc-300 bg-white p-3 shadow-sm md:p-5", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-black uppercase text-emerald-800">{eyebrow}</p> : null}
          <h1 className="mt-1 break-words text-2xl font-black leading-tight md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-600 md:text-base">{subtitle}</p> : null}
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
    <div className={cn("flex flex-col gap-3 border-b border-zinc-200 pb-3 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-black uppercase text-emerald-800">{eyebrow}</p> : null}
        <h2 className="mt-1 text-lg font-black md:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-semibold leading-6 text-zinc-600">{subtitle}</p> : null}
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
    <article className={cn("grid gap-3 border-b border-zinc-200 bg-white p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center", className)}>
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
      <summary className="grid h-10 min-w-10 cursor-pointer list-none place-items-center rounded-lg border border-zinc-300 bg-white px-3 text-zinc-800 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        {summary}
        <span className="sr-only">{label}</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid min-w-48 gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl">
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
    <div className={cn("grid min-h-48 place-items-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center", className)}>
      <div>
        {icon ? <div className="mx-auto mb-3 grid h-10 w-10 place-items-center text-zinc-400">{icon}</div> : null}
        <h3 className="text-xl font-black text-zinc-950">{title}</h3>
        {description ? <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-zinc-600">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
