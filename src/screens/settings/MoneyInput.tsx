// The number box on Settings: a typed figure, checked against its limits, with an error line below.
// Written with AI assistance (Claude, Anthropic).
import { useId, useState } from "react";
import { useLang, useT } from "../../i18n";
import { formatNumber } from "../../components/FactParts";

export type Limits = readonly [number, number];

/** A typed number, or why it is not one. Accepts a comma as the decimal mark. */
export function parseMoney(text: string, [min, max]: Limits): { value: number } | { error: "number" | "range" } {
  const clean = text.trim().replace(",", ".");
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(clean)) return { error: "number" };
  const value = Number(clean);
  if (!Number.isFinite(value)) return { error: "number" };
  if (value < min || value > max) return { error: "range" };
  return { value };
}

/**
 * A big number box. The typed text stays local, so a half-typed number is not overwritten;
 * only a number within the limits reaches `onCommit`.
 */
export function MoneyInput({
  value,
  limits,
  label,
  disabled = false,
  onCommit,
}: {
  value: number;
  limits: Limits;
  label: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  // The stored value changed from elsewhere (Reset, another tab of the link): show it,
  // unless the text already says that number ("400." while typing "400.5").
  if (value !== seen) {
    setSeen(value);
    const parsed = parseMoney(text, limits);
    if (!("value" in parsed) || parsed.value !== value) setText(String(value));
  }
  const parsed = parseMoney(text, limits);
  const error = disabled || "value" in parsed ? null : parsed.error;

  return (
    <AmountBox
      text={text}
      limits={limits}
      label={label}
      disabled={disabled}
      error={error}
      onText={(next) => {
        setText(next);
        const p = parseMoney(next, limits);
        if ("value" in p) onCommit(p.value);
      }}
    />
  );
}

/** The number box itself, with its error line below. */
export function AmountBox({
  text,
  limits,
  label,
  disabled = false,
  error,
  onText,
}: {
  text: string;
  limits: Limits;
  label: string;
  disabled?: boolean;
  error: "number" | "range" | null;
  onText: (text: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const errId = useId();
  return (
    <span className="flex flex-col items-end flex-none">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        disabled={disabled}
        value={text}
        onChange={(e) => onText(e.target.value)}
        className={`tc-tap w-28 px-3 rounded-box border-2 bg-surface text-big font-bold text-right disabled:bg-sunk disabled:text-ink-soft disabled:opacity-60 ${
          error ? "border-warn" : "border-line-strong"
        }`}
      />
      {error ? (
        <span id={errId} role="alert" data-testid="money-error" className="mt-1 text-small font-bold text-warn text-right">
          {error === "number"
            ? t("settings.errNumber")
            : t("settings.errRange", { min: formatNumber(limits[0], lang), max: formatNumber(limits[1], lang) })}
        </span>
      ) : null}
    </span>
  );
}
