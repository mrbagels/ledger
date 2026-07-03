import { buildStaticReaderModel, type LedgerSearchDocument } from "./render.js";
import type { LedgerWorkspace, ParsedLedgerDocument } from "./types.js";

export interface LedgerSearchOptions {
  readonly limit?: number;
}

export interface LedgerSearchResult {
  readonly id: string;
  readonly title: string;
  readonly path: string;
  readonly kind: string;
  readonly status: string;
  readonly score: number;
  readonly matchedFields: readonly string[];
  readonly document: LedgerSearchDocument;
}

const searchWeights = {
  id: 16,
  title: 14,
  path: 10,
  symbols: 9,
  files: 8,
  docs: 6,
  metadata: 5,
  context: 4,
  summary: 3,
  terms: 1,
} as const satisfies Record<keyof LedgerSearchDocument["fields"] | "terms", number>;

type SearchField = keyof typeof searchWeights;

export function searchLedgerDocuments(
  workspace: LedgerWorkspace,
  documents: readonly ParsedLedgerDocument[],
  query: string,
  options: LedgerSearchOptions = {},
): readonly LedgerSearchResult[] {
  const model = buildStaticReaderModel(workspace, documents);
  return searchLedgerIndex(model.searchIndex, query, options);
}

export function searchLedgerIndex(
  index: readonly LedgerSearchDocument[],
  query: string,
  options: LedgerSearchOptions = {},
): readonly LedgerSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  const limit = options.limit ?? 10;
  return index
    .map((document) => scoreSearchDocument(document, normalizedQuery))
    .filter((result): result is LedgerSearchResult => result.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.id.localeCompare(right.id) ||
        left.path.localeCompare(right.path),
    )
    .slice(0, limit);
}

export function scoreSearchDocument(
  document: LedgerSearchDocument,
  query: string,
): LedgerSearchResult {
  const normalizedQuery = normalizeSearchText(query);
  const matchedFields: SearchField[] = [];
  let score = 0;
  for (const field of Object.keys(searchWeights) as SearchField[]) {
    const value = field === "terms" ? document.terms : document.fields[field];
    const fieldScore = fuzzyScore(normalizedQuery, normalizeSearchText(value));
    if (fieldScore <= 0) continue;
    matchedFields.push(field);
    score += fieldScore * searchWeights[field];
  }

  return {
    id: document.id,
    title: document.title,
    path: document.path,
    kind: document.kind,
    status: document.status,
    score: Math.round(score * 100) / 100,
    matchedFields,
    document,
  };
}

export function fuzzyScore(query: string, text: string): number {
  if (!query || !text) return 0;
  if (text === query) return 20;
  if (text.includes(query)) return 10 + query.length / Math.max(text.length, 1);

  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const tokenScore = tokens
      .map((token) => fuzzyScore(token, text))
      .filter((score) => score > 0)
      .reduce((sum, candidate) => sum + candidate, 0);
    if (tokenScore > 0) return tokenScore / tokens.length;
  }

  let queryIndex = 0;
  let gaps = 0;
  for (let textIndex = 0; textIndex < text.length && queryIndex < query.length; textIndex += 1) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex += 1;
    } else if (queryIndex > 0) {
      gaps += 1;
    }
  }
  if (queryIndex !== query.length) return 0;
  return Math.max(1, query.length - gaps * 0.1);
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().trim();
}
