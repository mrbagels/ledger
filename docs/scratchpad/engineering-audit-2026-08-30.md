# Ledger Engineering Audit

Date: 2026-08-30  
Status: Scan findings and verified fixes  
Decision boundary: Implemented items below are confirmed defect or reliability fixes. Remaining items are findings for review, not implementation commitments.

## Executive Summary

Ledger has a strong foundation for a version 0.3 product. The repository has a
clear product model, extensive durable documentation, a compact LLM routing
entrypoint, 117 dogfood records, typed library and CLI surfaces, an isolated
public render profile, defensive local serving, atomic file transactions, and a
broad automated test suite.

The scan found one high-risk CI correctness gap and several smaller parity and
ergonomics defects. A clean pull-request checkout could report no working-tree
changes, so Ledger coverage and docs-impact checks could pass without examining
the pull request. Git inspection errors were also converted into an empty
change set. Both are now corrected with explicit base and head ranges, full Git
history in CI, merge-base diffing, and typed operational errors.

Other implemented fixes align grouped-path retrieval, MCP tag filtering, reader
source access and lifecycle safety, CLI input validation, dependency security,
and test reliability. The capped suite passes at every settled scan checkpoint,
and the production dependency audit reports zero vulnerabilities.

The most important remaining risks are not quick implementation details. They
need product approval or an explicit design pass:

1. Coverage for a new change can still be satisfied by any historical record
   that mentions the path. It does not yet prove that the current change has a
   current receipt.
2. One docs touch or one docs-impact declaration can satisfy a whole change set.
   Per-file traceability is not represented.
3. CLI, browser, library, and MCP behavior is implemented in several parallel
   registries and runtimes, which creates long-term contract drift.
4. Accurate source-sidecar accounting places the current internal render at
   2,073,552 bytes against its configured 2,000,000-byte budget. The budget now
   tells the truth, and the expected limit or artifact strategy must be reconciled.

Overall assessment: healthy and unusually well documented, with the immediate
correctness defects addressed. The next phase should strengthen provenance and
contract ownership before expanding the number of product surfaces.

## Scope And Method

### Scope inspected

- Repository guidance: `AGENTS.md`, `README.md`, package metadata, build and CI
  configuration, and `docs/llm/START_HERE.md`.
- Durable product documentation: product, architecture, implementation plan,
  roadmap, schema, API, and docs relationship guidance.
- Product surfaces: CLI, exported library, MCP server, static reader, internal
  and public render profiles, local server, Git integration, docs lifecycle,
  transactions, indexes, integrity, conflict guidance, packets, search, and CI.
- Implementation shape: all source modules, tests, workflow files, dependency
  lock state, large modules, and cross-surface command/query contracts.
- Dogfood state: 117 Ledger records, generated indexes, internal/public reader
  output, health checks, stale checks, and performance metrics.

### Method

1. Followed the repository's LLM-first documentation route before source
   inspection.
2. Mapped documented workflows to CLI, library, MCP, GitHub Actions, reader,
   and test implementations.
3. Ran build, type, test, render, doctor, stale, audit, and artifact checks at
   the narrowest useful scope, then expanded to the complete suite.
4. Reproduced concrete gaps with focused tests before accepting fixes.
5. Inspected the internal and public reader output, including source serving and
   public-profile isolation.
6. Separated confirmed defects from product proposals and architectural work
   that requires review.

### Snapshot facts

| Signal | Evidence |
| --- | --- |
| Dogfood catalog | 117 records: 92 changes, 6 backlog items, 4 decisions, and 15 releases |
| Automated suite | 36 test files passing with a four-worker cap; final count follows final convergence |
| Largest source modules | `src/cli.ts` 1,830 lines; `src/renderAssets.ts` 1,573; `src/fileTransaction.ts` 709; `src/render.ts` 822; `src/config.ts` 631 |
| Dependency security | `npm audit --omit=dev --audit-level=high`: zero vulnerabilities |
| Render scale | Internal output is 2,073,552 bytes, including 365,674 source-sidecar bytes, against a configured 2,000,000-byte total budget |
| Documentation health | Eight durable docs, an LLM manifest and start page, zero missing references in the generated docs audit |

## Confirmed Defects Fixed

### 1. Pull-Request Range Inspection And Explicit Git Failures

**Severity before fix:** High  
**Status:** Implemented and tested

**Observed failure:** `ledger ci`, `ledger coverage`, and `ledger docs impact`
inspected staged or working-tree changes. A normal clean pull-request checkout
therefore looked unchanged. The Git adapter also caught command errors and
returned an empty list, making an operational failure indistinguishable from a
valid zero-change result.

**Fix:** The Git contract now accepts paired `base` and `head` revisions, uses a
NUL-delimited rename-aware `git diff base...head`, reports a rename's source as
deleted and its destination as renamed, validates runtime and CLI revision input,
rejects incompatible staged/range modes, and raises typed operational errors.
Coverage, docs impact, CI, CLI help, architecture docs, implementation docs, and
README workflow examples share the new range. GitHub Actions checks out full
history and runs the range-aware Ledger check for pull requests.

**User impact:** CI evaluates the committed pull-request change set and fails
visibly when Git cannot be inspected. Local users can reproduce the exact range
with `ledger ci --base <revision> --head <revision>`.

**Evidence:** Focused Git, coverage, CI, CLI end-to-end, help, and workflow tests
cover range behavior, rename-safe parsing, invalid combinations, error
propagation, and GitHub workflow wiring.

**Residual design gap:** A path is still considered covered when any historical
record mentions it. Current-change provenance is listed in the high-severity
remaining findings.

### 2. Grouped-Path Retrieval Parity

**Severity before fix:** Medium  
**Status:** Implemented and tested

**Observed failure:** Large-diff drafting can group files into references such
as `src/features/**`, `prefix:src/features`, or `glob:src/**`. File explanation
understood these coverage patterns, but conflict and packet retrieval relied on
exact or suffix matching. A record created by Ledger could therefore disappear
from later file-oriented guidance.

**Fix:** Conflict target matching now reuses the canonical coverage-pattern
matcher before retaining the existing exact and suffix behavior. Packet lookup
inherits the correction through the shared conflict-target path.

**User impact:** Conflict guidance and agent packets now find records created
from grouped changes, regardless of whether the stored reference is exact,
prefix-based, or glob-based.

**Evidence:** Nine conflict tests and eight packet tests pass, including exact,
suffix, `**`, `prefix:`, and `glob:` regression cases.

### 3. MCP Tag Query Parity

**Severity before fix:** Medium  
**Status:** Implemented and tested

**Observed failure:** CLI and library queries accepted tag filters, but the MCP
query schema and execution path did not. Agents using MCP could not reproduce a
supported terminal query.

**Fix:** The MCP parsed argument type, input schema, and query dispatch now
carry `tag` through to `queryDocuments`.

**User impact:** A tag-filtered query has the same basic behavior in CLI,
library, and MCP entry points.

**Evidence:** The MCP suite passes 11 tests, including tag-filtered query input.

### 4. Actionable Reader Markdown Source

**Severity before fix:** Medium  
**Status:** Implemented and tested

**Observed failure:** The internal reader model computed `sourceHref`, but the
UI rendered the source path as static text. Linking directly to source outside
the render root would also conflict with the server's traversal protections.

**Fix:** Internal renders create deterministic Markdown sidecars under the
confined render root. The record panel exposes a real download link with an
accessible label. A hash-bearing ownership manifest identifies generated
sidecars; removal and rename pruning use the same optimistic file transaction
as writes. The transaction journal now supports nullable next hashes for atomic
deletion and crash recovery. Unrelated files are preserved, while aggregate
source bytes are reported in `totalBytes` and checked by `maxTotalBytes`. Public
renders remain isolated and contain only the public HTML, search index, and
graph artifacts.

**User impact:** Maintainers can download the exact source record from either a
served reader or static output without weakening path confinement. Public
release output does not expose internal Markdown records.

**Evidence:** Render tests verify the deterministic source URL, exact served
content, download name, ownership manifest, move/removal pruning, unrelated-file
preservation, concurrent-change guards, aggregate byte totals, and absence of
source sidecars from the public profile. Transaction tests cover committed
deletes, rollback, and interrupted-delete recovery.

**Operational follow-up:** Correct accounting reveals that the real 117-record
internal output is 2,073,552 bytes, which is 73,552 bytes above the configured
2,000,000-byte limit. This is now an accurate warning rather than hidden bytes.

### 5. CLI Input Validation

**Severity before fix:** Medium  
**Status:** Implemented and tested

**Observed failure:** Unknown help topics printed general help with a successful
exit; invalid agent roles were accepted; and several commands silently ignored
extra positional arguments.

**Fix:** Help now rejects unknown topics, agent roles are checked against the
supported set, and exact-arity commands reject missing or extra positionals.
Multi-path commands such as conflict and classification preserve their intended
behavior.

**User impact:** Typos and malformed automation fail immediately with typed,
actionable invalid-argument results instead of appearing successful.

**Evidence:** CLI help and end-to-end suites cover invalid help topics, roles,
extra arguments, and valid multi-positional commands.

### 6. Dependency Vulnerability Remediation

**Severity before fix:** High for affected transitive advisories  
**Status:** Implemented and audited

**Observed failure:** The lockfile resolved six known advisories, including four
production-path findings.

**Fix:** Safe transitive updates refreshed Hono, the Hono Node server, fast-uri,
ip-address, nanoid, and PostCSS without changing the public direct-dependency
contract.

**User impact:** Published and development dependency trees no longer contain
the identified advisories.

**Evidence:** Both the full audit and the production high-severity audit report
zero vulnerabilities at the scan snapshot.

### 7. Stable Test Concurrency

**Severity before fix:** Medium  
**Status:** Implemented and tested

**Observed failure:** Unbounded default Vitest parallelism produced clusters of
five-second timeouts on this repository, despite the same tests completing
quickly with bounded workers. That made the primary `npm run check` signal
machine-dependent.

**Fix:** The repository test script now runs Vitest with `--maxWorkers=4`.

**User impact:** Local and CI verification has a stable resource envelope while
remaining parallel.

**Evidence:** The capped suite passes 196 tests in 36 files in about seven
seconds on the scan environment.

## Remaining Findings

The following items are deliberately not described as completed work. Each
needs product selection, architecture review, or additional implementation.

### High Severity Or High Strategic Risk

#### A. Current-Change Coverage Provenance

**Approval/design needed:** Yes  
**Why it matters:** Range-aware Git inspection now finds the correct changed
paths, but coverage searches the whole historical catalog. A years-old record
can satisfy a new pull request that lacks a current receipt.

**Recommended direction:** Bind coverage to the entries added or changed in the
selected range, then use history only as context. Report current receipt,
historical context, and missing coverage as separate states. This is the next
correctness layer for trustworthy PR enforcement.

#### B. Per-File Docs-Impact Traceability

**Approval/design needed:** Yes  
**Why it matters:** One changed docs file, one Ledger entry with docs references,
or one reviewed docs-impact declaration can satisfy all source files in the
change set. The result records that the change considered docs, but not which
source surface maps to which docs decision.

**Recommended direction:** Add per-file or grouped-path impact decisions with
reason and evidence. Preserve a convenient project-level declaration for small
changes, but expose exactly what it covers.

#### C. Canonical Operation And Contract Registry

**Approval/design needed:** Yes  
**Why it matters:** Command names, flags, help, positional rules, machine
envelopes, MCP schemas, library operations, and documentation are maintained in
separate places. The tag and input-validation defects are examples of this
drift.

**Recommended direction:** Define each operation once with arguments, effects,
result schema, limits, aliases, and availability by surface. Generate or adapt
CLI help, validation, MCP schemas, and docs tables from that contract.

#### D. Reader Budget Reconciliation And Scaling Before Catalog Growth

**Approval/design needed:** Yes  
**Why it matters:** Accurate accounting places the current 117-record internal
output at 2,073,552 bytes, including 365,674 bytes of source sidecars, against a
2,000,000-byte budget. A single HTML page also embeds about 1,573 lines of CSS
and browser JavaScript. Continued catalog growth will pressure load time, render
budgets, reviewability, and browser test coverage.

**Recommended direction:** First decide whether the intentional internal source
export justifies a modest explicit budget increase. Then adopt lazy record
detail chunks, a versioned manifest, sharded search/graph artifacts, and a typed
browser-runtime build before continued catalog growth. Keep the single-file path
for small catalogs if it remains useful.

### Medium Severity Correctness And Integration Gaps

#### E. Relationship Graph Omits Supersession Edges

**Approval/design needed:** Small product confirmation  
**Finding:** Supersession is searchable and displayed in record details, but
`buildRelationshipGraph` emits decision, backlog, and related record edges only.
Graph consumers receive an incomplete relationship model.

**Next step:** Add a typed `supersedes` edge and golden artifact coverage, then
define how consumers should render direction and transitive supersession.

#### F. Explain And Packet Contract Breadth

**Approval/design needed:** Yes  
**Finding:** Human-facing explain output is narrower than the task workflow
described in the product documentation. Retrieval surfaces do not yet share one
relationship-aware result contract, even after path matching is corrected.

**Next step:** Define a common retrieval model for exact matches, patterns,
decisions, backlog, supersession, invariants, verification, conflict guidance,
and provenance. Adapt CLI, packet, conflict, library, and MCP to it.

#### G. Browser And Node Search Parity

**Approval/design needed:** Yes  
**Finding:** Search weights and fuzzy scoring are implemented separately in
`src/search.ts` and the embedded browser runtime. Direct-file fallback uses a
different data path and can change relevance silently if the sidecar fails.

**Next step:** Publish a versioned ranking contract or generated runtime,
exercise parity fixtures in both environments, and announce degraded fallback
mode in the reader.

#### H. Watch Mode Rebuilds Without Browser Notification

**Approval/design needed:** Yes, but implementation can be small  
**Finding:** `ledger serve --watch` rebuilds output and reports status in the
terminal, but the open reader does not receive a reload or rebuild notification.

**Next step:** Add a small same-origin event stream or polling status endpoint
that preserves filters, record selection, and scroll position on refresh.

#### I. Lifecycle Authoring And Readiness Are Incomplete

**Approval/design needed:** Yes  
**Finding:** Change and feedback authoring are first class, while backlog and
decision creation and backlog promotion still require manual template work.
Structural validation can also accept low-value placeholder prose at statuses
where a record should be ready to land or release.

**Next step:** Design `backlog new`, `decision new`, promotion, and status-aware
readiness as one lifecycle rather than unrelated commands.

### Low Severity Polish And Hygiene

#### J. Reader Accessibility And Semantic Polish

**Approval/design needed:** Yes for visible design changes  
**Finding:** The reader already has solid landmarks, labels, dialog semantics,
keyboard-focus targets, and a result status region. Remaining issues include
CSS-generated year labels rather than semantic headings, limited browser-level
interaction coverage, and no explicit degraded-search announcement. A formal
WCAG contrast and keyboard audit has not yet been recorded.

**Next step:** Add semantic year groups, automated keyboard and dialog-flow
tests, reduced-motion checks, contrast fixtures, and screen-reader status tests.

#### K. Index And Generated-Artifact Convergence

**Approval/design needed:** No for targeted tooling  
**Finding:** Doctor correctly reports stale indexes, but routine fixes still
require users to know which write commands converge each generated artifact.

**Next step:** Add a bounded `doctor --fix` or `refresh` workflow with preview,
explicit ownership, and transaction-safe writes.

## Organization And Maintainability Findings

### Large modules

| Module | Current shape | Risk | Suggested seam |
| --- | --- | --- | --- |
| `src/cli.ts` | About 1,830 lines covering parsing, validation, help, dispatch, handlers, watch mode, and output | Every new command touches a high-conflict file; rules can drift from handlers and docs | Extract an operation registry, shared argument validators, and feature-owned command handlers incrementally |
| `src/renderAssets.ts` | 1,573 lines of embedded CSS and browser JavaScript | Browser behavior is difficult to type, unit test, and split for scaling | Move to typed source modules with a deterministic bundling step and browser-level tests |
| `src/fileTransaction.ts` | 709 lines implementing optimistic writes/deletes, journaling, recovery, modes, and limits | High correctness blast radius; deletion support increases state transitions | Keep one transaction core, extract journal validation/recovery state transitions, and expand failure-injection tests |
| `src/render.ts` | 822 lines combining models, projections, graph, sidecars, ownership, budgets, and writes | Artifact policy and domain projection can evolve independently but currently collide | Separate model building, graph/search projections, source export, and artifact-budget orchestration |
| `src/config.ts` | 631 lines of defaults, parsing, migration, validation, and policy interpretation | New configuration can expand one already broad boundary | Split schema normalization from semantic policy validation only when the next config feature requires it |

These are maintainability risks, not reasons for a broad rewrite. The safest
sequence is to extract stable contracts while implementing approved features,
with parity tests before moving behavior.

### Documentation

Strengths:

- `docs/llm/START_HERE.md` and `manifest.json` provide a low-cost agent route.
- Durable product, architecture, implementation, API, schema, and roadmap docs
  are well connected.
- The docs audit reports zero missing references and no unreferenced durable
  documents.
- README command and PR-range guidance was updated with the implementation.

Gaps:

- Some future-state prose around broader explain and retrieval behavior can read
  like a current end-to-end contract.
- Stale `docs impact --from-diff` examples found during the scan were corrected
  to the implemented staged or paired base/head range modes.
- Generated docs health proves reference integrity, not semantic agreement
  between documentation and behavior.
- A contract-generated command reference would reduce manual help and docs
  synchronization work.

### Developer experience

Strengths:

- Strict TypeScript, named modules, typed errors, package smoke testing, pinned
  GitHub Actions, cross-platform Node 22/24 CI, and temp-workspace tests provide
  a good baseline.
- The four-worker cap makes the default test command dependable.

Gaps:

- Browser runtime interactions are mostly covered through generated output and
  Node-side tests, not execution in a browser.
- There is no reusable GitHub Action or Checks API reporter, so adopters must
  reproduce checkout/range details correctly.
- Write-capable automation is not yet available through a typed, policy-aware
  MCP/editor lifecycle.

## UX And Integration Findings

| Surface | What works well | Remaining opportunity |
| --- | --- | --- |
| CLI | Broad workflow, human and JSON modes, typed errors, focused help | Generate argument/help contracts; add lifecycle authoring and actionable remediation |
| Reader | Useful facets, command palette, record panel, internal/public profiles, source download | Live reload, search parity, semantic year groups, relationship navigation, scaling |
| MCP | Eight bounded read-oriented tools, machine envelopes, tag parity restored | Structured content/output schemas, pagination/detail levels, safe write operations |
| Git and CI | Working/staged modes plus explicit PR range, rename-safe parsing, cross-platform workflow | Current-change provenance, reusable action, provider annotations |
| Docs | Rich durable model and automated routing/audit | Per-file impact evidence, semantic behavior checks, command-reference generation |
| Public publishing | Isolated sanitized profile with its own artifacts | Stable permalinks, feeds, metadata, branding, and deploy recipes |

## Verification Matrix

| Area | Verification | Result at audit snapshot |
| --- | --- | --- |
| Type safety | `npm run typecheck` | Pass after reader transaction and budget work |
| Unit and integration tests | `npm test` | Pass at the settled reader checkpoint; exact final count follows final convergence |
| Build | `npm run build` | Pass after reader transaction and budget work; rerun required after final merged edits |
| Full repository gate | `npm run ci` | Final convergence step after the new Ledger receipt is added |
| Git ranges | Focused Git, coverage, CI, CLI, and workflow tests | Pass |
| Grouped paths | Conflict and packet tests | Pass: 17 focused tests |
| MCP tag parity | MCP test suite | Pass: 11 tests |
| Reader source lifecycle | Render, serve, and transaction tests | Pass for source link/content, manifest pruning, delete recovery, byte accounting, concurrency guards, unrelated-file preservation, and public isolation |
| Dependency audit | `npm audit --omit=dev --audit-level=high` | Pass: zero vulnerabilities |
| Formatting hygiene | `git diff --check` | Final convergence step |
| Product health | render, doctor, stale, metrics, integrity checks | Baseline exercised; rerun after final render/index updates |

The matrix distinguishes evidence already observed from checks that must be
rerun after all parallel changes settle. A final green `npm run ci` is the
release-quality convergence signal.

## Recommended Next Sequence

### Immediate convergence

1. Reconcile the intentional source-sidecar footprint with the internal render
   budget, either by an explicit near-term limit adjustment or by reducing the
   artifact size.
2. Add one Ledger receipt that covers the source, tests, docs, dependency, and
   workflow changes from this scan.
3. Run typecheck, the full capped test suite, build, Ledger CI, package dry run,
   production audit, diff check, internal/public renders, doctor, stale, metrics,
   and integrity verification.
4. Regenerate indexes and confirm both reader profiles remain within their
   explicit budgets and the public output contains no internal sources.

### Next approved correctness slice

1. Design current-change coverage provenance and per-file docs-impact evidence
   together, because both depend on the same selected Git range and changed
   Ledger entries.
2. Complete the supersession graph edge and retrieval result contract with
   golden tests.
3. Correct stale documentation examples and generate command reference material
   from a canonical operation definition.

### Product and platform sequence

1. Add status-aware record readiness and first-class backlog, decision, and
   promotion authoring.
2. Turn the reader watch loop into a live editing workflow and improve source,
   relationship, and copy/share actions.
3. Extract a typed browser runtime and introduce chunked artifacts before the
   catalog crosses the current single-page budget.
4. Add structured progressive MCP results, then policy-aware write operations.
5. Build provider-neutral CI annotations and package the proven Git range logic
   as a reusable integration.

## Decision Log For This Audit

- Confirmed defects and security updates were implemented because they correct
  existing documented behavior or make current checks trustworthy.
- Ambitious features and major refactors remain proposals. Listing them does
  not authorize implementation.
- Large-file counts are signals for incremental extraction, not a recommendation
  to rewrite functioning subsystems.
- The existing repository architecture, Markdown source of truth, public-profile
  isolation, and transaction model should be preserved unless an approved design
  explicitly changes them.
