import { Link } from "react-router-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useT } from "../i18n";
import { BackIcon } from "./Icons";

const base = "tc-tap inline-flex items-center justify-center gap-2 px-5 rounded-box font-bold text-body text-center";
const looks = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-surface text-ink border-2 border-line-strong",
  plain: "text-ink underline underline-offset-4",
} as const;

type Look = keyof typeof looks;

export function Button({
  look = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { look?: Look }) {
  return (
    <button
      type="button"
      className={`${base} ${looks[look]} disabled:opacity-45 disabled:cursor-not-allowed ${className}`}
      {...rest}
    />
  );
}

export function LinkButton({
  to,
  look = "primary",
  className = "",
  children,
}: {
  to: { pathname: string; search: string };
  look?: Look;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={`${base} ${looks[look]} ${className}`}>
      {children}
    </Link>
  );
}

/** The one big headline of a screen. */
export function Headline({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <h1 className="text-head">{children}</h1>
      {sub ? <div className="mt-1 text-body text-ink-soft">{sub}</div> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="px-4 pt-4 pb-2 text-small font-bold uppercase tracking-wider text-ink-soft">{children}</h2>;
}

/** Back to the previous step, keeping the state: sits in the bottom bar, left of the main button, and gives way to it. */
export function BackButton({ to }: { to: { pathname: string; search: string } }) {
  const t = useT();
  return (
    <LinkButton to={to} look="secondary" className="flex-none px-3">
      <BackIcon className="w-5 h-5 flex-none" />
      {t("common.back")}
    </LinkButton>
  );
}

/** A bottom bar for the screen's main action. */
export function BottomBar({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 mt-auto p-3 bg-paper border-t border-line flex gap-2 print:hidden">{children}</div>;
}
