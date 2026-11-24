import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";
import { applyAppearancePreferences, loadAppearancePreferences } from "@/features/preferences/appearance";

applyAppearancePreferences(loadAppearancePreferences());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouteErrorBoundary>
        <AppRouter />
      </RouteErrorBoundary>
    </AppProviders>
  </StrictMode>,
);
