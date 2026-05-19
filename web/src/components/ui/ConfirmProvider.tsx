import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { ConfirmContext } from "./confirm-dialog-context";
import type { ConfirmOptions } from "./confirm-dialog-types";

type Pending = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const titleId = useId();
  const descId = useId();

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next: Pending = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    p?.resolve(result);
  }, []);

  const opts = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts ? (
        <div className="confirm-dialog-backdrop" role="presentation" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={opts.description ? descId : undefined}
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="confirm-dialog__title">
              {opts.title}
            </h2>
            {opts.description ? (
              <p id={descId} className="confirm-dialog__desc muted small">
                {opts.description}
              </p>
            ) : null}
            <div className="confirm-dialog__actions">
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                {opts.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                type="button"
                variant={opts.variant === "danger" ? "dangerFilled" : "primary"}
                onClick={() => close(true)}
              >
                {opts.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
