import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { FieldBundle, Limit } from "../data/types";
import { CROPS, LAST_CROP_NAME_MAX, LIMITS, PRIORITIES } from "../data/types";
import { useT } from "../i18n";
import { economicsCrops } from "../money/money";
import { toggleLimit } from "../state/toggles";
import { useAppState, useGo, useTo } from "../state/useAppState";
import { CropPlate } from "../components/CropPlate";
import { BackIcon, CheckIcon } from "../components/Icons";
import { MIN_RANKED, PRIORITY_ICON, RankMark, togglePriority } from "../components/Reasons";
import { PriorityHelp, priorityLine } from "../components/Term";
import { BackButton, Button, BottomBar, SectionTitle } from "../components/ui";

function Choice({
  on,
  disabled = false,
  onClick,
  children,
  role = "checkbox",
  title,
  label,
  place,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  role?: "checkbox" | "radio";
  title?: string;
  /** The accessible name, where the visible content also carries a number. */
  label?: string;
  /** Where this choice stands in an order (1 is first); shown in place of the tick. */
  place?: number;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      aria-label={label}
      data-rank={place}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`tc-tap w-full flex items-center gap-2 px-3 py-2 rounded-box border-2 text-left font-bold text-body ${
        on ? "bg-primary text-on-primary border-primary" : "bg-surface text-ink border-line-strong"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
      {place ? <RankMark place={place} className="ml-auto" /> : on ? <CheckIcon className="w-5 h-5 ml-auto flex-none" /> : null}
    </button>
  );
}

/** Three questions, asked one at a time: last crop, limits, priorities. */
const LAST_STEP = 2;

export default function Questions({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const go = useGo();
  const to = useTo();
  const [state, setState] = useAppState();

  function onLimit(limit: Limit) {
    setState({ limits: toggleLimit(state.limits, limit) });
  }

  const enough = state.priorities.length >= MIN_RANKED;
  const crops = bundle.economics ? economicsCrops(bundle.economics) : CROPS;
  const nameId = useId();
  // The typed name stays local while typing (the link keeps it trimmed, which would eat a space as it is typed).
  const [name, setName] = useState(state.lastCropName);
  // One question at a time. A farmer coming back with the priorities already in order lands on the last one.
  const [step, setStep] = useState(() => (enough ? LAST_STEP : 0));
  /** A question not on screen stays in the page, out of reach: not drawn, not focusable, not read aloud. */
  const part = (n: number) => ({ className: step === n ? "tc-screen flex flex-col" : "hidden", inert: step !== n, "data-testid": `question-${n + 1}` });

  return (
    <div className="flex flex-col flex-1">
      <p className="px-4 pt-3 text-small font-bold text-ink-soft" data-testid="question-step" aria-live="polite">
        {t("q.step", { n: step + 1, total: LAST_STEP + 1 })}
      </p>
      <div data-testid="two-cols" className="flex flex-col phone-land:w-full phone-land:max-w-[44rem] phone-land:mx-auto">
      <div {...part(0)}>
      <SectionTitle>
        <span className="flex flex-wrap items-baseline gap-x-2">
          {t("q.lastCrop")}
          {!bundle.lastCrop.appDefault ? (
            <span className="tc-dataset font-mono normal-case tracking-normal">
              {bundle.lastCrop.source.dataset} · {bundle.lastCrop.source.resolution}
            </span>
          ) : null}
        </span>
      </SectionTitle>
      <div role="radiogroup" aria-label={t("q.lastCrop")} className="grid grid-cols-2 gap-2 px-4" data-testid="last-crop">
        {crops.map((crop) => (
          <Choice key={crop} role="radio" on={state.lastCrop === crop} onClick={() => setState({ lastCrop: crop, lastCropName: "" })}>
            <span className="flex flex-col items-center gap-1 text-center" data-crop={crop}>
              <CropPlate crop={crop} className="w-20 h-20" />
              {t(`crop.${crop}`)}
            </span>
          </Choice>
        ))}
        <Choice role="radio" on={state.lastCrop === "other"} onClick={() => setState({ lastCrop: "other", lastCropName: name })}>
          {t("q.other")}
        </Choice>
      </div>
      {state.lastCrop === "other" ? (
        <div className="px-4 pt-2 flex flex-col gap-1">
          <label htmlFor={nameId} className="font-bold text-body">
            {t("q.otherName")}
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            maxLength={LAST_CROP_NAME_MAX}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setState({ lastCropName: e.target.value });
            }}
            className="tc-tap w-full px-3 rounded-box border-2 border-line-strong bg-surface text-big"
          />
        </div>
      ) : null}
      </div>

      <div {...part(1)}>
      <SectionTitle>{t("q.limits")}</SectionTitle>
      <div className="grid grid-cols-1 gap-2 px-4">
        {LIMITS.map((limit) => (
          <Choice key={limit} on={state.limits.includes(limit)} onClick={() => onLimit(limit)}>
            {t(`limit.${limit}`)}
          </Choice>
        ))}
      </div>
      </div>
      <div {...part(2)}>

      <div className="px-4 pt-2 pb-1 phone-land:pt-4">
        <PriorityHelp>
          <h2 className="text-small font-bold uppercase tracking-wider text-ink-soft">
            {t("q.priorities")}
          </h2>
        </PriorityHelp>
        <p className="text-small text-ink-soft" data-testid="rank-hint">{t("q.prioritiesHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {PRIORITIES.map((p) => {
          const place = state.priorities.indexOf(p) + 1;
          const Icon = PRIORITY_ICON[p];
          return (
            <Choice
              key={p}
              on={place > 0}
              place={place || undefined}
              label={t(`priority.${p}`)}
              onClick={() => setState({ priorities: togglePriority(state.priorities, p) })}
              title={t(priorityLine(p))}
            >
              <Icon className="w-6 h-6 flex-none" />
              {t(`priority.${p}`)}
            </Choice>
          );
        })}
      </div>
      </div>
      </div>

      <BottomBar>
        {step === 0 ? (
          <BackButton to={to("/")} />
        ) : (
          <Button look="secondary" className="flex-none px-3" data-testid="question-back" onClick={() => setStep(step - 1)}>
            <BackIcon className="w-5 h-5 flex-none" />
            {t("common.back")}
          </Button>
        )}
        {/* Only the last question can hold the farmer back: it needs two priorities in order. */}
        <Button className="flex-1" disabled={step === LAST_STEP && !enough} onClick={() => (step < LAST_STEP ? setStep(step + 1) : go("/options"))}>
          {t("common.next")}
        </Button>
      </BottomBar>
    </div>
  );
}
