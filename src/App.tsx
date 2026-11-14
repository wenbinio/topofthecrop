import { useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DEMO_FIELD_ID } from "./data/types";
import { isUsableRing } from "./geo/geometry";
import { LangContext } from "./i18n";
import { useAppState, useTo } from "./state/useAppState";
import { BundleGate, BundleProvider } from "./components/BundleProvider";
import { StepBar } from "./components/StepBar";
import { TopBar } from "./components/TopBar";
import Adviser from "./screens/Adviser";
import AreaWeather from "./screens/AreaWeather";
import FindField from "./screens/FindField";
import Options from "./screens/Options";
import Print from "./screens/Print";
import Questions from "./screens/Questions";
import Settings, { SETTINGS_PATH } from "./screens/Settings";
import Why from "./screens/Why";
import Year from "./screens/Year";
import { VoiceProvider } from "./voice/Voice";

/** Sends the farmer back to step 1 when the link lacks the field a screen needs. */
function Guard({ need, children }: { need: "demo" | "outline"; children: ReactNode }) {
  const [state] = useAppState();
  const to = useTo();
  // A shared link can carry an outline that is a dot or a line; that is not a field.
  const ok = need === "demo" ? state.fieldId === DEMO_FIELD_ID : state.outline !== null && isUsableRing(state.outline);
  if (!ok) return <Navigate to={to("/")} replace />;
  return <>{children}</>;
}

function demo(render: Parameters<typeof BundleGate>[0]["children"]) {
  return (
    <Guard need="demo">
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
  const isSettings = pathname === SETTINGS_PATH;

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
        <TopBar steps={isPrint || isSettings ? null : <StepBar pathname={pathname} />} />
        <main className={`flex-1 min-h-0 flex flex-col ${isPrint ? "" : "overflow-y-auto"}`}>
          <Routes>
            <Route path="/" element={<FindField />} />
            <Route
              path="/area"
              element={
                <Guard need="outline">
                  <AreaWeather />
                </Guard>
              }
            />
            <Route path="/questions" element={demo((b) => <Questions bundle={b} />)} />
            <Route path="/options" element={demo((b) => <Options bundle={b} />)} />
            <Route path="/why/:optionId" element={demo((b) => <Why bundle={b} />)} />
            <Route path="/year" element={demo((b) => <Year bundle={b} />)} />
            <Route path="/adviser" element={<Guard need="demo"><Adviser /></Guard>} />
            <Route path="/print" element={demo((b) => <Print bundle={b} />)} />
            <Route path={SETTINGS_PATH} element={<Settings />} />
            <Route path="*" element={<RedirectHome />} />
          </Routes>
        </main>
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
