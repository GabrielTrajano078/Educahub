import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalFormShellProps = Readonly<{
  open: boolean;
  title: string;
  onClose: () => void;
  /** Conteúdo antes do dialog (ex.: FeedbackModal). */
  beforeDialog?: ReactNode;
  /** Classes extras no dialog (além de modal-dialog modal-dialog--app-form). */
  dialogClassName?: string;
  children: ReactNode;
}>;

/**
 * Carcaça comum dos modais de formulário (prova, questão, turma, aluno):
 * backdrop, bloqueio de scroll, Escape, cabeçalho e corpo rolável.
 */
export function ModalFormShell({ open, title, onClose, beforeDialog, dialogClassName = "", children }: ModalFormShellProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      globalThis.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const dialogClasses = ["modal-dialog", "modal-dialog--app-form", dialogClassName.trim()].filter(Boolean).join(" ");

  return (
    <div className="modal-backdrop">
      {beforeDialog ?? null}
      <dialog open className={dialogClasses} aria-labelledby={titleId}>
        <header className="modal-header">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </dialog>
    </div>
  );
}

type ModalFormPanelProps = Readonly<{
  children: ReactNode;
  /** Texto ou bloco introdutório acima do conteúdo principal (ex.: dica em muted). */
  intro?: ReactNode;
  className?: string;
}>;

/** Caixa com borda/“vidro” igual às seções da Nova prova (`section.panel` dentro do modal). */
export function ModalFormPanel({ intro, children, className = "" }: ModalFormPanelProps) {
  return (
    <section className={`panel modal-form-panel${className ? ` ${className}` : ""}`}>
      {intro}
      {children}
    </section>
  );
}
