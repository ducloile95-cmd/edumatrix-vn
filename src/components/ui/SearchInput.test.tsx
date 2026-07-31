// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterToolbar";

describe("data list filter controls", () => {
  it("clears a populated search field", () => {
    const onChange = vi.fn();
    render(<SearchInput value="Lớp A" onChange={onChange} placeholder="Tìm lớp" />);

    fireEvent.click(screen.getByRole("button", { name: "Xóa tìm lớp" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("exposes a labelled native status dropdown", () => {
    const onChange = vi.fn();
    render(
      <FilterSelect
        id="status-filter"
        label="Trạng thái"
        value="all"
        options={[{ value: "all", label: "Tất cả" }, { value: "active", label: "Đang hoạt động" }]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Trạng thái" }), { target: { value: "active" } });
    expect(onChange).toHaveBeenCalledWith("active");
  });
});
