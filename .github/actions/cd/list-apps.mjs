import { readApps } from "../lib/apps.mjs";

for (const app of readApps()) {
  process.stdout.write(`${app.name}\t${app.dir}\n`);
}
