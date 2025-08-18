"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "../Button";

type ConfirmOptions = {
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
};

type AlertOptions = {
  title?: string;
  description?: React.ReactNode;
  okText?: string;
};

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

export function useDialog(): DialogContextValue {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = React.useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  const [alertState, setAlertState] = React.useState<
    (AlertOptions & { resolve: () => void }) | null
  >(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        title: options.title || "Confirm",
        description: options.description || null,
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        variant: options.variant || "default",
        resolve,
      });
    });
  }, []);

  const alert = React.useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({
        title: options.title || "Notice",
        description: options.description || null,
        okText: options.okText || "OK",
        resolve,
      });
    });
  }, []);

  const ctx: DialogContextValue = React.useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <DialogContext.Provider value={ctx}>
      {children}

      {/* Confirm Dialog */}
      <Modal isOpen={!!confirmState} onClose={() => { if (confirmState) { confirmState.resolve(false); } setConfirmState(null); }} title={confirmState?.title || ""} size="sm">
        <div className="space-y-4">
          {confirmState?.description && (
            <div className="text-sm text-[color:var(--text)] whitespace-pre-wrap break-words">{confirmState.description}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => { if (confirmState) { confirmState.resolve(false); } setConfirmState(null); }}
            >
              {confirmState?.cancelText || "Cancel"}
            </Button>
            <Button
              className={confirmState?.variant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              onClick={() => { if (confirmState) { confirmState.resolve(true); } setConfirmState(null); }}
            >
              {confirmState?.confirmText || "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Alert Dialog */}
      <Modal isOpen={!!alertState} onClose={() => { if (alertState) { alertState.resolve(); } setAlertState(null); }} title={alertState?.title || ""} size="sm">
        <div className="space-y-4">
          {alertState?.description && (
            <div className="text-sm text-[color:var(--text)] whitespace-pre-wrap break-words">{alertState.description}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => { if (alertState) { alertState.resolve(); } setAlertState(null); }}
            >
              {alertState?.okText || "OK"}
            </Button>
          </div>
        </div>
      </Modal>
    </DialogContext.Provider>
  );
}


