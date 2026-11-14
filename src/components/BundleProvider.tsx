import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { FieldBundle } from "../data/types";
import { DEMO_FIELD_ID } from "../data/types";
import { loadBasin } from "../data/basin";
import type { Basin } from "../data/basin";
import { loadBundle } from "../data/validate";
import { isUsableRing } from "../geo/geometry";
import { translate, useT } from "../i18n";
import { withMoney } from "../money/money";
import { useAppState, useTo } from "../state/useAppState";

type Status =
  | { status: "loading"; bundle: null }
  | { status: "error"; bundle: null }
  /** A drawn field outside the basin's farmland: no bundle, live weather instead. */
  | { status: "outside"; bundle: null }
  | { status: "ready"; bundle: FieldBundle };

/** The demo field's own bundle: its outline shows on Find field whatever field is chosen. */
export type DemoState = ({ status: "loading" | "error"; bundle: null } | { status: "ready"; bundle: FieldBundle }) & { retry: () => void };

/** The bundle of the field in the link: the demo's, or one built for a drawn outline. */
export type BundleState = Status & { retry: () => void; drawn: boolean; demo: DemoState };

const BundleContext = createContext<BundleState | null>(null);

/**
 * Loads the demo field's bundle once and shares it with every screen. With a drawn outline in the link it also
 * loads the basin's 1 km data (once per session) and builds that field's bundle from it.
 * The farmer's own prices and support (`state.money`, `state.extras`) are applied here, once, so every screen
 * (and the step bar's best-fit link) sees the same income figures and ranking.
 */
export function BundleProvider({ children }: { children: ReactNode }) {
  const [{ money, extras, fieldId, outline, lang }] = useAppState();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ bundle: FieldBundle | null; failed: boolean }>({
    bundle: null,
    failed: false,
  });
  const retryDemo = useCallback(() => {
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

  // A drawn field: the basin data, loaded only now.
  const drawn = fieldId !== DEMO_FIELD_ID && outline !== null && isUsableRing(outline);
  const [basinAttempt, setBasinAttempt] = useState(0);
  const [basin, setBasin] = useState<{ basin: Basin | null; failed: boolean }>({ basin: null, failed: false });
  const retryBasin = useCallback(() => {
    setBasin({ basin: null, failed: false });
    setBasinAttempt((n) => n + 1);
  }, []);
  useEffect(() => {
    if (!drawn || basin.basin) return;
    let live = true;
    loadBasin().then(
      (b) => live && setBasin({ basin: b, failed: false }),
      () => live && setBasin({ basin: null, failed: true }),
    );
    return () => {
      live = false;
    };
    // `basin.basin` is left out: once loaded it never changes.
  }, [drawn, basinAttempt]);

  const ringKey = outline ? outline.map((p) => p.join(",")).join(";") : "";
  const built = useMemo(
    () => (drawn && outline && basin.basin && result.bundle ? basin.basin.build(outline, result.bundle, translate(lang, "field.yours")) : undefined),
    // `ringKey` stands for the outline's content.
    [drawn, ringKey, basin.basin, result.bundle, lang],
  );

  const priced = useMemo(() => (result.bundle ? withMoney(result.bundle, money, extras) : null), [result.bundle, money, extras]);
  const pricedDrawn = useMemo(() => (built ? withMoney(built.bundle, money, extras) : null), [built, money, extras]);

  const demo: DemoState = result.bundle
    ? { status: "ready", bundle: result.bundle, retry: retryDemo }
    : { status: result.failed ? "error" : "loading", bundle: null, retry: retryDemo };

  let value: BundleState;
  if (!drawn) {
    value = priced
      ? { status: "ready", bundle: priced, retry: retryDemo, drawn, demo }
      : { status: result.failed ? "error" : "loading", bundle: null, retry: retryDemo, drawn, demo };
  } else if (result.failed) value = { status: "error", bundle: null, retry: retryDemo, drawn, demo };
  else if (basin.failed) value = { status: "error", bundle: null, retry: retryBasin, drawn, demo };
  else if (built === null) value = { status: "outside", bundle: null, retry: retryBasin, drawn, demo };
  else if (pricedDrawn) value = { status: "ready", bundle: pricedDrawn, retry: retryBasin, drawn, demo };
  else value = { status: "loading", bundle: null, retry: retryBasin, drawn, demo };

  return <BundleContext.Provider value={value}>{children}</BundleContext.Provider>;
}

export function useBundle(): BundleState {
  const value = useContext(BundleContext);
  if (!value) throw new Error("useBundle outside BundleProvider");
  return value;
}

/** The demo field's bundle, whichever field the link holds. */
export function useDemoBundle(): DemoState {
  return useBundle().demo;
}

/**
 * Renders its children only once the bundle is there; otherwise one plain line (and a retry).
 * A drawn field outside the basin's farmland goes to live weather, unless `outside` says what to show instead.
 */
export function BundleGate({ children, outside }: { children: (bundle: FieldBundle) => ReactNode; outside?: ReactNode }) {
  const state = useBundle();
  const t = useT();
  const to = useTo();
  if (state.status === "ready") return <>{children(state.bundle)}</>;
  if (state.status === "outside") return outside !== undefined ? <>{outside}</> : <Navigate to={to("/area")} replace />;
  if (state.status === "loading") {
    return (
      <p className="p-4 text-body text-ink-soft" role="status">
        {t(state.drawn ? "basin.loading" : "common.loading")}
      </p>
    );
  }
  return (
    <div className="p-4 flex flex-col gap-3 items-start" role="alert">
      <p className="text-big">{t(state.drawn && state.demo.status !== "error" ? "basin.error" : "load.error")}</p>
      <button type="button" onClick={state.retry} className="tc-tap px-5 rounded-box bg-primary text-on-primary font-bold">
        {t("common.retry")}
      </button>
    </div>
  );
}

/** The line every screen with a drawn field's figures shows once: what area the numbers are for. */
export function AreaNote({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  if (!bundle.field.basin) return null;
  return (
    <p className="px-4 pt-2 text-small font-bold text-ink-soft" data-testid="area-note">
      {t("basin.note")}
    </p>
  );
}
