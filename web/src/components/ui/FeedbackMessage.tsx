import type { ReactNode } from "react";

export type FeedbackVariant = "success" | "warning" | "error";

export type FeedbackMessageProps = Readonly<{
  variant: FeedbackVariant;
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
}>;

export function FeedbackMessage({ variant, children, className, role }: FeedbackMessageProps) {
  let baseClass = "success";
  if (variant === "error") baseClass = "error";
  if (variant === "warning") baseClass = "warning";
  const finalRole = role ?? (variant === "error" ? "alert" : "status");
  const classes = className ? `${baseClass} ${className}` : baseClass;
  return (
    <p className={classes} role={finalRole}>
      {children}
    </p>
  );
}
