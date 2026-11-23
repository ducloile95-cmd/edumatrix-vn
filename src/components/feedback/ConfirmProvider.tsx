import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from "@/components/feedback/confirmContext";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(false);
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={open} title={options?.title ?? ""} description={options?.message} size="sm" onClose={() => settle(false)} bodyClassName="bg-neutral-0 px-4 py-3 sm:px-5">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => settle(false)}>{options?.cancelLabel ?? "Hủy"}</Button>
          <Button variant={options?.tone === "primary" ? "primary" : "danger"} onClick={() => settle(true)}>
            {options?.confirmLabel ?? "Xác nhận"}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
