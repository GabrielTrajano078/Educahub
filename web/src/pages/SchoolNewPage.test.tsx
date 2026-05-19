import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSchool } from "@/api/schools";
import { searchMunicipiosByName } from "@/api/ibge";
import { useAuth } from "@/auth/useAuth";
import { renderPage } from "@/test/render-page";
import { SchoolNewPage } from "./SchoolNewPage";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/api/schools", () => ({
  createSchool: vi.fn(),
}));

vi.mock("@/api/ibge", () => ({
  fetchMunicipioByIbgeCode: vi.fn(),
  searchMunicipiosByName: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedCreateSchool = vi.mocked(createSchool);
const mockedSearchMunicipiosByName = vi.mocked(searchMunicipiosByName);

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

describe("SchoolNewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSearchMunicipiosByName.mockResolvedValue([]);
  });

  it("não renderiza quando usuário não está autenticado", () => {
    mockedUseAuth.mockReturnValue({
      state: { status: "anonymous" },
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { container } = renderPage(<SchoolNewPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("cadastra escola e navega após confirmação de sucesso", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedCreateSchool.mockResolvedValueOnce({ id: "school-1" });
    navigate.mockReset();

    renderPage(<SchoolNewPage />);

    fireEvent.change(screen.getByLabelText("Nome da escola"), { target: { value: "EMEF Centro" } });
    fireEvent.change(screen.getByLabelText("Cidade (opcional)"), { target: { value: "Fortaleza" } });
    fireEvent.change(screen.getByPlaceholderText("Ex.: 2304400"), { target: { value: "2304400" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar escola" }));

    await waitFor(() => {
      expect(mockedCreateSchool).toHaveBeenCalledWith({
        name: "EMEF Centro",
        city: "Fortaleza",
        municipalityCode: "2304400",
      });
    });

    fireEvent.click(await screen.findByRole("button", { name: "OK" }));
    expect(navigate).toHaveBeenCalledWith("/escolas");
  });

  it("exibe aviso quando nome é curto", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);

    renderPage(<SchoolNewPage />);

    fireEvent.change(screen.getByLabelText("Nome da escola"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar escola" }));

    expect(await screen.findByText("Informe o nome da escola (mínimo 2 caracteres).")).toBeInTheDocument();
    expect(mockedCreateSchool).not.toHaveBeenCalled();
  });

  it("gestor vê município vinculado e não envia IBGE no corpo", async () => {
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
    mockedCreateSchool.mockResolvedValueOnce({ id: "school-2" });

    renderPage(<SchoolNewPage />);

    expect(screen.getByText(/Município do cadastro:/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ex.: 2304400")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nome da escola"), { target: { value: "EMEF Norte" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar escola" }));

    await waitFor(() => {
      expect(mockedCreateSchool).toHaveBeenCalledWith({ name: "EMEF Norte" });
    });
  });
});
