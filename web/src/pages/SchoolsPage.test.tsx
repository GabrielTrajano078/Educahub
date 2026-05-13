import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { listSchools } from "@/api/schools";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { renderPage } from "@/test/render-page";
import { SchoolsPage } from "./SchoolsPage";

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/api/schools", () => ({
  listSchools: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedListSchools = vi.mocked(listSchools);

const adminAuth = {
  state: {
    status: "authenticated" as const,
    user: {
      id: "admin-1",
      fullName: "Admin",
      email: "admin@example.com",
      role: "admin" as const,
      schoolId: null,
      municipalityCode: null,
      classroomIds: [],
    },
  },
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

describe("SchoolsPage", () => {
  it("não renderiza quando usuário não está autenticado", () => {
    mockedUseAuth.mockReturnValue({
      state: { status: "anonymous" },
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { container } = renderPage(<SchoolsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista escolas e link de resumo", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListSchools.mockResolvedValueOnce([
      {
        _id: "507f1f77bcf86cd799439011",
        name: "EMEF Centro",
        city: "Fortaleza",
        municipalityCode: "2304400",
      },
    ]);

    renderPage(<SchoolsPage />);

    expect(await screen.findByRole("heading", { name: "Escolas" })).toBeInTheDocument();
    expect(await screen.findByText("EMEF Centro")).toBeInTheDocument();
    expect(screen.getByText("Fortaleza")).toBeInTheDocument();
    expect(screen.getByText("2304400")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resumo" })).toHaveAttribute(
      "href",
      "/escola/resumo?schoolId=507f1f77bcf86cd799439011",
    );
  });

  it("mostra estado vazio quando não há escolas", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListSchools.mockResolvedValueOnce([]);

    renderPage(<SchoolsPage />);

    expect(await screen.findByText("Nenhuma escola encontrada")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Nova escola" })[0]).toHaveAttribute("href", "/escolas/nova");
  });

  it("mostra erro da API", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListSchools.mockRejectedValueOnce(new ApiError(403, "Acesso negado.", null));

    renderPage(<SchoolsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso negado.");
  });

  it("orienta gestor sobre município no cadastro", async () => {
    mockedUseAuth.mockReturnValue({
      ...adminAuth,
      state: {
        status: "authenticated",
        user: {
          ...adminAuth.state.user,
          role: "gestor",
          municipalityCode: "2304400",
        },
      },
    });
    mockedListSchools.mockResolvedValueOnce([]);

    renderPage(<SchoolsPage />);

    expect(await screen.findByText(/Novas escolas ficam no seu município/i)).toBeInTheDocument();
  });

  it("refaz busca ao alterar filtro de descrição", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListSchools.mockResolvedValue([]);

    renderPage(<SchoolsPage />);

    await waitFor(() => {
      expect(mockedListSchools).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText("Nome da escola"), {
      target: { value: "Centro" },
    });

    await waitFor(() => {
      expect(mockedListSchools).toHaveBeenCalledWith({ nameContains: "Centro" });
    });
  });
});
