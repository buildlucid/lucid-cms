import type { AgentLucidToolName } from "../../../../types/response.js";

/** Avoids import cycles when instructions reference the tool name. */
export const builderReadToolName =
	"lucid_builder_read" satisfies AgentLucidToolName;
