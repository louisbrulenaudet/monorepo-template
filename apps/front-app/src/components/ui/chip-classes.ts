import { cx } from "#/utils/cx";

type ChipTone = "muted" | "success" | "danger";

const BASE =
  "rounded-xs border border-dashed px-1.5 py-0.5 font-mono text-micro/none";

const TONES: Record<ChipTone, string> = {
  muted: "border-border text-muted-foreground",
  success: "border-success/40 text-success",
  danger: "border-danger/40 text-danger",
};

export function chipClasses({
  tone = "muted",
}: { tone?: ChipTone } = {}): string {
  return cx(BASE, TONES[tone]);
}
