import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { RouteErrorBoundary } from "@/components/feedback/RouteErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouteErrorBoundary>
        <AppRouter />
      </RouteErrorBoundary>
    </AppProviders>
  </StrictMode>,
);
