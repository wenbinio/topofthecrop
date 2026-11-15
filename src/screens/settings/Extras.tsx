// The farmer's own payments on Settings: the list of those added, and the small form that adds another.
// They travel in the link parameter `x`. Written with AI assistance (Claude, Anthropic).
import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { CropId, ExtraSupport } from "../../data/types";
import { EXTRA_LIMITS, MAX_EXTRAS } from "../../data/types";
import { useT } from "../../i18n";
import { YoursTag } from "../../components/FactParts";
import { CropName, PaidIn } from "../../components/Crops";
import { Button } from "../../components/ui";
import { AmountBox, MoneyInput, parseMoney } from "./MoneyInput";

/** The payments the farmer added, each like a known one but always on, and the way to add another. */
export function Extras({
  crops,
  extras,
  onChange,
  onAdd,
}: {
  crops: CropId[];
  extras: ExtraSupport[];
  onChange: (index: number, extra: ExtraSupport | null) => void;
  onAdd: (extra: ExtraSupport) => void;
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const full = extras.length >= MAX_EXTRAS;
  return (
    <>
      {extras.length ? (
        <>
          <ul className="border-t border-line bg-surface" data-testid="extra-list">
            {extras.map((extra, i) => (
              <li key={`${i}-${extra.name}`} className="px-4 py-2 border-b border-line" data-testid="extra-item">
                <div className="flex items-start gap-3">
                  <span className="flex-1 min-w-0 pt-2.5 font-bold text-body break-words">{extra.name}</span>
                  <MoneyInput
                    value={extra.amount}
                    limits={EXTRA_LIMITS.amount}
                    label={t("settings.amountOf", { name: extra.name })}
                    onCommit={(amount) => onChange(i, { ...extra, amount })}
                  />
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2">
                  <span className="flex flex-wrap items-center gap-2 text-small font-bold">
                    <YoursTag />
                    <span className="text-ink-soft">
                      <PaidIn crops={extra.crops} />
                    </span>
                  </span>
                  <Button
                    look="plain"
                    className="px-2"
                    aria-label={t("settings.removeOf", { name: extra.name })}
                    onClick={() => onChange(i, null)}
                  >
                    {t("settings.remove")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="px-4 pt-4 flex flex-col gap-2 items-stretch">
        {adding ? (
          <AddForm
            crops={crops}
            onCancel={() => setAdding(false)}
            onAdd={(extra) => {
              onAdd(extra);
              setAdding(false);
            }}
          />
        ) : (
          <>
            <Button look="secondary" disabled={full} onClick={() => setAdding(true)}>
              {t("settings.add")}
            </Button>
            {full ? (
              <p className="text-small text-ink-soft" data-testid="extra-max">
                {t("settings.addMax")}
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

/** A small form, in place: name, amount and the years it is paid in ("Every year" unless a crop is chosen). */
export function AddForm({
  crops: offered,
  onAdd,
  onCancel,
}: {
  crops: CropId[];
  onAdd: (extra: ExtraSupport) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const nameId = useId();
  const paidId = useId();
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [crops, setCrops] = useState<CropId[]>([]);
  const parsed = parseMoney(amountText, EXTRA_LIMITS.amount);
  // An empty box is not yet a mistake to point out; it only keeps "Add" off.
  const error = !amountText || "value" in parsed ? null : parsed.error;
  const trimmed = name.trim();
  const amount = "value" in parsed ? parsed.value : null;
  const toggle = (crop: CropId) =>
    setCrops((now) => (now.includes(crop) ? now.filter((c) => c !== crop) : offered.filter((c) => c === crop || now.includes(c))));

  return (
    <div className="flex flex-col gap-3 p-3 border-2 border-line-strong rounded-box bg-surface" data-testid="extra-form">
      <label htmlFor={nameId} className="font-bold text-body">
        {t("settings.addName")}
      </label>
      <input
        id={nameId}
        type="text"
        autoComplete="off"
        maxLength={EXTRA_LIMITS.name}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="tc-tap w-full px-3 rounded-box border-2 border-line-strong bg-surface text-big"
      />
      <div className="flex items-start justify-between gap-3">
        <span className="pt-2.5 font-bold text-body">
          {t("settings.addAmount")} <span className="font-normal">€/ha</span>
        </span>
        <AmountBox text={amountText} limits={EXTRA_LIMITS.amount} label={t("settings.addAmount")} error={error} onText={setAmountText} />
      </div>
      <p id={paidId} className="font-bold text-body">
        {t("settings.paidIn")}
      </p>
      <div role="group" aria-labelledby={paidId} className="flex flex-wrap gap-2">
        <Toggle pressed={!crops.length} onClick={() => setCrops([])}>
          {t("settings.everyYear")}
        </Toggle>
        {offered.map((crop) => (
          <Toggle key={crop} pressed={crops.includes(crop)} onClick={() => toggle(crop)}>
            <CropName crop={crop} />
          </Toggle>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!trimmed || amount === null}
          className="flex-1"
          onClick={() => {
            if (trimmed && amount !== null) onAdd({ name: trimmed, amount, crops });
          }}
        >
          {t("settings.addConfirm")}
        </Button>
        <Button look="secondary" className="flex-1" onClick={onCancel}>
          {t("settings.addCancel")}
        </Button>
      </div>
    </div>
  );
}

/** An on/off button for "Paid in". */
function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`tc-tap px-3 rounded-box border-2 font-bold text-body ${
        pressed ? "bg-primary text-on-primary border-primary" : "bg-surface text-ink border-line-strong"
      }`}
    >
      {children}
    </button>
  );
}
