import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/font/google", () => {
  const font = (name: string) => () => ({
    className: `font-${name}`,
    variable: `--font-${name}`,
    style: { fontFamily: name },
  });

  return {
    Inter: font("inter"),
    Fraunces: font("fraunces"),
    Outfit: font("outfit"),
  };
});

vi.mock("mathpix-markdown-it", () => ({
  MathpixMarkdownModel: {
    markdownToHTML: (text: string) => `<span>${text}</span>`,
    getMathpixFontsStyle: () => "",
    getMathpixStyleOnly: () => "",
  },
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
