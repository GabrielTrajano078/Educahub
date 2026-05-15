import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { bootstrapAdmin } from "@/api/auth";
import { ApiError } from "@/lib/api-client";
import { renderPage } from "@/test/render-page";
import { BootstrapPage } from "./BootstrapPage";

vi.mock("@/api/auth", () => ({
  bootstrapAdmin: vi.fn(),
}));

const mockedBootstrapAdmin = vi.mocked(bootstrapAdmin);

describe("BootstrapPage", () => {
  it("formulario usa noValidate e campos sem atributo required", () => {
    mockedBootstrapAdmin.mockResolvedValue({ id: "507f1f77bcf86cd799439011" });
    const { container } = renderPage(<BootstrapPage />);

    const form = container.querySelector("form.login-form");
    expect(form).toBeTruthy();
    expect((form as HTMLFormElement).noValidate).toBe(true);

    expect(screen.getByLabelText("Nome completo")).not.toHaveAttribute("required");
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("required");
    expect(screen.getByLabelText("Senha")).not.toHaveAttribute("required");
    expect(screen.getByLabelText("Senha")).not.toHaveAttribute("minLength");
  });

  it("exibe mensagem do Zod no role=alert para nome muito curto", async () => {
    mockedBootstrapAdmin.mockResolvedValue({ id: "x" });
    renderPage(<BootstrapPage />);

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar administrador" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Nome muito curto.");
    expect(mockedBootstrapAdmin).not.toHaveBeenCalled();
  });

  it("exibe mensagem do Zod no role=alert para e-mail invalido", async () => {
    mockedBootstrapAdmin.mockResolvedValue({ id: "x" });
    renderPage(<BootstrapPage />);

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Admin Teste" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "nao-email" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar administrador" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("E-mail inválido.");
    expect(mockedBootstrapAdmin).not.toHaveBeenCalled();
  });

  it("exibe mensagem do Zod no role=alert para senha curta", async () => {
    mockedBootstrapAdmin.mockResolvedValue({ id: "x" });
    renderPage(<BootstrapPage />);

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Admin Teste" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar administrador" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Mínimo de 6 caracteres.");
    expect(mockedBootstrapAdmin).not.toHaveBeenCalled();
  });

  it("exibe mensagem da API no role=alert quando bootstrap falha com ApiError", async () => {
    mockedBootstrapAdmin.mockRejectedValue(new ApiError(409, "Bootstrap indisponivel: usuarios ja existem.", {}));
    renderPage(<BootstrapPage />);

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Admin Teste" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "novo@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha12" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar administrador" }));

    await waitFor(() => {
      expect(mockedBootstrapAdmin).toHaveBeenCalled();
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Bootstrap indisponivel: usuarios ja existem.");
  });
});
