import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { FeedbackVariant } from "@/components/ui/FeedbackMessage";

export type FeedbackModalState = Readonly<{
  variant: FeedbackVariant;
  message: string;
}>;

export type FeedbackModalProps = Readonly<{
  feedback: FeedbackModalState | null;
  onClose: () => void;
}>;

export function FeedbackModal({ feedback, onClose }: FeedbackModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!feedback) return;
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
  }, [feedback, onClose]);

  if (!feedback) return null;

  let title = "Sucesso";
  let icon = "✓";
  if (feedback.variant === "warning") title = "Atenção";
  if (feedback.variant === "error") title = "Erro";
  if (feedback.variant === "warning") icon = "!";
  if (feedback.variant === "error") icon = "×";

  return (
    <div className="modal-backdrop">
      <dialog open className={`feedback-modal feedback-modal--${feedback.variant}`} aria-labelledby={titleId}>
        <div className="feedback-modal__top">
          <span className="feedback-modal__icon" aria-hidden="true">
            {icon}
          </span>
        </div>
        <div className="feedback-modal__content">
          <h2 id={titleId} className="feedback-modal__title">
            {title}
          </h2>
          <p className="feedback-modal__message">{feedback.message}</p>
          <div className="row-actions" style={{ marginTop: "1rem", justifyContent: "center" }}>
            <Button type="button" variant="primary" onClick={onClose}>
              OK
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
