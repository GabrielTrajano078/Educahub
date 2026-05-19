import { useContext } from "react";
import { ConfirmContext } from "./confirm-dialog-context";
import type { ConfirmOptions } from "./confirm-dialog-types";

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider.");
  }
  return fn;
}
