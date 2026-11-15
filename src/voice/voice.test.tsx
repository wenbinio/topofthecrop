import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import fixture from "../test-fixtures/money-bundle.json";
import { AppRoutes } from "../App";
import type { FieldBundle } from "../data/types";
import { DEFAULT_STATE, DEMO_FIELD_ID } from "../data/types";
import { withMoney } from "../money/money";
import { screenSummary } from "./summary";
import type { RecognitionLike, SpeechEnv, UtteranceLike } from "./useSpeech";
import { SpeechEnvContext } from "./useSpeech";

vi.mock("../components/Map", () => ({
  default: () => <div data-testid="map" />,
}));

class FakeRecognition implements RecognitionLike {
  static all: FakeRecognition[] = [];
  lang = "";
  continuous = true;
  interimResults = true;
  maxAlternatives = 1;
  onresult: RecognitionLike["onresult"] = null;
  onerror: RecognitionLike["onerror"] = null;
  onend: RecognitionLike["onend"] = null;
  started = false;
  constructor() {
    FakeRecognition.all.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.onend?.();
  }
  /** The phone heard these alternatives, then stopped. */
  say(...alternatives: string[]) {
    act(() => {
      this.onresult?.({ results: [alternatives.map((transcript) => ({ transcript }))] });
      this.onend?.();
    });
  }
  fail(error: string) {
    act(() => {
      this.onerror?.({ error });
      this.onend?.();
    });
  }
}

class FakeUtterance implements UtteranceLike {
  lang = "";
  voice?: unknown;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

let synth: { speak: Mock<(u: UtteranceLike) => void>; cancel: Mock<() => void>; getVoices: () => { lang: string }[] };
let env: SpeechEnv;

let lastPath = "";
function LocationSpy() {
  const location = useLocation();
  lastPath = location.pathname + location.search;
  return null;
}

function renderAt(entry: string, speech: SpeechEnv = env) {
  return render(
    <SpeechEnvContext.Provider value={speech}>
      <MemoryRouter initialEntries={[entry]}>
        <AppRoutes />
        <LocationSpy />
      </MemoryRouter>
    </SpeechEnvContext.Provider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => structuredClone(fixture) }) as unknown as Response),
  );
  FakeRecognition.all = [];
  synth = { speak: vi.fn<(u: UtteranceLike) => void>(), cancel: vi.fn<() => void>(), getVoices: () => [] };
  env = { Recognition: FakeRecognition, synth, Utterance: FakeUtterance };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function tapMic(): FakeRecognition {
  fireEvent.click(screen.getByTestId("mic"));
  const rec = FakeRecognition.all[FakeRecognition.all.length - 1];
  expect(rec.started).toBe(true);
  return rec;
}

describe("microphone", () => {
  it("“income and water, next” on Questions sets both priorities and goes to Options", async () => {
    renderAt("/questions?f=genzano-demo");
    await screen.findByTestId("last-crop");
    const rec = tapMic();
    expect(rec.lang).toBe("en-GB");
    expect(rec.interimResults).toBe(false);
    expect(rec.maxAlternatives).toBe(3);
    expect(screen.getByTestId("mic")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("voice-line")).toHaveTextContent("Listening");

    rec.say("income and water, next");
    await waitFor(() => expect(lastPath.split("?")[0]).toBe("/options"));
    expect(lastPath).toContain("p=income%2Cwater");
    expect(await screen.findByTestId("recommendation")).toBeInTheDocument();
    expect(screen.getByTestId("voice-line")).toHaveTextContent("“income and water, next” → Income, Water on, Options");
    expect(screen.getByTestId("mic")).toHaveAttribute("aria-pressed", "false");
  });

  it("listens in Italian when the app is in Italian, and takes the first alternative it understands", async () => {
    renderAt("/questions?f=genzano-demo&g=it");
    await screen.findByTestId("last-crop");
    const rec = tapMic();
    expect(rec.lang).toBe("it-IT");
    rec.say("ridito", "reddito");
    await waitFor(() => expect(lastPath).toContain("p=income"));
    expect(screen.getByTestId("voice-line")).toHaveTextContent("«reddito» → Reddito: sì");
  });

  it("a priority by voice follows the chips: it joins the end of the order", async () => {
    renderAt("/options?f=genzano-demo&p=soil,income");
    await screen.findByTestId("recommendation");
    tapMic().say("forage");
    await waitFor(() => expect(lastPath).toContain("p=soil%2Cincome%2Cforage"));
    expect(screen.getByRole("checkbox", { name: "Forage" })).toHaveAttribute("data-rank", "3");
  });

  it("priorities said in a row are ranked in the order said", async () => {
    renderAt("/questions?f=genzano-demo");
    await screen.findByTestId("last-crop");
    tapMic().say("soil, water, income");
    await waitFor(() => expect(lastPath).toContain("p=soil%2Cwater%2Cincome"));
  });

  it("“next” on Questions with one priority stays and says to rank 2", async () => {
    renderAt("/questions?f=genzano-demo");
    await screen.findByTestId("last-crop");
    tapMic().say("water, next");
    await waitFor(() => expect(lastPath).toContain("p=water"));
    expect(lastPath.split("?")[0]).toBe("/questions");
    expect(screen.getByTestId("voice-line")).toHaveTextContent("Water on, Rank 2 priorities first");
  });

  it("says what to try when it did not understand", async () => {
    renderAt("/questions?f=genzano-demo");
    await screen.findByTestId("last-crop");
    tapMic().say("banana bread");
    expect(screen.getByTestId("voice-line")).toHaveTextContent("Didn't catch that. Try “income and water” or “no irrigation”.");
    expect(lastPath).toBe("/questions?f=genzano-demo");
  });

  it("a blocked microphone shows its line", async () => {
    renderAt("/questions?f=genzano-demo");
    await screen.findByTestId("last-crop");
    tapMic().fail("not-allowed");
    expect(screen.getByTestId("voice-line")).toHaveTextContent("Microphone blocked. Allow it in browser settings.");
  });

  it("an unsupported browser shows no microphone and no speaker", async () => {
    renderAt("/options?f=genzano-demo&p=income,water", { Recognition: null, synth: null, Utterance: null });
    await screen.findByTestId("recommendation");
    expect(screen.queryByTestId("mic")).toBeNull();
    expect(screen.queryByTestId("read-aloud")).toBeNull();
    expect(screen.queryByTestId("voice-line")).toBeNull();
    expect(screen.getByTestId("app-name")).not.toHaveClass("max-[28rem]:sr-only");
  });

  it("with the microphone, the app name gives way at 360 px", async () => {
    renderAt("/");
    expect(screen.getByTestId("app-name")).toHaveClass("max-[28rem]:sr-only");
  });

  it("“what should I plant” on Options reads the recommendation", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findByTestId("recommendation");
    tapMic().say("what should I plant");
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect((synth.speak.mock.calls[0][0] as FakeUtterance).text).toMatch(/^Plant chickpea next\./);
  });
});

describe("read aloud", () => {
  it("the speaker speaks the summary, and a route change cancels it", async () => {
    renderAt("/options?f=genzano-demo&p=income,water");
    await screen.findByTestId("recommendation");
    const expected = screenSummary("/options", withMoney(fixture as unknown as FieldBundle, {}, []), {
      ...DEFAULT_STATE,
      fieldId: DEMO_FIELD_ID,
      priorities: ["income", "water"],
    });
    fireEvent.click(screen.getByTestId("read-aloud"));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const u = synth.speak.mock.calls[0][0] as FakeUtterance;
    expect(u.text).toBe(expected);
    expect(u.lang).toBe("en-GB");
    expect(screen.getByTestId("read-aloud")).toHaveAttribute("aria-pressed", "true");

    const cancelled = synth.cancel.mock.calls.length;
    fireEvent.click(screen.getByRole("link", { name: "Field year" }));
    await waitFor(() => expect(lastPath.split("?")[0]).toBe("/year"));
    expect(synth.cancel.mock.calls.length).toBeGreaterThan(cancelled);
  });
});
