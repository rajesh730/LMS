import clsx from "clsx";
import Spinner from "@/components/ui/Spinner";

const VARIANTS = {
  primary: "pravyo-btn-primary bg-[#1f4e79] text-white hover:bg-[#173f63]",
  secondary:
    "pravyo-btn-secondary border border-[#e6eaf7] bg-white text-[#27344a] hover:bg-[#eef4f8]",
  ghost: "border border-transparent bg-transparent text-[#27344a] hover:bg-[#eef4f8]",
  danger: "pravyo-btn-danger bg-[#b42318] text-white hover:bg-[#9f1f14]",
  outline:
    "pravyo-btn-outline border border-[#d9dcf2] bg-white text-[#1f4e79] hover:bg-[#eef4f8]",
};

const SIZES = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  fullWidth = false,
  type = "button",
  disabled = false,
  loading = false,
  asChild = false,
  ...props
}) {
  const Component = asChild ? "span" : "button";
  const isDisabled = disabled || loading;

  return (
    <Component
      type={asChild ? undefined : type}
      className={clsx(
        "pravyo-btn inline-flex items-center justify-center gap-2 font-semibold transition-disabled",
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        fullWidth && "w-full",
        isDisabled && "opacity-50 pointer-events-none",
        className
      )}
      disabled={isDisabled && !asChild}
      aria-disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </Component>
  );
}

export function ButtonLink({
  children,
  variant = "primary",
  size = "md",
  className = "",
  fullWidth = false,
  href,
  disabled = false,
  ...props
}) {
  return (
    <a
      href={href || "#"}
      className={clsx(
        "pravyo-btn inline-flex items-center justify-center gap-2 font-semibold no-underline transition-disabled",
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        fullWidth && "w-full",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {children}
    </a>
  );
}
