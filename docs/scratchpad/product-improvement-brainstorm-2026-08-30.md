# Ledger Product Improvement Brainstorm

Date: 2026-08-30  
Status: Exploration for review, not an implementation commitment

## Scope And Current Foundation

This brainstorm is grounded in the current Ledger repository, its product and
architecture documentation, the 117-record dogfood catalog, the CLI and MCP
surfaces, the generated internal and public readers, and the existing tests.

Ledger already has a substantial foundation: Markdown records, validation,
Git-aware drafting, coverage and docs-impact checks, query and explain commands,
conflict guidance, releases, integrity hashes, token-bounded packets, a static
reader, weighted search, graph data, public export, local serving, machine
envelopes, transaction recovery, and eight read-oriented MCP tools. Those are
not repeated below as new ideas.

Several items below began as concrete gaps found during the scan. They are
included because correcting them materially improves the product experience,
but listing any item still does not authorize implementation.

## Minor Features & Improvements

### 1. Retrieval Contract Parity And Grouped-Path Correctness

**Summary:** Make `explain`, `packet`, `conflict`, CLI, library, and MCP retrieval
use one relationship-aware matching and result contract.

**How it works:** Centralize exact, suffix, prefix, and glob matching. Traverse
related decisions and backlog records, resolve supersession, and return anchors,
conflict guidance, invariants, verification, and relevant docs consistently.
Large-diff records containing patterns such as `src/features/**` remain
discoverable from every file-oriented command.

**User experience:** A user gets the same essential context regardless of which
entry point they choose, and records drafted from large changes no longer
disappear from packets or conflict guidance.

**Why it improves the product:** The current surfaces disagree. `explain`
understands coverage patterns, while conflict and packet matching can miss the
grouped paths Ledger itself generates. Human explain output is also narrower
than the workflow promised in the product brief.

**Complexity:** Medium  
**Impact:** High

**Dependencies or future opportunities unlocked:** A shared retrieval result
model. Unlocks a unified review packet, editor hovers, graph traversal, and more
predictable agent context.

### 2. First-Class Backlog, Decision, And Promotion Lifecycle

**Summary:** Add `ledger backlog new`, `ledger decision new`, and
`ledger promote B001` rather than requiring manual template and frontmatter
editing.

**How it works:** Allocate configured IDs, render the existing templates, and
create records through the transaction layer. Promotion creates a linked change
entry, carries acceptance checks into the draft, and can update the backlog
state in one optimistic transaction.

**User experience:** Users capture intent and durable decisions as quickly as
changes today, without copying templates, choosing IDs, or manually preserving
relationships.

**Why it improves the product:** Backlog and decision records are core to the
product model, but their authoring lifecycle is missing from the CLI. Promotion
is explicitly documented as manual future work.

**Complexity:** Medium  
**Impact:** High

**Dependencies or future opportunities unlocked:** Existing templates, command
result models, and transactions. Unlocks lifecycle analytics, editor commands,
safe MCP authoring, and stronger release traceability.

### 3. Lifecycle-Aware Ready-To-Land Validation

**Summary:** Distinguish structurally valid drafts from records that are ready to
land, ship, or release.

**How it works:** Add a `ledger ready` workflow or status-aware validation mode.
Drafts may contain placeholders, while landed or released records reject TODO
text, template prose, empty conflict guidance, non-actionable verification,
unreviewed docs-impact reasons, and invalid status transitions.

**User experience:** Authors receive direct actions such as “replace the
generated invariant” before merge instead of discovering later that a formally
valid receipt contains little useful memory.

**Why it improves the product:** Current validation is strong structurally but
can accept generated placeholder text and arbitrary status values. Ledger's
long-term value depends on record quality, not only schema conformance.

**Complexity:** Medium  
**Impact:** High

**Dependencies or future opportunities unlocked:** Validation profiles and a
record-kind lifecycle policy. Unlocks reliable promotion, release gates, PR
checks, and automated quality scoring without requiring a hosted service.

### 4. PR-Aware Git Change Ranges

**Summary:** Let drafting, coverage, docs impact, CI, and MCP inspect the actual
pull-request range rather than only staged files or a dirty worktree.

**How it works:** Add explicit base, head, and merge-base options with safe
GitHub and GitLab environment detection. Preserve rename source and destination
paths, identify how the range was selected, and fail visibly when Git inspection
cannot determine the changed set.

**User experience:** `ledger ci --base origin/master` works locally, while
hosted CI selects the PR range automatically and reports exactly what it checked.

**Why it improves the product:** A clean CI checkout currently has no working
tree changes, so coverage and docs-impact checks can pass without evaluating the
PR diff. Git command failures can also look like an empty change set.

**Complexity:** Medium  
**Impact:** High

**Dependencies or future opportunities unlocked:** CI checkout depth and small
provider adapters. Unlocks accurate annotations, current-change coverage,
automated PR drafting, and change-set context.

### 5. Actionable Reader Source And Share Controls

**Summary:** Turn record context into actions rather than static strings.

**How it works:** Make the source record, files, docs, symbols, and relationship
IDs navigable. Add Copy source path, Copy deep link, Copy packet command, and
Copy agent context actions. Package internal source records into a safe reader
sidecar so source links work both from `file://` and `ledger serve`.

**User experience:** From any record, a maintainer can open its Markdown, jump to
a related record, or copy the exact handoff command in one click.

**Why it improves the product:** `sourceHref` already exists in the model, but
the reader only prints the path. The documented Markdown-source workflow is
therefore not actionable, and the current local server cannot serve a traversal
link outside the render root.

**Complexity:** Small  
**Impact:** High

**Dependencies or future opportunities unlocked:** A confined source-export
artifact and relationship URLs. Unlocks Git-host links, editor deep links, and
shareable review artifacts.

### 6. Live Preview Feedback Loop

**Summary:** Make `ledger serve --watch` visibly live.

**How it works:** Use a tiny server-sent event or reload endpoint to notify the
reader when a rebuild starts, succeeds, or fails. Preserve URL filters, panel
state, and scroll position across refreshes, and show validation errors in a
non-destructive status strip.

**User experience:** Authors edit a record and immediately see the reader update
without manually refreshing or checking terminal logs.

**Why it improves the product:** Watch mode currently rebuilds successfully but
does not notify the open browser, leaving its primary preview loop stale.

**Complexity:** Small  
**Impact:** High

**Dependencies or future opportunities unlocked:** Coordination between the
existing watcher and local server. Unlocks guided authoring and richer local
quality feedback.

### 7. Search Parity, Explainability, And Degraded-Mode Visibility

**Summary:** Make browser and terminal search share one ranking contract and
show users why a result matched.

**How it works:** Generate or share ranking weights from one source, tokenize
multi-word queries consistently, add exact, prefix, and phrase boosts, and
return the matched field plus a compact snippet. If the sidecar cannot load,
announce fallback search rather than silently changing behavior.

**User experience:** Search results feel predictable across CLI, palette, and
page filtering. Users can see whether an ID, title, file, symbol, invariant, or
summary produced the match.

**Why it improves the product:** Node and embedded browser scoring are separate
implementations, and direct-file fallback uses different multi-token behavior.
Silent sidecar failure makes relevance changes look arbitrary.

**Complexity:** Medium  
**Impact:** High

**Dependencies or future opportunities unlocked:** A versioned search artifact
contract and parity fixtures. Unlocks query syntax, configurable ranking,
sharded indexes, and relevance telemetry.

### 8. Typed Progressive MCP And Machine-Friendly Authoring

**Summary:** Make automation surfaces typed, bounded, and consistent without
breaking existing JSON-text clients.

**How it works:** Add MCP output schemas, `structuredContent`, read/write effect
annotations, summary/compact/full detail levels, cursors, and field selection.
Close query parity for tags, commits, PRs, relationships, and extension fields.
Return machine envelopes from authoring commands such as `new`, `feedback`,
`init`, and `adopt`.

**User experience:** Agents inspect a small typed summary first, request details
only when needed, and stop scraping human output to learn which file was
created.

**Why it improves the product:** Current MCP calls serialize the full envelope
into one text block, query capabilities differ across CLI and MCP, and several
authoring commands only print human text.

**Complexity:** Medium  
**Impact:** High

**Dependencies or future opportunities unlocked:** Stable output schemas and
compatibility tests. Unlocks rich MCP clients, non-TypeScript integrations,
safe write tools, pagination, and lower token use.

### 9. Self-Healing Maintenance And Generated-State Convergence

**Summary:** Turn diagnostics into a safe, previewable repair loop.

**How it works:** Add `ledger doctor --fix` or `ledger refresh --dry-run` for
deterministic repairs such as rebuilding stale indexes, reconciling routing
docs, regenerating readers and integrity artifacts, and cleaning recoverable
transaction state. Every repair shows the planned files and never rewrites
source records implicitly.

**User experience:** A warning such as “indexes are older than source records”
offers one clear action instead of requiring the user to know which generation
commands to chain.

**Why it improves the product:** The project has excellent diagnostics and safe
transactions, but the maintenance workflow remains command-by-command. The
first dogfood run produced a healthy render alongside a stale-index warning.

**Complexity:** Medium  
**Impact:** High

**Dependencies or future opportunities unlocked:** Existing doctor checks,
artifact writers, and transaction plans. Unlocks pre-commit automation and
one-command repository health convergence.

### 10. Task-First And Accessible Reader Polish

**Summary:** Optimize the reader for repeat work and close specific accessibility
gaps.

**How it works:** Add a compact returning-user header, semantic public year
headings and permalinks, dynamic panel labeling and expanded state, live search
status, platform-neutral shortcut copy, AA color tokens, larger touch targets,
and browser-level keyboard and screen-reader tests.

**User experience:** Returning users reach records in the first viewport, while
keyboard, touch, low-vision, and assistive-technology users receive clearer
state and navigation.

**Why it improves the product:** At 1280×800 the internal hero pushes the library
below the fold. Several important states are visual-only, some small controls
fall below common touch guidance, and muted small text is below AA contrast.

**Complexity:** Medium  
**Impact:** High

**Dependencies or future opportunities unlocked:** Browser interaction tests
and an accessibility token audit. Unlocks a credible public reader and stronger
regression protection for the embedded runtime.

## Major Features, Systems & Refactors

### 1. Unified Change-Set Context And Review Workbench

**Summary:** Create one task-oriented workflow that understands a Git diff, file
set, or topic and returns the current effective implementation contract.

**How it works:** A `ledger review` or `ledger context` command and MCP tool
combine prior records, active decisions, backlog, docs, invariants, conflict
rules, coverage, docs impact, stale signals, and suggested verification. It
deduplicates records, resolves supersession, flags contradictory guidance, and
retains provenance for every recommendation within a token budget.

**User experience:** Before editing or reviewing, a person or agent asks once and
receives what changed, what must remain true, what is missing, and how to verify
the work.

**Why it improves the product:** Ledger already has nearly every component, but
users must chain many command-oriented workflows and reconcile overlapping
outputs themselves. A task-first composition would make the product's central
promise immediately legible.

**Complexity:** Large  
**Impact:** Transformational

**Dependencies or future opportunities unlocked:** PR-aware ranges, retrieval
parity, lifecycle readiness, and progressive results. Unlocks review agents,
editor CodeLens, conflict workbenches, and automated handoffs.

### 2. PR-Native Provenance And CI Integration System

**Summary:** Ship the first-party GitHub Action and provider-neutral annotation
layer implied by the roadmap.

**How it works:** Evaluate base-to-head changes, require a current receipt rather
than any historical path mention, capture commit and PR metadata, and emit Checks
API annotations plus a compact PR summary for coverage, docs impact, readiness,
stale anchors, and verification. Keep the core provider-neutral so GitLab and
other adapters can follow.

**User experience:** A pull request explains exactly which changed paths need a
record or docs decision and links reviewers directly to relevant context.

**Why it improves the product:** The current repository CI runs Ledger on a
clean checkout, where working-tree-based change detection is effectively blind.
Historical records can also satisfy a new change's path coverage.

**Complexity:** Large  
**Impact:** Transformational

**Dependencies or future opportunities unlocked:** PR-aware ranges, readiness
validation, and a portable reporter schema. Unlocks automated release notes,
review packets, status checks, and broader provider adapters.

### 3. Evidence-Backed Verification And Freshness System

**Summary:** Evolve verification from prose commands into durable, refreshable
evidence without requiring CI logs to become the source of truth.

**How it works:** Define verification checks with command, environment, expected
outcome, scope, timestamp, result, artifact reference, and digest. A guarded
runner can execute approved checks, record evidence sidecars, detect when source
changes make evidence stale, and summarize release confidence. Sensitive output
stays excluded by default.

**User experience:** Maintainers can distinguish “someone wrote `npm test`” from
“this exact revision passed these checks on these platforms,” then rerun only
what became stale.

**Why it improves the product:** Verification is central to Ledger's value, but
today it is largely unstructured text. Integrity hashes prove record content,
not that the implementation was actually verified.

**Complexity:** Large  
**Impact:** Transformational

**Dependencies or future opportunities unlocked:** A verification schema,
trusted-command policy, evidence storage rules, and CI adapters. Unlocks release
gates, provenance attestations, flaky-check history, and risk-based review.

### 4. Entity Explorer And Temporal Relationship Graph

**Summary:** Promote files, symbols, docs, areas, releases, decisions, backlog,
invariants, and verification into navigable entities with history.

**How it works:** Build entity pages with backlinks, neighborhood graphs,
unresolved-target treatment, supersession edges, path and symbol rename lineage,
and “what depends on this?” traversal. Keep raw graph JSON as a portable
artifact while adding an accessible list-first UI.

**User experience:** A maintainer can follow a decision to affected files, see
which invariant superseded another, or trace a symbol across changes without
opening raw JSON or manually querying IDs.

**Why it improves the product:** The reader currently renders relationships as
plain strings and offers only raw `graph.json`. The graph also omits some
modeled relationships such as supersession.

**Complexity:** Large  
**Impact:** Transformational

**Dependencies or future opportunities unlocked:** Complete graph semantics and
stable entity identifiers. Unlocks impact analysis, rename-aware staleness,
review visualization, and IDE navigation.

### 5. Canonical Operation Registry And Portable Contract Kit

**Summary:** Define each Ledger operation once, then adapt it to CLI, MCP,
TypeScript, CI reporters, generated docs, and external runtimes.

**How it works:** Typed operation descriptors own input and output schemas,
effect classification, execution, summaries, help, and compatibility version.
Generate argument validation, help, completions, MCP adapters, JSON Schemas, and
conformance fixtures from the registry. Extract handlers incrementally from the
1,688-line CLI rather than performing a flag-day rewrite.

**User experience:** Commands become consistent, discoverable, and typo-resistant.
Integrators receive stable contracts instead of reverse-engineering output.

**Why it improves the product:** CLI routing, parsing, help, and most handlers
remain concentrated in one file, while MCP and the partial command-model layer
duplicate schemas and behavior. This is the main source of parity drift.

**Complexity:** Large  
**Impact:** Transformational

**Dependencies or future opportunities unlocked:** An additive API versioning
policy and migration sequence. Unlocks shell completions, first-party Actions,
SARIF, portable runtimes, generated documentation, and safer extension points.

### 6. Safe Write-Capable Agent And Editor Lifecycle

**Summary:** Let agents and editors complete Ledger authoring without losing the
current safety boundary.

**How it works:** Add preview-first MCP operations and an editor integration for
creating or amending records, promoting backlog, applying reviewed docs-impact
declarations, linking decisions, and preparing releases. Every mutation returns
a proposed diff and requires an explicit apply step or revision token backed by
the existing optimistic transaction layer.

**User experience:** An agent can retrieve context, do the work, preview the
handoff record, and apply it from one environment. Maintainers retain auditable
diffs, concurrency protection, and clear write intent.

**Why it improves the product:** Coding agents are the primary audience, but the
MCP surface is intentionally read-oriented and editor integration remains only
a roadmap prototype.

**Complexity:** Large  
**Impact:** Transformational

**Dependencies or future opportunities unlocked:** Lifecycle commands, typed
MCP effects, ready-to-land validation, and transaction revision tokens. Unlocks
VS Code and Codex workflows, guided authoring, and policy-aware automation.

### 7. Scalable Modular Reader And Public Publishing Pipeline

**Summary:** Make the static output scale well beyond the current dogfood catalog
while turning the public profile into a polished release channel.

**How it works:** Move per-record detail out of the initial HTML into lazy chunks,
shard search and graph data, support multi-page or virtualized navigation, and
compile a typed browser runtime instead of maintaining a large embedded string.
For the public profile, add semantic release sections, stable permalinks,
RSS/Atom and JSON feeds, metadata, branding, deployment recipes, and a sanitized
review manifest.

**User experience:** Internal catalogs remain fast at thousands of records, and
teams can publish a useful changelog without exposing implementation memory or
adopting a hosted service.

**Why it improves the product:** The 117-record internal render already uses
roughly 1.69 MB of a 2 MB budget, and its HTML, search, and graph artifacts are
near individual limits. The current public output is safe but intentionally
minimal.

**Complexity:** Large  
**Impact:** High

**Dependencies or future opportunities unlocked:** Versioned chunk manifests,
browser behavior tests, caching rules, and public-note schema evolution.
Unlocks 1,000 to 10,000-record catalogs, cacheable hosting, subscriptions, and
static deployment adapters.

### 8. Extensible Language, Policy, And Repository Federation Layer

**Summary:** Preserve a small core while enabling language-aware symbols,
project-specific policies, exporters, and optional multi-repository views.

**How it works:** Define confined plugin contracts for symbol extraction,
validators, index facets, packet contributors, render/export adapters, and CI
reporters. A federation manifest can aggregate signed, versioned indexes from
multiple repositories without moving Markdown source into a database.

**User experience:** Swift, Python, Rust, Go, and domain-specific projects gain
native anchors and policies, while platform teams can answer cross-repository
questions from one read-only view.

**Why it improves the product:** Parser-backed extraction currently focuses on
TypeScript, JavaScript, and Markdown, and the architecture lists custom kinds,
renderers, policies, and adapters without a safe extension contract. Large
organizations will otherwise fork the core or build incompatible wrappers.

**Complexity:** Massive  
**Impact:** Transformational

**Dependencies or future opportunities unlocked:** Canonical operation and
artifact contracts, plugin isolation, compatibility tests, and integrity
metadata. Unlocks an adapter ecosystem, monorepo ownership views, Dossier
exports, and cross-repo change memory.

## Top Highest ROI Improvements

1. **PR-aware Git ranges and current-change coverage:** fixes a major correctness
   gap in CI and unlocks trustworthy annotations.
2. **Retrieval contract parity:** repairs grouped-path misses and makes every
   agent and human context surface dependable.
3. **Lifecycle-aware readiness:** protects the quality of the memory Ledger is
   designed to preserve.
4. **Actionable source/share controls plus live preview:** removes daily reader
   friction with relatively small implementation slices.
5. **Typed progressive MCP results:** improves interoperability and token use
   without requiring a new product surface.

## Top Most Strategically Valuable Long-Term Investments

1. **Unified change-set context and review workbench** as the task-oriented
   expression of Ledger's core value.
2. **Evidence-backed verification** to turn historical claims into durable,
   freshness-aware proof.
3. **Canonical operation registry and portable contracts** to control drift and
   support every integration surface coherently.
4. **Entity explorer and temporal graph** to make relational project memory
   genuinely navigable.
5. **Safe write-capable agent and editor lifecycle** to complete the agent-first
   loop.

## Quick Wins With Noticeable Impact And Low Implementation Effort

- Reuse the existing coverage-pattern matcher in conflict and packet retrieval.
- Wire tag filtering into MCP query and reject invalid help topics, roles, and
  extra positionals consistently.
- Render the modeled source link as a safe, working reader action.
- Add browser reload or a rebuild banner to `serve --watch`.
- Add JSON envelopes to `new` and `feedback`.
- Announce degraded fallback search rather than silently changing relevance.
- Add semantic year headings, live search status, and AA reader color tokens.
- Make Git inspection failure explicit instead of returning “zero changes.”

## Evidence Snapshot

- `src/cli.ts` is 1,688 lines; only five workflows currently have extracted
  command result modules.
- `src/renderAssets.ts` is 1,573 lines of embedded CSS and browser JavaScript;
  current tests mostly assert output strings rather than execute interactions.
- Internal render for 117 records is about 1.69 MB against a configured 2 MB
  total budget.
- `sourceHref` is computed by the reader model but never rendered as a link.
- The relationship graph does not currently include all modeled relationship
  types, including supersession.
- CLI query supports tags while MCP query does not.
- Clean-checkout repository CI runs working-tree-based change detection.
- Any one docs touch or declaration currently satisfies docs impact for every
  changed source file rather than producing per-file traceability.

