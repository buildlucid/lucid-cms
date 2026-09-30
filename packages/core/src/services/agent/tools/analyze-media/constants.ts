import type { AgentLucidToolName } from "../../../../types/response.js";

/** Kept apart from the tool so URL checks can name it without an import cycle. */
export const analyzeMediaToolName =
	"media_analyze" satisfies AgentLucidToolName;
