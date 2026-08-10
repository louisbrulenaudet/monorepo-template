/**
 * Read-only Stage 1 inventory for worker-api and front-app production envs.
 * Does not upload, deploy, promote, or mutate traffic.
 *
 * Usage: node scripts/cd/inventory.mjs
 */
import { fail, run, DEPLOYABLES, ROOT } from "./lib.mjs";

console.log("== Stage 1 CD inventory (read-only) ==");
console.log(`Repo: ${ROOT}`);
console.log(
  `Expect actual Worker names: ${Object.values(DEPLOYABLES)
    .map((d) => d.actualWorkerName)
    .join(", ")}`,
);
console.log();

for (const [packageName] of Object.entries(DEPLOYABLES)) {
  console.log(`--- ${packageName} (--env production) ---`);
  try {
    const deployments = run(
      "pnpm",
      [
        "--filter",
        packageName,
        "exec",
        "wrangler",
        "deployments",
        "list",
        "--env",
        "production",
        "--json",
      ],
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    console.log(deployments.trim() || "(empty deployments list)");
  } catch {
    fail(
      `deployments list failed for ${packageName}. If never published, bootstrap with: pnpm --filter=${packageName} run deploy (not versions upload).`,
    );
  }

  try {
    const versions = run(
      "pnpm",
      [
        "--filter",
        packageName,
        "exec",
        "wrangler",
        "versions",
        "list",
        "--env",
        "production",
        "--json",
      ],
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    console.log(versions.trim() || "(empty versions list)");
  } catch {
    fail(`versions list failed for ${packageName}.`);
  }
  console.log();
}

console.log(
  "Inventory commands finished. Confirm preview/Access posture in the Cloudflare dashboard before promoting.",
);
