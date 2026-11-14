import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { FieldBundle } from "../data/types";
import { DEMO_FIELD_ID } from "../data/types";
import { loadBundle } from "../data/validate";
import { useT } from "../i18n";
import { withMoney } from "../money/money";
import { useAppState } from "../state/useAppState";

type BundleState =
  | { status: "loading"; bundle: null; retry: () => void }
  | { status: "error"; bundle: null; retry: () => void }
  | { status: "ready"; bundle: FieldBundle; retry: () => void };

const BundleContext = createContext<BundleState | null>(null);

/**
 * Loads the demo field's bundle once and shares it with every screen.
 * The farmer's own prices and support (`state.money`, `state.extras`) are applied here, once, so every screen
 * (and the step bar's best-fit link) sees the same income figures and ranking.
 */
export function BundleProvider({ children }: { children: ReactNode }) {
  const [{ money, extras }] = useAppState();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ bundle: FieldBundle | null; failed: boolean }>({
    bundle: null,
    failed: false,
  });
  const retry = useCallback(() => {
    setResult({ bundle: null, failed: false });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let live = true;
    loadBundle(DEMO_FIELD_ID).then(
      (bundle) => live && setResult({ bundle, failed: false }),
      () => live && setResult({ bundle: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const priced = useMemo(() => (result.bundle ? withMoney(result.bundle, money, extras) : null), [result.bundle, money, extras]);

  const value: BundleState = priced
    ? { status: "ready", bundle: priced, retry }
    : result.failed
      ? { status: "error", bundle: null, retry }
      : { status: "loading", bundle: null, retry };

  return <BundleContext.Provider value={value}>{children}</BundleContext.Provider>;
}

export function useBundle(): BundleState {
  const value = useContext(BundleContext);
  if (!value) throw new Error("useBundle outside BundleProvider");
  return value;
}

/** Renders its children only once the bundle is there; otherwise one plain line (and a retry). */
export function BundleGate({ children }: { children: (bundle: FieldBundle) => ReactNode }) {
  const state = useBundle();
  const t = useT();
  if (state.status === "ready") return <>{children(state.bundle)}</>;
  if (state.status === "loading") {
    return (
      <p className="p-4 text-body text-ink-soft" role="status">
        {t("common.loading")}
      </p>
    );
  }
  return (
    <div className="p-4 flex flex-col gap-3 items-start" role="alert">
      <p className="text-big">{t("load.error")}</p>
      <button type="button" onClick={state.retry} className="tc-tap px-5 rounded-box bg-primary text-on-primary font-bold">
        {t("common.retry")}
      </button>
    </div>
  );
}
