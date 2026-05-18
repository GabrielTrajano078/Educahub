import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalFormShellProps = Readonly<{
  open: boolean;
  title: string;
  onClose: () => void;
  /** Conteúdo antes do dialog (ex.: FeedbackModal). */
  beforeDialog?: ReactNode;
  /** Classes extras no dialog (além de modal-dialog modal-dialog--app-form). */
  dialogClassName?: string;
  /** `drawer`: painel desliza da direita, altura total (ex.: banco de questões). */
  variant?: "centered" | "drawer";
  /** Texto auxiliar abaixo do título (ex.: campos obrigatórios). */
  subtitle?: ReactNode;
  /** Rodapé fixo com ações (Cancelar / Salvar). */
  footer?: ReactNode;
  children: ReactNode;
}>;

/**
 * Carcaça comum dos modais de formulário (prova, questão, turma, aluno):
 * backdrop, bloqueio de scroll, Escape, cabeçalho e corpo rolável.
 */
export function ModalFormShell({
  open,
  title,
  onClose,
  beforeDialog,
  dialogClassName = "",
  variant = "centered",
  subtitle,
  footer,
  children,
}: ModalFormShellProps) {
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

  const isDrawer = variant === "drawer";
  const dialogClasses = [
    "modal-dialog",
    "modal-dialog--app-form",
    isDrawer ? "modal-dialog--drawer" : "",
    dialogClassName.trim(),
  ]
    .filter(Boolean)
    .join(" ");
  const backdropClasses = ["modal-backdrop", isDrawer ? "modal-backdrop--drawer" : ""].filter(Boolean).join(" ");

  return (
    <div
      className={backdropClasses}
      onClick={
        isDrawer
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      {beforeDialog ?? null}
      {isDrawer ? (
        <button
          ref={closeRef}
          type="button"
          className="modal-close modal-close--drawer-external"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
      ) : null}
      <dialog
        open
        className={dialogClasses}
        aria-labelledby={titleId}
        onClick={isDrawer ? (e) => e.stopPropagation() : undefined}
      >
        <header className="modal-header">
          <div className="modal-header-text">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            {subtitle ? <p className="modal-subtitle muted small">{subtitle}</p> : null}
          </div>
          {!isDrawer ? (
            <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
              ×
            </button>
          ) : null}
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
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
