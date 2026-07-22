import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  failed: boolean;
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route rendering failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
          <section className="w-full max-w-md rounded-card border border-danger-100 bg-white p-6 text-center shadow-[var(--shadow-2)]">
            <h1 className="text-xl">Không thể hiển thị trang</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Nội dung có thể chưa tải đầy đủ. Vui lòng tải lại trang để tiếp tục.
            </p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Tải lại trang
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
