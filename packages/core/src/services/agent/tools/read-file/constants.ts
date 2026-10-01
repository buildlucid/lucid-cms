import type { AgentLucidToolName } from "../../../../types/response.js";

export const readFileToolName = "media_read_file" satisfies AgentLucidToolName;
export const MAX_FILE_BYTES = 5_000_000;
/** Most file text returned by one call, across all passages. */
export const FILE_PAGE_CHARS = 8_000;
/** Most characters in the serialised tool result, including JSON escaping. */
export const FILE_RESULT_CHARS = 10_000;
export const FILE_SEARCH_PASSAGES = 5;
export const SEARCH_CONTEXT_BEFORE = 300;
export const SEARCH_CONTEXT_AFTER = 700;
