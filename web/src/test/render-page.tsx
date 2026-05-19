import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

type RenderPageOptions = RenderOptions & {
  initialEntries?: string[];
};

export function renderPage(ui: ReactElement, options?: RenderPageOptions) {
  const { initialEntries = ["/"], ...renderOptions } = options ?? {};
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <ConfirmProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </ConfirmProvider>
    </QueryClientProvider>,
    renderOptions,
  );
}
