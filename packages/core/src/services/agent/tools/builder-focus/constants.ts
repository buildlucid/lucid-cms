import type { AgentLucidToolName } from "../../../../types/response.js";

/** Avoids import cycles when instructions reference the tool name. */
export const builderFocusToolName =
	"lucid_builder_focus" satisfies AgentLucidToolName;
