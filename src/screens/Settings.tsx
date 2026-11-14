import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Economics, Fact, FieldBundle } from "../data/types";
import { CROPS, DEMO_FIELD_ID } from "../data/types";
import { useLang, useT } from "../i18n";
import { MONEY_LIMITS, resolveMoney, setMoney } from "../money/money";
import { useAppState } from "../state/useAppState";
import { BundleGate } from "../components/BundleProvider";
import { DatasetLabel, PlaceholderNote, ScaleBadge, YoursTag, formatNumber } from "../components/FactParts";
import { BackIcon, CropIcon } from "../components/Icons";
import { Button, SectionTitle } from "../components/ui";

export const SETTINGS_PATH = "/settings";

/** Router state given to every link into Settings, so its Back link knows where the farmer was. */
export type SettingsFrom = { from?: string };

/** The router `state` for a link into Settings from `pathname` (kept when already there). */
export function settingsFrom(pathname: string, current: unknown): SettingsFrom {
  if (pathname === SETTINGS_PATH) return { from: (current as SettingsFrom | null)?.from };
  return { from: pathname };
}

type Limits = readonly [number, number];

/** A typed number, or why it is not one. Accepts a comma as the decimal mark. */
function parseMoney(text: string, [min, max]: Limits): { value: number } | { error: "number" | "range" } {
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
function MoneyInput({
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
  const t = useT();
  const lang = useLang();
  const errId = useId();
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
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const p = parseMoney(next, limits);
          if ("value" in p) onCommit(p.value);
        }}
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

function Heading({ title, unit, fact }: { title: string; unit: string; fact: Fact | undefined }) {
  return (
    <SectionTitle>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span>
          {title} <span className="normal-case tracking-normal">{unit}</span>
        </span>
        {fact ? (
          <span className="flex flex-wrap items-center gap-x-2 normal-case tracking-normal">
            <ScaleBadge scale={fact.scale} />
            <DatasetLabel fact={fact} />
          </span>
        ) : null}
      </span>
    </SectionTitle>
  );
}

function Editor({ economics }: { economics: Economics }) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useAppState();
  const resolved = resolveMoney(economics, state.money);
  const crops = CROPS.filter((c) => economics.crops[c]);
  const commit = (key: string, value: number) => setState({ money: setMoney(economics, state.money, key, value) });

  const firstPrice = crops.length ? economics.crops[crops[0]].price : undefined;
  const shownDefaults: Fact[] = [
    ...crops.flatMap((c) => [economics.crops[c].price, economics.crops[c].yield, economics.crops[c].costs]),
    ...economics.support.map((s) => s.amount),
  ];

  return (
    <>
      <Heading title={t("settings.prices")} unit="€/t" fact={firstPrice} />
      <ul className="border-t border-line bg-surface" data-testid="price-list">
        {crops.map((crop) => {
          const price = resolved.prices[crop];
          return (
            <li key={crop} className="flex items-start gap-3 px-4 py-2 border-b border-line">
              <CropIcon crop={crop} className="w-8 h-8 mt-2 flex-none" />
              <span className="flex-1 min-w-0 flex flex-col pt-2.5">
                <span className="font-bold text-big">{t(`crop.${crop}`)}</span>
                {price.edited ? (
                  <span className="flex flex-wrap items-center gap-2 mt-0.5 text-small text-ink-soft">
                    <YoursTag />
                    {t("settings.start", { n: formatNumber(price.default, lang) })}
                  </span>
                ) : null}
              </span>
              <MoneyInput
                value={price.value}
                limits={MONEY_LIMITS.price}
                label={t("settings.priceOf", { crop: t(`crop.${crop}`) })}
                onCommit={(v) => commit(`p.${crop}`, v)}
              />
            </li>
          );
        })}
      </ul>

      <Heading title={t("settings.support")} unit="€/ha" fact={economics.support[0]?.amount} />
      <ul className="border-t border-line bg-surface" data-testid="support-list">
        {economics.support.map((item) => {
          const r = resolved.support.find((s) => s.id === item.id);
          const on = r ? r.on : item.defaultOn;
          const amount = r ? r.amount : (item.amount.value as number);
          const name = item.name[lang];
          return (
            <SupportRow key={item.id} id={item.id} name={name} condition={item.condition[lang]} level={t(`level.${item.level}`)} edited={r?.edited ?? false}
              on={on}
              onToggle={(next) => commit(`on.${item.id}`, next ? 1 : 0)}
            >
              <MoneyInput
                value={amount}
                limits={MONEY_LIMITS.support}
                label={t("settings.amountOf", { name })}
                disabled={!on}
                onCommit={(v) => commit(`s.${item.id}`, v)}
              />
            </SupportRow>
          );
        })}
      </ul>

      <div className="px-4 pt-4 flex flex-col gap-3 items-stretch">
        <Button look="secondary" disabled={!resolved.edited} onClick={() => setState({ money: {} })}>
          {t("settings.reset")}
        </Button>
        <p className="text-body font-bold" data-testid="adviser-line">
          {t("settings.adviser")}
        </p>
        <PlaceholderNote facts={shownDefaults} />
      </div>
    </>
  );
}

function SupportRow({
  id,
  name,
  condition,
  level,
  edited,
  on,
  onToggle,
  children,
}: {
  id: string;
  name: string;
  condition: string;
  level: string;
  edited: boolean;
  on: boolean;
  onToggle: (on: boolean) => void;
  children: ReactNode;
}) {
  const t = useT();
  const condId = useId();
  return (
    <li className="px-4 py-2 border-b border-line" data-testid="support-item" data-support-id={id}>
      <div className="flex items-start gap-3">
        <label className="flex-1 min-w-0 min-h-11 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => onToggle(e.target.checked)}
            aria-describedby={condId}
            className="w-7 h-7 mt-2.5 flex-none accent-primary cursor-pointer"
          />
          <span className={`pt-2.5 font-bold text-body ${on ? "" : "text-ink-soft"}`}>{name}</span>
        </label>
        {children}
      </div>
      <p id={condId} className="mt-1 text-small text-ink-soft">
        {condition}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-small font-bold">
        <span className="px-1.5 border border-line-strong rounded-sm">{level}</span>
        {on ? null : <span className="text-ink-soft">{t("settings.off")}</span>}
        {edited ? <YoursTag /> : null}
      </p>
    </li>
  );
}

function Body({ bundle }: { bundle: FieldBundle }) {
  const t = useT();
  if (!bundle.economics) {
    return (
      <p className="px-4 py-4 text-big" data-testid="settings-nothing">
        {t("settings.nothing")}
      </p>
    );
  }
  return <Editor economics={bundle.economics} />;
}

/** Prices and support: the farmer's own figures behind the income. Every change applies at once. */
export default function Settings() {
  const t = useT();
  const [state] = useAppState();
  const location = useLocation();
  // Read once: every change to the figures replaces the link, and that drops the router state.
  const [from] = useState(() => (location.state as SettingsFrom | null)?.from);

  // Back to where the farmer came from, carrying the figures just changed (browser back would
  // return to the old link without them). With no record of that, the obvious screen.
  const fallback = state.fieldId === DEMO_FIELD_ID ? "/options" : state.outline ? "/area" : "/";

  let body: ReactNode;
  if (state.fieldId === DEMO_FIELD_ID) body = <BundleGate>{(b) => <Body bundle={b} />}</BundleGate>;
  else if (state.outline)
    body = (
      <p className="px-4 py-4 text-big" data-testid="settings-nothing">
        {t("settings.nothing")}
      </p>
    );
  else
    body = (
      <p className="px-4 py-4 text-big" data-testid="settings-no-field">
        {t("settings.noField")}
      </p>
    );

  return (
    <div className="flex flex-col flex-1 pb-6">
      <Link
        to={{ pathname: from ?? fallback, search: location.search }}
        replace
        className="self-start inline-flex items-center gap-1 min-h-11 px-3 font-bold text-body"
      >
        <BackIcon className="w-5 h-5" />
        {t("common.back")}
      </Link>
      <h1 className="px-4 pb-1 text-head">{t("settings.title")}</h1>
      {body}
    </div>
  );
}
