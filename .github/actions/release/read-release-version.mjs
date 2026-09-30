import { readApps } from "../lib/apps.mjs";

const apps = readApps();
const versions = new Set(apps.map((app) => app.version));

if (versions.size !== 1) {
  console.error(
    `App versions drifted: ${apps.map((app) => `${app.name} ${app.version}`).join(", ")}. ` +
      "Re-align them in one commit before releasing.",
  );
  process.exit(1);
}

process.stdout.write(apps[0].version);
