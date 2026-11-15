// Back out of Settings keeps the figures the farmer just changed. Every change in Settings replaces the link, so the
// screen before it is still in the history with the old figures; going back lands on that copy. This puts the new
// figures into it (and into the plan kept on this phone), so a further Back moves on to the screen before that
// instead of showing the same screen with the old figures. It covers the arrow in the top bar, the phone's own
// Back, and Settings' Back and "Save changes", which go back a step too. Written with AI assistance (Claude, Anthropic).
import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { SETTINGS_PATH, carryFigures } from "../screens/settings/path";
import { keepFigures } from "../state/plan";
import { decodeState } from "../state/url";

export function KeepFiguresOnBack() {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const last = useRef(location);

  useEffect(() => {
    const before = last.current;
    last.current = location;
    if (navType !== "POP" || before.pathname !== SETTINGS_PATH || location.pathname === SETTINGS_PATH) return;
    keepFigures(decodeState(before.search));
    const search = carryFigures(before.search, location.search);
    if (search !== null) navigate({ pathname: location.pathname, search }, { replace: true });
  }, [location, navType, navigate]);

  return null;
}
