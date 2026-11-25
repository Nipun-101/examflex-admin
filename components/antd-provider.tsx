"use client";

import "@ant-design/v5-patch-for-react-19";
import type { ReactNode } from "react";
import { ConfigProvider, type ThemeConfig } from "antd";

/**
 * App-wide antd theme in the admin console colours, so default/outlined buttons, links,
 * switches, checkboxes, pagination and focus states stop falling back to antd blue.
 * Solid primary buttons are also pinned in globals.css (Tailwind's reset clears their fill).
 */
export const ADMIN_ANTD_THEME: ThemeConfig = {
  token: {
    colorPrimary: "#173B30",
    colorPrimaryHover: "#557C3E",
    colorPrimaryActive: "#4A6E35",
    colorLink: "#2F6B4F",
    colorLinkHover: "#557C3E",
    colorLinkActive: "#173B30",
    fontFamily: "inherit",
  },
  components: {
    Button: {
      // Outlined/default buttons: ink text, and a lime-green border + text on hover.
      defaultColor: "#173B30",
      defaultHoverColor: "#557C3E",
      defaultHoverBorderColor: "#557C3E",
      defaultActiveColor: "#4A6E35",
      defaultActiveBorderColor: "#4A6E35",
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
    },
  },
};

/**
 * Give antd's static APIs (`Modal.confirm`, `message.*`, `notification.*`) a provider of their
 * own. They render outside the React tree, and without `holderRender` antd warns in development
 * ("Static function can not consume context like dynamic theme") once any ConfigProvider on the
 * page sets a `theme`.
 */
export function renderStaticHolder(children: ReactNode) {
  return (
    <ConfigProvider theme={ADMIN_ANTD_THEME} select={{ showSearch: true }}>
      {children}
    </ConfigProvider>
  );
}

ConfigProvider.config({ holderRender: renderStaticHolder });

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={ADMIN_ANTD_THEME} select={{ showSearch: true }}>
      {children}
    </ConfigProvider>
  );
}
