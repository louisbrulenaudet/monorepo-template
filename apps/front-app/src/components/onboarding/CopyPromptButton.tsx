import { ClaudeIcon } from "#/components/icons/ClaudeIcon";
import { CodexIcon } from "#/components/icons/CodexIcon";
import { OpenCodeIcon } from "#/components/icons/OpenCodeIcon";
import { PiIcon } from "#/components/icons/PiIcon";
import { AGENT_SETUP_PROMPT } from "#/components/onboarding/agent-setup-prompt";
import { Button } from "#/components/ui/Button";
import {
  type CopyStatus,
  useCopyToClipboard,
} from "#/hooks/use-copy-to-clipboard";
import { cx } from "#/utils/cx";

const LABELS: Record<CopyStatus, string> = {
  idle: "Copy prompt",
  copied: "Copied!",
  failed: "Copy failed",
};

const ICON_MOTION =
  "size-5 transition-transform duration-150 group-hover:duration-250";

export function CopyPromptButton() {
  const { status, copy } = useCopyToClipboard();

  return (
    <>
      <Button className="group" onClick={() => void copy(AGENT_SETUP_PROMPT)}>
        <span
          className="relative flex h-5 w-23.5 shrink-0 items-center justify-start"
          aria-hidden="true"
        >
          <ClaudeIcon
            className={cx(
              ICON_MOTION,
              "-rotate-6 motion-safe:group-hover:-translate-x-1 motion-safe:group-hover:-rotate-12",
            )}
          />
          <CodexIcon
            className={cx(
              ICON_MOTION,
              "ml-1 motion-safe:group-hover:-translate-px motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-6",
            )}
          />
          <PiIcon
            className={cx(
              ICON_MOTION,
              "ml-1 motion-safe:group-hover:translate-x-px motion-safe:group-hover:translate-y-0.5 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6",
            )}
          />
          <OpenCodeIcon
            className={cx(
              ICON_MOTION,
              "ml-0.5 rotate-6 motion-safe:group-hover:translate-x-1 motion-safe:group-hover:rotate-12",
            )}
          />
        </span>
        <span
          className="reserve-label justify-items-center"
          data-label={LABELS.idle}
        >
          <span>{LABELS[status]}</span>
        </span>
      </Button>
      <span role="status" className="sr-only">
        {status === "idle" ? null : LABELS[status]}
      </span>
    </>
  );
}
