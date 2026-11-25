import { render, screen } from "@testing-library/react";
import { ConfigProvider, Modal, Select } from "antd";
import { ConsolePageShell } from "@/app/admin/_components/console-list";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AntdProvider } from "./antd-provider";

describe("AntdProvider", () => {
  afterEach(() => {
    Modal.destroyAll();
    vi.restoreAllMocks();
  });

  it("renders children inside the Ant Design provider", () => {
    render(
      <AntdProvider>
        <button type="button">Ready</button>
      </AntdProvider>
    );

    expect(screen.getByRole("button", { name: "Ready" })).toBeInTheDocument();
  });

  it("lets static confirms render under a themed page without the context warning", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    // A themed ConfigProvider on the page is what makes antd warn about static calls.
    render(
      <AntdProvider>
        <ConfigProvider theme={{ token: { colorPrimary: "#173B30" } }}>
          <span>Themed page</span>
        </ConfigProvider>
      </AntdProvider>
    );

    Modal.confirm({ title: "Acknowledge request?" });

    expect((await screen.findAllByText("Acknowledge request?")).length).toBeGreaterThan(0);
    const warned = consoleError.mock.calls.some((args) =>
      args.some(
        (arg) => typeof arg === "string" && arg.includes("Static function can not consume context")
      )
    );
    expect(warned).toBe(false);
  });

  it("styles selected and hovered dropdown options with light tints, also inside page themes", async () => {
    render(
      <AntdProvider>
        <Select open value="a" options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]} />
        <ConsolePageShell eyebrow="Papers" title="Shell page">
          <Select open value="b" options={[{ value: "b", label: "Bravo" }]} />
        </ConsolePageShell>
      </AntdProvider>
    );
    await screen.findAllByText("Alpha");

    const css = Array.from(document.querySelectorAll("style"))
      .map((node) => node.textContent ?? "")
      .join("\n")
      .toLowerCase();
    const selectedRules = css
      .split("}")
      .filter(
        (rule) =>
          rule.includes("ant-select-item-option-selected:not(.ant-select-item-option-disabled)") &&
          rule.includes("background")
      );

    // One rule per theme in play (app-wide + the shell page theme).
    expect(selectedRules.length).toBeGreaterThanOrEqual(2);
    // Every selected-option background uses the light green, never antd's derived dark tint.
    for (const rule of selectedRules) {
      expect(rule).toContain("#e3eee5");
    }
    expect(css).toContain("#f5f2ec");
  });
});
