// The parcel-number form on step 1: the sheet (foglio) and parcel (particella) numbers from the farm file,
// for the one commune that ships. The lookup itself is the screen's; this is the form. Written with AI assistance (Claude, Anthropic).
import { useT } from "../../i18n";
import { PARCEL_COMMUNES, PARCEL_CREDIT } from "../../data/parcels";
import { WarnIcon } from "../../components/Icons";
import { Button } from "../../components/ui";
import { PARCEL_NOTE } from "./mode";
import type { ParcelMode } from "./mode";

export function ParcelForm({
  mode,
  onChange,
  onSearch,
  onCancel,
}: {
  mode: ParcelMode;
  onChange: (mode: ParcelMode) => void;
  onSearch: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <form
      data-testid="parcel-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-big">{t("parcel.title")}</p>
          <p className="text-small font-bold text-ink-soft">{t("parcel.commune", { name: PARCEL_COMMUNES[0].name })}</p>
        </div>
        <button type="button" className="flex-none min-h-11 px-2 underline font-bold text-body" onClick={onCancel}>
          {t("find.cancel")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {(["sheet", "parcel"] as const).map((field) => (
          <label key={field} className="block text-small font-bold">
            {t(`parcel.${field}`)}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={mode[field]}
              onChange={(e) => onChange({ ...mode, [field]: e.target.value, state: "typing" })}
              className="mt-1 w-full h-12 px-3 bg-surface border-2 border-line-strong rounded-box text-big font-bold"
            />
          </label>
        ))}
      </div>
      {mode.state === "noSheet" || mode.state === "noParcel" || mode.state === "failed" ? (
        <p role="alert" className="mt-2 flex items-center gap-2 text-body font-bold" data-testid="parcel-note">
          <WarnIcon className="w-5 h-5 flex-none text-warn" />
          {t(PARCEL_NOTE[mode.state])}
        </p>
      ) : null}
      <Button type="submit" className="w-full mt-3" disabled={mode.state === "searching" || !mode.sheet.trim() || !mode.parcel.trim()}>
        {t(mode.state === "searching" ? "parcel.searching" : "parcel.find")}
      </Button>
      <p className="mt-2 text-small text-ink-soft">{t("parcel.note")}</p>
      <p className="text-small text-ink-soft">{PARCEL_CREDIT}</p>
    </form>
  );
}
