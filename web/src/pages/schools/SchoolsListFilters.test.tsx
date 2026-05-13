import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SchoolsListFilters } from "./SchoolsListFilters";

describe("SchoolsListFilters", () => {
  it("repassa alterações do filtro de descrição", () => {
    const onNameContainsChange = vi.fn();

    render(<SchoolsListFilters nameContains="EMEF" onNameContainsChange={onNameContainsChange} />);

    fireEvent.change(screen.getByPlaceholderText("Nome da escola"), {
      target: { value: "EMEF Centro" },
    });

    expect(onNameContainsChange).toHaveBeenCalledWith("EMEF Centro");
  });
});
