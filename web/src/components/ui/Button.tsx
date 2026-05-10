import {
  cloneElement,
  type AriaAttributes,
  type ButtonHTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

type AsChildElementProps = { className?: string; children?: ReactNode } & AriaAttributes;

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerFilled";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Quando true, aplica classes ao único filho (ex.: `<Link>`). */
  asChild?: boolean;
};

function classesForVariant(variant: ButtonVariant): string {
  switch (variant) {
    case "ghost":
      return "ghost";
    case "danger":
      return "btn-danger-text";
    case "dangerFilled":
      return "primary primary--danger";
    case "secondary":
      return "button-secondary";
    case "primary":
    default:
      return "primary";
  }
}

function classesForSize(size: ButtonSize): string {
  if (size === "sm") return "btn-compact";
  if (size === "lg") return "button-lg";
  return "";
}

function mergeClasses(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Botão padronizado; use `asChild` para estilizar um `Link` como botão.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  children,
  asChild,
  type = "button",
  ...rest
}: ButtonProps) {
  const ui = mergeClasses(classesForVariant(variant), classesForSize(size), className);
  const isDisabled = Boolean(disabled || loading);

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<AsChildElementProps>;
    return cloneElement(child, {
      className: mergeClasses(ui, child.props.className),
      "aria-busy": loading ? true : undefined,
      children: loading ? "…" : child.props.children,
    });
  }

  return (
    <button {...rest} type={type} className={mergeClasses(ui, className)} disabled={isDisabled}>
      {loading ? "…" : children}
    </button>
  );
}
