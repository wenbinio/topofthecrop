import { Suspense, lazy, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DEMO_FIELD_ID } from "./data/types";
import { isUsableRing } from "./geo/geometry";
import { LangContext, useT } from "./i18n";
import { useAppState, useTo } from "./state/useAppState";
import { BundleGate, BundleProvider } from "./components/BundleProvider";
import { StepBar } from "./components/StepBar";
import { TabBar, isPlanRoute } from "./components/TabBar";
import { TopBar } from "./components/TopBar";
import { WelcomeBack } from "./components/WelcomeBack";
import Adviser from "./screens/Adviser";
import FindField from "./screens/FindField";
import Options from "./screens/Options";
import Questions from "./screens/Questions";
import Today from "./screens/Today";
import { SETTINGS_PATH } from "./screens/settings/path";
import Why from "./screens/Why";
import Year from "./screens/Year";
import { VoiceProvider } from "./voice/Voice";

// Screens few farmers open, loaded only when first needed, so step 1 starts with less to download.
const AreaWeather = lazy(() => import("./screens/AreaWeather"));
const Print = lazy(() => import("./screens/Print"));
const Settings = lazy(() => import("./screens/Settings"));
const Credits = lazy(() => import("./screens/Credits"));
// The field timelapse, linked from the Year screen.
const Timelapse = lazy(() => import("./screens/Timelapse"));

/** While a screen loaded on demand arrives: the same one loading line as the bundle gate. */
function ScreenLoading() {
  const t = useT();
  return (
    <p className="p-4 text-body text-ink-soft" role="status">
      {t("common.loading")}
    </p>
  );
}

/**
 * Sends the farmer back to step 1 when the link lacks the field a screen needs.
 * "field": the demo field or a drawn outline (whose bundle is built from the basin data; outside the basin's
 * farmland the bundle gate sends it on to live weather). "outline": a drawn outline, for live weather.
 */
function Guard({ need, children }: { need: "field" | "outline"; children: ReactNode }) {
  const [state] = useAppState();
  const to = useTo();
  // A shared link can carry an outline that is a dot or a line; that is not a field.
  const drawn = state.outline !== null && isUsableRing(state.outline);
  const ok = need === "field" ? state.fieldId === DEMO_FIELD_ID || drawn : drawn;
  if (!ok) return <Navigate to={to("/")} replace />;
  return <>{children}</>;
}

function field(render: Parameters<typeof BundleGate>[0]["children"]) {
  return (
    <Guard need="field">
      <BundleGate>{render}</BundleGate>
    </Guard>
  );
}

function Shell() {
  const [state] = useAppState();
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    document.documentElement.dataset.view = state.view;
    document.documentElement.lang = state.lang;
  }, [state.view, state.lang]);

  const isPrint = pathname.startsWith("/print");
  // Settings sits outside the six steps: reachable from any of them, it belongs to none.
  // So do "Your field today", the page a farmer comes back to, and the field timelapse.
  const isSettings = pathname === SETTINGS_PATH || pathname === "/credits";
  // Setting up (field, questions) shows three steps at the top; once there is a plan, three tabs sit at the bottom.
  const inPlan = isPlanRoute(pathname);

  return (
    <LangContext.Provider value={state.lang}>
      <VoiceProvider>
      {/* Held sideways (phone-land, in index.css) the app takes the whole width, clear of the notch. */}
      <div
        data-testid="shell"
        className={`mx-auto w-full flex flex-col bg-paper text-ink font-body phone-land:pl-[env(safe-area-inset-left)] phone-land:pr-[env(safe-area-inset-right)] ${
          isPrint ? "min-h-dvh max-w-[52rem] print:max-w-none" : "h-dvh max-w-[30rem] phone-land:max-w-none"
        }`}
      >
        <TopBar steps={isPrint || isSettings || inPlan ? null : <StepBar pathname={pathname} />} />
        <main className={`flex-1 min-h-0 flex flex-col ${isPrint ? "" : "overflow-y-auto"}`}>
          <Suspense fallback={<ScreenLoading />}>
          {/* Each screen eases in (tc-screen, index.css) instead of snapping into place. */}
          <div key={pathname.split("/")[1] ?? ""} className="tc-screen flex-1 min-h-0 flex flex-col">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <WelcomeBack />
                  <FindField />
                </>
              }
            />
            <Route
              path="/area"
              element={
                <Guard need="outline">
                  <AreaWeather />
                </Guard>
              }
            />
            <Route path="/questions" element={field((b) => <Questions bundle={b} />)} />
            <Route path="/options" element={field((b) => <Options bundle={b} />)} />
            <Route path="/why/:optionId" element={field((b) => <Why bundle={b} />)} />
            <Route path="/year" element={field((b) => <Year bundle={b} />)} />
            <Route path="/adviser" element={field((b) => <Adviser bundle={b} />)} />
            <Route path="/today" element={field((b) => <Today bundle={b} />)} />
            <Route path="/print" element={field((b) => <Print bundle={b} />)} />
            <Route path={SETTINGS_PATH} element={<Settings />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/timelapse" element={field((b) => <Timelapse bundle={b} />)} />
            <Route path="*" element={<RedirectHome />} />
          </Routes>
          </div>
          </Suspense>
        </main>
        {inPlan && !isPrint ? <TabBar pathname={pathname} /> : null}
      </div>
      </VoiceProvider>
    </LangContext.Provider>
  );
}

function RedirectHome() {
  const to = useTo();
  return <Navigate to={to("/")} replace />;
}

/** Everything inside the router. Tests render this inside a MemoryRouter. */
export function AppRoutes() {
  return (
    <BundleProvider>
      <Shell />
    </BundleProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
