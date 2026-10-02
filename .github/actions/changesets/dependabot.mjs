import { existsSync, readdirSync, readFileSync } from "node:fs";

import { BASE_REF, MAX_TITLE_LENGTH, runtimeCatalogChanges } from "./lib.mjs";

const {
  CHANGESET_BOT_TOKEN,
  GITHUB_GRAPHQL_URL = "https://api.github.com/graphql",
  GITHUB_REPOSITORY,
  HEAD_REF,
  HEAD_SHA,
  PR_NUMBER,
} = process.env;

if (!PR_NUMBER) {
  throw new Error("PR_NUMBER is required");
}

const COMMIT_HEADLINE = `chore(changeset): add release notes for #${PR_NUMBER} [dependabot skip]`;
const MUTATION = `mutation ($input: CreateCommitOnBranchInput!) {
  createCommitOnBranch(input: $input) { commit { oid } }
}`;
const prefix = `dependabot-${PR_NUMBER}-`;

/**
 * @param {import("./lib.mjs").Bump} bump
 * @returns {string}
 */
function describe({ name, from, to }) {
  return `\`${name}\` from ${from ?? "none"} to ${to ?? "none"}`;
}

/**
 * @param {string} app
 * @param {import("./lib.mjs").Bump[]} bumps
 * @returns {string}
 */
function render(app, bumps) {
  const single = `Bump ${describe(bumps[0])}`;
  const listed = `Bump ${bumps.map((bump) => `\`${bump.name}\``).join(", ")}`;
  let title = `Bump ${bumps.length} runtime dependencies`;
  if (bumps.length === 1 && single.length <= MAX_TITLE_LENGTH) {
    title = single;
  } else if (listed.length <= MAX_TITLE_LENGTH) {
    title = listed;
  }
  const body =
    title === single
      ? ""
      : `\n\n${bumps.map((bump) => `- ${describe(bump)}`).join("\n")}`;
  return `---\n"${app}": patch\n---\n\n${title}${body}\n`;
}

const desired = new Map(
  [...(await runtimeCatalogChanges(BASE_REF))].map(([app, bumps]) => [
    `.changeset/${prefix}${app}.md`,
    render(app, bumps),
  ]),
);
const additions = [...desired]
  .filter(
    ([file, contents]) =>
      !existsSync(file) || readFileSync(file, "utf8") !== contents,
  )
  .map(([file, contents]) => ({
    path: file,
    contents: Buffer.from(contents).toString("base64"),
  }));
const deletions = readdirSync(".changeset")
  .filter((file) => file.startsWith(prefix))
  .map((file) => `.changeset/${file}`)
  .filter((file) => !desired.has(file))
  .map((file) => ({ path: file }));

if (additions.length === 0 && deletions.length === 0) {
  console.log("Changesets already match the runtime dependency bumps.");
} else if (!CHANGESET_BOT_TOKEN) {
  console.log(
    "::notice::CHANGESET_BOT_TOKEN is not set, so no changeset was committed. Add it by hand: pnpm changeset --patch <app> -m 'Bump …'.",
  );
} else {
  if (!GITHUB_REPOSITORY || !HEAD_REF || !HEAD_SHA) {
    throw new Error("GITHUB_REPOSITORY, HEAD_REF and HEAD_SHA are required");
  }
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${CHANGESET_BOT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: MUTATION,
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: GITHUB_REPOSITORY,
            branchName: HEAD_REF,
          },
          expectedHeadOid: HEAD_SHA,
          message: { headline: COMMIT_HEADLINE },
          fileChanges: { additions, deletions },
        },
      },
    }),
  });
  const result = await response.json();
  if (!response.ok || result.errors) {
    throw new Error(
      `createCommitOnBranch failed: ${JSON.stringify(result.errors ?? result)}`,
    );
  }
  console.log(
    `Committed ${result.data.createCommitOnBranch.commit.oid} to ${HEAD_REF}.`,
  );
}
