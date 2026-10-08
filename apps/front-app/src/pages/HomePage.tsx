import { StackCheck } from "#/components/health/StackCheck";
import { CopyPromptButton } from "#/components/onboarding/CopyPromptButton";
import { Badge } from "#/components/ui/Badge";

export function HomePage() {
  return (
    <div className="flex flex-col items-center gap-8 text-center sm:gap-10">
      <div className="flex flex-col items-center">
        <Badge>getting started</Badge>
        <h1 className="mt-6 text-heading text-balance">
          You can just deploy things.
        </h1>
        <p className="mt-4 max-w-xl text-base/snug text-balance text-muted-foreground sm:text-lg/snug">
          Start with an idea, a sketch, or a full architecture brief. Paste the
          prompt and your plan into your agent, and let the magic happen.
        </p>
      </div>
      <CopyPromptButton />
      <StackCheck />
    </div>
  );
}
