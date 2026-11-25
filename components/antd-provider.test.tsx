import { render, screen } from "@testing-library/react";
import { ConfigProvider, Modal } from "antd";
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
});
