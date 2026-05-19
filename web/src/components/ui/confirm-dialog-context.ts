import { createContext } from "react";
import type { ConfirmOptions } from "./confirm-dialog-types";

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);
