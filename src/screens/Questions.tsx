import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { FieldBundle, Limit, Priority } from "../data/types";
import { CROPS, LAST_CROP_NAME_MAX, LIMITS, PRIORITIES } from "../data/types";
import { useT } from "../i18n";
import { economicsCrops } from "../money/money";
import { useAppState, useGo, useTo } from "../state/useAppState";
import { CropName } from "../components/Crops";
import { CheckIcon } from "../components/Icons";
import { PRIORITY_ICON } from "../components/Reasons";
import { PriorityHelp, priorityLine } from "../components/Term";
import { BackButton, Button, BottomBar, SectionTitle } from "../components/ui";

function Choice({
  on,
  disabled = false,
  onClick,
  children,
  role = "checkbox",
  title,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  role?: "checkbox" | "radio";
  title?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`tc-tap w-full flex items-center gap-2 px-3 py-2 rounded-box border-2 text-left font-bold text-body ${
        on ? "bg-primary text-on-primary border-primary" : "bg-surface text-ink border-line-strong"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
      {on ? <CheckIcon className="w-5 h-5 ml-auto flex-none" /> : null}
    </button>
  );
}

export default function Questions({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  const go = useGo();
  const to = useTo();
  const [state, setState] = useAppState();

  function toggleLimit(limit: Limit) {
    const has = state.limits.includes(limit);
    const next = has ? state.limits.filter((l) => l !== limit) : [...state.limits, limit];
    setState({ limits: LIMITS.filter((l) => next.includes(l)) });
  }

  function togglePriority(p: Priority) {
    const has = state.priorities.includes(p);
    if (has) setState({ priorities: state.priorities.filter((x) => x !== p) });
    else if (state.priorities.length < 2) setState({ priorities: [...state.priorities, p] });
  }

  const full = state.priorities.length >= 2;
  const crops = bundle.economics ? economicsCrops(bundle.economics) : CROPS;
  const nameId = useId();
  // The typed name stays local while typing (the link keeps it trimmed, which would eat a space as it is typed).
  const [name, setName] = useState(state.lastCropName);

  return (
    <div className="flex flex-col flex-1">
      {/* Held sideways: last crop and limits on the left, priorities on the right. */}
      <div data-testid="two-cols" className="flex flex-col phone-land:grid phone-land:grid-cols-2 phone-land:items-start phone-land:gap-x-2">
      <div className="flex flex-col min-w-0">
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
            <CropName crop={crop} iconClassName="w-6 h-6" wrap />
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

      <SectionTitle>{t("q.limits")}</SectionTitle>
      <div className="grid grid-cols-1 gap-2 px-4">
        {LIMITS.map((limit) => (
          <Choice key={limit} on={state.limits.includes(limit)} onClick={() => toggleLimit(limit)}>
            {t(`limit.${limit}`)}
          </Choice>
        ))}
      </div>
      </div>
      <div className="flex flex-col min-w-0">

      <div className="px-4 pt-2 pb-1 phone-land:pt-4">
        <PriorityHelp>
          <h2 className="text-small font-bold uppercase tracking-wider text-ink-soft">
            {t("q.priorities")} · {state.priorities.length}/2
          </h2>
        </PriorityHelp>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {PRIORITIES.map((p) => {
          const on = state.priorities.includes(p);
          const Icon = PRIORITY_ICON[p];
          return (
            <Choice key={p} on={on} disabled={!on && full} onClick={() => togglePriority(p)} title={t(priorityLine(p))}>
              <Icon className="w-6 h-6 flex-none" />
              {t(`priority.${p}`)}
            </Choice>
          );
        })}
      </div>
      </div>
      </div>

      <BottomBar>
        <BackButton to={to("/")} />
        <Button className="flex-1" disabled={!full} onClick={() => go("/options")}>
          {t("common.next")}
        </Button>
      </BottomBar>
    </div>
  );
}
