import React, { createContext, useCallback, useContext, useState } from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  clickOutsideToCancel?: boolean;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx.confirm;
}

function ScrewGlyph({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`relative inline-flex ${
        small ? "h-3 w-3 border" : "h-4 w-4 border-2"
      } items-center justify-center rounded-full border-[#2a2f35] bg-[#0d1116] shadow-inner`}
      aria-hidden
    >
      <span className="absolute block h-px w-3 -rotate-45 bg-[#B9B1A3]" />
      <span className="absolute block h-px w-3 rotate-45 bg-[#B9B1A3]" />
    </span>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts({ clickOutsideToCancel: true, ...o });
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const close = (v: boolean) => {
    setOpen(false);
    resolver?.(v);
    setResolver(null);
  };

  const confirmButtonClass = (danger?: boolean) =>
    danger
      ? "rounded-lg border border-red-500/60 bg-red-500/15 px-5 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
      : "rounded-lg border border-[#E6DFD3]/60 bg-[#E6DFD3] px-5 py-2 text-sm font-semibold text-[#0e1214] transition hover:-translate-y-px hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6DFD3]/40";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {open && opts && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#050709]/80 backdrop-blur-sm"
            onClick={() => (opts.clickOutsideToCancel ?? true) && close(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-[#2a2f35] bg-[#11161b] text-[#E6DFD3] shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
            <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#FFEFD0_0%,transparent_55%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.04)_3px,rgba(255,255,255,0.04)_4px)]" />
            </div>

            <div className="relative flex flex-col gap-6 p-6 sm:p-8">
              <header className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.35em] text-[#B9B1A3]">
                <div className="flex items-center gap-2">
                  <ScrewGlyph />
                  <span>{opts.title ?? "SYSTEM PROMPT"}</span>
                </div>
                <div className="flex items-center gap-1 text-[#7f878f]">
                  <span className="inline-block h-2 w-2 rounded-sm bg-yellow-400" />
                  <span className="inline-block h-2 w-2 rounded-sm bg-[#E6DFD3]" />
                  <span className="inline-block h-2 w-2 rounded-sm bg-[#B9B1A3]" />
                </div>
              </header>

              <div className="rounded-2xl border border-[#2a2f35] bg-[#0f1419] p-5 text-sm leading-relaxed text-[#E6DFD3]/90 shadow-inner">
                <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#7f878f]">
                  <ScrewGlyph small />
                  <span>Message</span>
                </div>
                <p className="whitespace-pre-wrap">{opts.message}</p>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => close(false)}
                  className="rounded-lg border border-[#3a3f45] bg-[#0f1419] px-5 py-2 text-sm font-medium text-[#E6DFD3] transition hover:border-[#E6DFD3]/40 hover:bg-[#151a1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6DFD3]/20"
                >
                  {opts.cancelText ?? "취소"}
                </button>
                <button
                  onClick={() => close(true)}
                  className={confirmButtonClass(opts.danger)}
                >
                  {opts.confirmText ?? "확인"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
