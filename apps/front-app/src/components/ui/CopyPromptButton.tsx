import { useEffect, useRef, useState } from "react";
import { ClaudeIcon } from "#/components/icons/ClaudeIcon";
import { CursorIcon } from "#/components/icons/CursorIcon";
import { OpenAiIcon } from "#/components/icons/OpenAiIcon";
import { ZedIcon } from "#/components/icons/ZedIcon";
import { AGENT_SETUP_PROMPT } from "#/config/agent-setup-prompt";
import { copyText } from "#/utils/copy-text";

export type CopyPromptButtonProps = {
  prompt?: string;
  label?: string;
  copiedLabel?: string;
};

const COPIED_RESET_MS = 2_000;

export function CopyPromptButton({
  prompt = AGENT_SETUP_PROMPT,
  label = "Copy Prompt",
  copiedLabel = "Copied!",
}: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  const handleClick = async () => {
    const succeeded = await copyText(prompt);
    if (!succeeded) {
      return;
    }

    setCopied(true);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_RESET_MS);
  };

  return (
    <button
      id="copy-prompt-btn"
      type="button"
      onClick={() => void handleClick()}
      className="group inline-flex cursor-pointer items-center gap-2.5 squircle-button border border-gray-950 bg-gray-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
    >
      <span
        className="relative flex h-5 w-23.5 shrink-0 items-center justify-start text-white"
        aria-hidden="true"
      >
        <ClaudeIcon className="size-5 -rotate-6 transition-transform duration-300 ease-out group-hover:-translate-x-1 group-hover:-rotate-12" />
        <OpenAiIcon className="ml-1 size-5 transition-transform duration-300 ease-out group-hover:-translate-px group-hover:scale-110 group-hover:rotate-6" />
        <CursorIcon className="ml-1 size-5 transition-transform duration-300 ease-out group-hover:translate-x-px group-hover:translate-y-0.5 group-hover:scale-110 group-hover:-rotate-6" />
        <ZedIcon className="ml-0.5 size-5 rotate-6 transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:rotate-12" />
      </span>
      <span className="copy-prompt-label" aria-live="polite">
        {copied ? copiedLabel : label}
      </span>
    </button>
  );
}
