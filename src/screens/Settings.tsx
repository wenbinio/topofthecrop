import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CropId, Economics, ExtraSupport, Fact, FieldBundle } from "../data/types";
import { DEMO_FIELD_ID, EXTRA_LIMITS, MAX_EXTRAS } from "../data/types";
import { useLang, useT } from "../i18n";
import { MONEY_LIMITS, cropFigures, economicsCrops, resolveMoney, setMoney } from "../money/money";
import { useAppState } from "../state/useAppState";
import { BundleGate } from "../components/BundleProvider";
import { DatasetLabel, PlaceholderNote, ScaleBadge, YoursTag, formatNumber } from "../components/FactParts";
import { CropName, PaidIn } from "../components/Crops";
import { BackIcon, ChevronIcon } from "../components/Icons";
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
function AmountBox({
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

/** Where a section's default figures come from: the scale and the dataset, as on every other figure. */
function FactLine({ fact }: { fact: Fact | undefined }) {
  if (!fact) return null;
  return (
    <p className="px-4 pt-2 pb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <ScaleBadge scale={fact.scale} />
      <DatasetLabel fact={fact} />
    </p>
  );
}

type SectionId = "prices" | "costs" | "support" | "own";

/**
 * A fold-out part of Settings: a header button with the section's name, a one-line summary and a chevron.
 * A closed section's rows are `hidden`, so they are out of the tab order and the accessibility tree.
 */
function Section({
  id,
  title,
  unit,
  summary,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  unit?: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const headId = useId();
  const panelId = useId();
  return (
    <section className="border-b border-line" data-testid={`section-${id}`}>
      <h2>
        <button
          type="button"
          id={headId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          data-testid="section-toggle"
          className="tc-tap min-h-11 w-full flex items-center gap-3 px-4 py-2 text-left phone-land:py-1"
        >
          <span className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-bold text-big">
              {title}
              {unit ? <span className="font-normal text-body text-ink-soft"> {unit}</span> : null}
            </span>
            <span className="text-small font-bold text-ink-soft" data-testid="section-summary">
              {summary}
            </span>
          </span>
          <ChevronIcon className={`w-6 h-6 flex-none motion-safe:transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
      </h2>
      <div id={panelId} role="region" aria-labelledby={headId} hidden={!open} className="pb-2">
        {children}
      </div>
    </section>
  );
}

type CropFigure = { value: number; default: number; edited: boolean };

/** One crop's editable figure (a price or its costs), with "Yours" and the starting figure once changed. */
function CropFigureRow({
  crop,
  figure,
  limits,
  label,
  testId,
  onCommit,
}: {
  crop: CropId;
  figure: CropFigure;
  limits: Limits;
  label: string;
  testId: string;
  onCommit: (value: number) => void;
}) {
  const t = useT();
  const lang = useLang();
  return (
    <li className="flex items-start gap-3 px-4 py-2 border-b border-line" data-testid={testId} data-crop={crop}>
      <span className="flex-1 min-w-0 flex flex-col pt-2.5">
        <CropName crop={crop} iconClassName="w-7 h-7" className="font-bold text-big" wrap />
        {figure.edited ? (
          <span className="flex flex-wrap items-center gap-2 mt-0.5 text-small text-ink-soft">
            <YoursTag />
            {t("settings.start", { n: formatNumber(figure.default, lang) })}
          </span>
        ) : null}
      </span>
      <MoneyInput value={figure.value} limits={limits} label={label} onCommit={onCommit} />
    </li>
  );
}

function Editor({ economics }: { economics: Economics }) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useAppState();
  const resolved = resolveMoney(economics, state.money);
  const crops = economicsCrops(economics);
  const commit = (key: string, value: number) => setState({ money: setMoney(economics, state.money, key, value) });
  const extras = state.extras;
  const setExtra = (index: number, extra: ExtraSupport | null) =>
    setState({ extras: extra ? extras.map((e, i) => (i === index ? extra : e)) : extras.filter((_, i) => i !== index) });

  const figure = (key: "price" | "costs", crop: CropId): CropFigure => {
    const fallback = Number(cropFigures(economics, crop)[key].value);
    const r = (key === "price" ? resolved.prices : resolved.costs)[crop];
    return r ?? { value: fallback, default: fallback, edited: false };
  };
  const pricesChanged = crops.filter((c) => figure("price", c).edited).length;
  const costsChanged = crops.filter((c) => figure("costs", c).edited).length;
  const supportChanged = resolved.support.filter((s) => s.edited).length;
  const supportOn = economics.support.filter((item) => resolved.support.find((s) => s.id === item.id)?.on ?? item.defaultOn).length;

  // A section holding the farmer's own figures starts open, so they see them without hunting; the rest start closed.
  const [open, setOpen] = useState<Record<SectionId, boolean>>(() => ({
    prices: pricesChanged > 0,
    costs: costsChanged > 0,
    support: supportChanged > 0,
    own: extras.length > 0,
  }));
  const toggle = (id: SectionId) => setOpen((now) => ({ ...now, [id]: !now[id] }));

  const count = (n: number, one: string, many: string) => (n === 1 ? t(one) : t(many, { n }));
  const withChanged = (text: string, changed: number) =>
    changed ? `${text} · ${count(changed, "settings.sumChangedOne", "settings.sumChanged")}` : text;
  const cropCount = count(crops.length, "settings.sumCropsOne", "settings.sumCrops");

  const first = crops.length ? cropFigures(economics, crops[0]) : undefined;
  const shownDefaults: Fact[] = [
    ...crops.flatMap((c) => {
      const figures = cropFigures(economics, c);
      return [figures.price, figures.yield, figures.costs];
    }),
    ...economics.support.map((s) => s.amount),
  ];

  return (
    <>
      <div className="mt-2 border-t border-line">
        <Section
          id="prices"
          title={t("settings.prices")}
          unit="€/t"
          summary={withChanged(cropCount, pricesChanged)}
          open={open.prices}
          onToggle={() => toggle("prices")}
        >
          <FactLine fact={first?.price} />
          <ul className="border-t border-line bg-surface" data-testid="price-list">
            {crops.map((crop) => (
              <CropFigureRow
                key={crop}
                crop={crop}
                figure={figure("price", crop)}
                limits={MONEY_LIMITS.price}
                label={t("settings.priceOf", { crop: t(`crop.${crop}`) })}
                testId="price-row"
                onCommit={(v) => commit(`p.${crop}`, v)}
              />
            ))}
          </ul>
        </Section>

        <Section
          id="costs"
          title={t("settings.costs")}
          unit="€/ha"
          summary={withChanged(cropCount, costsChanged)}
          open={open.costs}
          onToggle={() => toggle("costs")}
        >
          <p className="px-4 pt-2 text-body" data-testid="costs-means">
            <span className="font-bold">{t("money.costs")}:</span> {t("money.costsMeans")}
          </p>
          <FactLine fact={first?.costs} />
          <ul className="border-t border-line bg-surface" data-testid="cost-list">
            {crops.map((crop) => (
              <CropFigureRow
                key={crop}
                crop={crop}
                figure={figure("costs", crop)}
                limits={MONEY_LIMITS.costs}
                label={t("settings.costOf", { crop: t(`crop.${crop}`) })}
                testId="cost-row"
                onCommit={(v) => commit(`c.${crop}`, v)}
              />
            ))}
          </ul>
        </Section>

        <Section
          id="support"
          title={t("settings.secSupport")}
          unit="€/ha"
          summary={withChanged(count(supportOn, "settings.sumOnOne", "settings.sumOn"), supportChanged)}
          open={open.support}
          onToggle={() => toggle("support")}
        >
          <FactLine fact={economics.support[0]?.amount} />
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
        </Section>

        <Section
          id="own"
          title={t("settings.secOwn")}
          unit="€/ha"
          summary={extras.length ? count(extras.length, "settings.sumAddedOne", "settings.sumAdded") : t("settings.sumNone")}
          open={open.own}
          onToggle={() => toggle("own")}
        >
          <Extras crops={crops} extras={extras} onChange={setExtra} onAdd={(extra) => setState({ extras: [...extras, extra] })} />
        </Section>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3 items-stretch">
        <Button
          look="secondary"
          disabled={!resolved.edited && !extras.length}
          onClick={() => setState({ money: {}, extras: [] })}
        >
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

/** The payments the farmer added, each like a known one but always on, and the way to add another. */
function Extras({
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
function AddForm({ crops: offered, onAdd, onCancel }: { crops: CropId[]; onAdd: (extra: ExtraSupport) => void; onCancel: () => void }) {
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

/**
 * Prices, costs and support: the farmer's own figures behind the income, in fold-out sections.
 * Every change applies at once.
 */
export default function Settings() {
  const t = useT();
  const [state] = useAppState();
  const location = useLocation();
  // Read once: every change to the figures replaces the link, and that drops the router state.
  const [from] = useState(() => (location.state as SettingsFrom | null)?.from);

  // Back to where the farmer came from, carrying the figures just changed (browser back would
  // return to the old link without them). With no record of that, the obvious screen.
  // A drawn field inside the basin uses the demo's regional prices; outside it there are none to edit.
  const fallback = state.fieldId === DEMO_FIELD_ID || state.outline ? "/options" : "/";
  const nothing = (
    <p className="px-4 py-4 text-big" data-testid="settings-nothing">
      {t("settings.nothing")}
    </p>
  );

  let body: ReactNode;
  if (state.fieldId === DEMO_FIELD_ID || state.outline) body = <BundleGate outside={nothing}>{(b) => <Body bundle={b} />}</BundleGate>;
  else
    body = (
      <p className="px-4 py-4 text-big" data-testid="settings-no-field">
        {t("settings.noField")}
      </p>
    );

  return (
    <div className="flex flex-col flex-1 pb-6 phone-land:w-full phone-land:max-w-[44rem] phone-land:mx-auto">
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
      <section data-testid="voice-privacy">
        <SectionTitle>{t("voice.privacy.title")}</SectionTitle>
        <p className="px-4 text-small text-ink-soft">{t("voice.privacy.phone")}</p>
        <p className="px-4 pt-1 text-small text-ink-soft">{t("voice.privacy.app")}</p>
      </section>
    </div>
  );
}
