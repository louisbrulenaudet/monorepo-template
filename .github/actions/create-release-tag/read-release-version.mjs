import { readFileSync } from "node:fs";

/**
 * @param {string} path
 * @returns {unknown}
 */
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * @param {string} path
 * @returns {string}
 */
function readVersion(path) {
  const manifest = readJson(path);
  if (
    manifest !== null &&
    typeof manifest === "object" &&
    "version" in manifest &&
    typeof manifest.version === "string"
  ) {
    return manifest.version;
  }
  throw new Error(`Missing string version in ${path}`);
}

function main() {
  const workerVersion = readVersion("apps/worker-api/package.json");
  const frontVersion = readVersion("apps/front-app/package.json");

  if (workerVersion !== frontVersion) {
    console.error(
      `App versions drifted: worker-api ${workerVersion} != front-app ${frontVersion}. ` +
        "Re-align them in one commit before releasing.",
    );
    process.exit(1);
  }

  process.stdout.write(workerVersion);
}

main();
