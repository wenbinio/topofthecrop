// Going back keeps the farmer's newest figures. The app keeps every choice in the link, and each screen in the
// history keeps its own copy of that link: a change in Settings replaces only the copy of the screen it is made on,
// and a browser cannot rewrite the copies further back. So this remembers the figures of the latest screen the farmer
// reached going forward (or changed in place), and when Back lands on an older copy of the same field with other
// figures, it puts the newest figures into it. Then "Next" from there, and every link built from it, carries them
// too, however many steps back the farmer went. Leaving Settings by Back also saves the figures into the plan kept on
// this phone. A link for another field (pasted or opened from a message) is left as it is.
// This is the one deliberate exception to "every choice lives only in the link" (AGENTS.md): the figures are held in
// memory for this visit only, never stored. Written with AI assistance (Claude, Anthropic).
import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { SETTINGS_PATH, carryFigures } from "../screens/settings/path";
import { keepFigures } from "../state/plan";
import { decodeState } from "../state/url";

/** Which field a link is about: its field id and drawn outline. */
function fieldOf(search: string): string {
  const params = new URLSearchParams(search);
  return `${params.get("f") ?? ""}|${params.get("o") ?? ""}`;
}

export function KeepFiguresOnBack() {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const last = useRef(location);
  /** The link of the latest screen reached going forward or changed in place: it holds the newest figures. */
  const latest = useRef<string | null>(null);

  useEffect(() => {
    const before = last.current;
    last.current = location;
    if (navType !== "POP" || latest.current === null) {
      latest.current = location.search;
      return;
    }
    if (before.pathname === SETTINGS_PATH && location.pathname !== SETTINGS_PATH) keepFigures(decodeState(before.search));
    if (fieldOf(latest.current) !== fieldOf(location.search)) {
      latest.current = location.search;
      return;
    }
    const search = carryFigures(latest.current, location.search);
    if (search !== null) navigate({ pathname: location.pathname, search }, { replace: true });
  }, [location, navType, navigate]);

  return null;
}
