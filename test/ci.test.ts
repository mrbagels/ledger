import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import { defaultConfig } from "../src/config.js";
import { runCiChecks } from "../src/ci.js";
import { parseMarkdownWithFrontmatter } from "../src/frontmatter.js";
import type { LedgerWorkspace, ParsedLedgerDocument } from "../src/types.js";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("runCiChecks", () => {
  it("passes when validation, docs, coverage, and docs impact pass", async () => {
    const result = await runCiChecks(await workspace(), [document({ title: "Valid" })]);

    expect(result.ok).toBe(true);
    expect(result.checks.map((check) => [check.name, check.ok])).toEqual([
      ["validate", true],
      ["docs", true],
      ["coverage", true],
      ["docs-impact", true],
    ]);
  });

  it("fails when validation fails", async () => {
    const result = await runCiChecks(await workspace(), [document({ title: "" })]);

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.name === "validate")?.ok).toBe(false);
  });

  it("uses the requested Git range for coverage and docs impact", async () => {
    const testWorkspace = await workspace();
    await git("config", "user.email", "ledger@example.com");
    await git("config", "user.name", "Ledger Test");
    await git("commit", "--allow-empty", "-m", "base");
    const base = await gitOutput("rev-parse", "HEAD");
    await mkdir(path.join(testWorkspace.projectRoot, "src"), { recursive: true });
    await writeFile(path.join(testWorkspace.projectRoot, "src", "range.ts"), "export {};\n");
    await git("add", ".");
    await git("commit", "-m", "head");
    const head = await gitOutput("rev-parse", "HEAD");

    const result = await runCiChecks(testWorkspace, [document({ title: "Valid" })], {
      base,
      head,
    });

    expect(result.coverage.changedFiles).toEqual(["src/range.ts"]);
    expect(result.coverage.missingFiles).toEqual(["src/range.ts"]);
    expect(result.docsImpact.missingDocsImpact).toEqual(["src/range.ts"]);
  });
});

async function workspace(): Promise<LedgerWorkspace> {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "ledger-ci-test-"));
  await git("init");
  return {
    projectRoot: tempDir,
    ledgerRoot: path.join(tempDir, ".ledger"),
    configPath: path.join(tempDir, ".ledger", "config.yaml"),
    config: {
      ...defaultConfig,
      docs: { ...defaultConfig.docs, root: "ledger-ci-test-docs-not-present" },
    },
  };
}

async function git(...args: readonly string[]): Promise<void> {
  if (!tempDir) throw new Error("missing tempDir");
  await new Promise<void>((resolve, reject) => {
    execFile("git", [...args], { cwd: tempDir }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function gitOutput(...args: readonly string[]): Promise<string> {
  if (!tempDir) throw new Error("missing tempDir");
  return await new Promise<string>((resolve, reject) => {
    execFile("git", [...args], { cwd: tempDir }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });
}

function document(options: { readonly title: string }): ParsedLedgerDocument {
  const titleLine = options.title ? `title: "${options.title}"` : "title: null";
  const raw = `---
id: "0001"
kind: "change"
${titleLine}
date: "2026-06-29"
updated: "2026-06-29"
status: "landed"
areas: ["cli"]
files:
  - "src/cli.ts"
symbols: []
commits: []
---

# 0001: ${options.title}

## Summary

Summary.

## Why

Why.

## Changed Files

### src/cli.ts

- What changed: Test.
- On conflict: Keep behavior.

## Behavior And UX Impact

Impact.

## Invariants

- Keep this true.

## Verification

- npm test
`;
  const parsed = parseMarkdownWithFrontmatter(raw);
  return {
    absolutePath: "/tmp/ledger/.ledger/entries/0001.md",
    relativePath: ".ledger/entries/0001.md",
    raw,
    frontmatterRaw: parsed.frontmatterRaw,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    sections: parsed.sections,
    kind: "change",
  };
}
