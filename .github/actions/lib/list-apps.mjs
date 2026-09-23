import { readApps } from "./apps.mjs";

// name<TAB>dir<TAB>role<TAB>healthPath ("-" when null), in monorepo.deployOrder.
for (const app of readApps()) {
  process.stdout.write(
    `${app.name}\t${app.dir}\t${app.role}\t${app.healthPath ?? "-"}\n`,
  );
}
